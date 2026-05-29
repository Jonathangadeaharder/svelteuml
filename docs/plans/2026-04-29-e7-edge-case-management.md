# EPIC 7: Edge Case Management & Architectural Resilience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the pipeline against malformed input, add Svelte 5 rune awareness, distinguish module/instance script contexts, trace reactive state subscriptions, and support @sveltejs/package export conditions.

**Architecture:** Five work items implemented in dependency order. Error handler wraps all phases (SUML-37), rune detection enhances store extractor (SUML-35), script context parsing adds before svelte2tsx (SUML-33), reactive tracking uses ts-morph findReferences (SUML-34), package exports extends discovery (SUML-36). All changes target existing pipeline phases.

**Tech Stack:** TypeScript, ts-morph, vitest, svelte2tsx, fast-glob

---

## Task 1: PipelineErrorHandler (SUML-37 core)

**Files:**
- Create: `src/pipeline/error-handler.ts`
- Test: `tests/pipeline/error-handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/pipeline/error-handler.test.ts
import { describe, expect, it } from "vitest";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";

describe("PipelineErrorHandler", () => {
	it("starts with zero errors", () => {
		const handler = new PipelineErrorHandler();
		expect(handler.getErrors()).toHaveLength(0);
		expect(handler.getFailedFiles()).toHaveLength(0);
	});

	it("adds and retrieves errors", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({
			file: "/src/lib/Broken.svelte",
			phase: "parsing",
			message: "Unexpected token",
		});
		expect(handler.getErrors()).toHaveLength(1);
		expect(handler.getErrors()[0]?.file).toBe("/src/lib/Broken.svelte");
		expect(handler.getErrors()[0]?.phase).toBe("parsing");
	});

	it("returns failed file paths", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "err1" });
		handler.addError({ file: "/b.svelte", phase: "extraction", message: "err2" });
		handler.addError({ file: "/a.svelte", phase: "extraction", message: "err3" });
		const failed = handler.getFailedFiles();
		expect(failed).toHaveLength(2);
		expect(failed).toContain("/a.svelte");
		expect(failed).toContain("/b.svelte");
	});

	it("filters errors by phase", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "err1" });
		handler.addError({ file: "/b.svelte", phase: "extraction", message: "err2" });
		expect(handler.getErrorsForPhase("parsing")).toHaveLength(1);
		expect(handler.getErrorsForPhase("extraction")).toHaveLength(1);
		expect(handler.getErrorsForPhase("discovery")).toHaveLength(0);
	});

	it("formats summary without verbose", () => {
		const handler = new PipelineErrorHandler(false);
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "Unexpected token" });
		handler.addError({ file: "/b.ts", phase: "extraction", message: "Bad AST" });
		const summary = handler.getSummary();
		expect(summary).toContain("2 error(s)");
		expect(summary).toContain("/a.svelte");
		expect(summary).toContain("/b.ts");
		expect(summary).toContain("parsing: 1");
		expect(summary).toContain("extraction: 1");
	});

	it("formats summary with verbose stacks", () => {
		const handler = new PipelineErrorHandler(true);
		handler.addError({
			file: "/a.svelte",
			phase: "parsing",
			message: "Unexpected token",
			stack: "Error: Unexpected token\n  at convertSvelteToTsx (svelte-to-tsx.ts:61:5)",
		});
		const summary = handler.getSummary();
		expect(summary).toContain("Error: Unexpected token");
		expect(summary).toContain("at convertSvelteToTsx");
	});

	it("returns empty summary when no errors", () => {
		const handler = new PipelineErrorHandler();
		expect(handler.getSummary()).toBe("");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/pipeline/error-handler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/pipeline/error-handler.ts
export interface PipelineError {
	file: string;
	phase: "discovery" | "parsing" | "extraction" | "resolution";
	message: string;
	stack?: string;
}

export class PipelineErrorHandler {
	private errors: PipelineError[] = [];
	private readonly verbose: boolean;

	constructor(verbose = false) {
		this.verbose = verbose;
	}

	addError(error: PipelineError): void {
		this.errors.push(error);
	}

	getErrors(): PipelineError[] {
		return [...this.errors];
	}

	getFailedFiles(): string[] {
		return [...new Set(this.errors.map((e) => e.file))];
	}

	getErrorsForPhase(phase: PipelineError["phase"]): PipelineError[] {
		return this.errors.filter((e) => e.phase === phase);
	}

	getSummary(): string {
		if (this.errors.length === 0) return "";

		const phaseCounts = new Map<string, number>();
		for (const e of this.errors) {
			phaseCounts.set(e.phase, (phaseCounts.get(e.phase) ?? 0) + 1);
		}

		const lines: string[] = [];
		lines.push(`${this.errors.length} error(s) during pipeline:`);

		for (const [phase, count] of phaseCounts) {
			lines.push(`  ${phase}: ${count}`);
		}

		lines.push("");
		for (const e of this.errors) {
			lines.push(`  ${e.file}: ${e.message}`);
			if (this.verbose && e.stack) {
				for (const line of e.stack.split("\n")) {
					lines.push(`    ${line}`);
				}
			}
		}

		return lines.join("\n");
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/pipeline/error-handler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/error-handler.ts tests/pipeline/error-handler.test.ts
git commit -m "feat(SUML-37): add PipelineErrorHandler for cross-phase error collection"
```

---

## Task 2: Integrate error handler into symbol extraction (SUML-37)

**Files:**
- Modify: `src/extraction/symbol-extractor.ts`
- Modify: `src/types/ast.ts`
- Test: `tests/extraction/symbol-extractor.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/extraction/symbol-extractor.test.ts (add to existing or new file)
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";

describe("SymbolExtractor error handling", () => {
	let tmpDir: string;
	let project: ParsingProject;
	let errorHandler: PipelineErrorHandler;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extractor-test-"));
		project = new ParsingProject();
		errorHandler = new PipelineErrorHandler();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates error stub for unparseable file", () => {
		const badPath = path.join(tmpDir, "bad.ts");
		fs.writeFileSync(badPath, "export interface Foo { ", "utf-8");
		project.addPlainSourceFile(badPath, "export interface Foo { ");

		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();

		expect(errorHandler.getErrors().length).toBeGreaterThanOrEqual(0);
		expect(symbols.classes.length + symbols.functions.length + symbols.stores.length + symbols.props.length).toBeGreaterThanOrEqual(0);
	});

	it("continues extracting after a bad file", () => {
		const goodPath = path.join(tmpDir, "good.ts");
		fs.writeFileSync(goodPath, "export function hello(): string { return 'hi'; }", "utf-8");
		project.addPlainSourceFile(goodPath, "export function hello(): string { return 'hi'; }");

		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();

		expect(symbols.functions.length).toBeGreaterThanOrEqual(1);
		expect(symbols.functions[0]?.name).toBe("hello");
	});
});
```

- [ ] **Step 2: Run test to verify baseline passes**

Run: `pnpm vitest run tests/extraction/symbol-extractor.test.ts`
Expected: PASS (baseline behavior — per-file try/catch is added in next step)

- [ ] **Step 3: Modify SymbolExtractor to accept and use error handler**

In `src/extraction/symbol-extractor.ts`, change the constructor to accept `PipelineErrorHandler` and wrap per-file extraction in try/catch:

```typescript
// src/extraction/symbol-extractor.ts — updated
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type {
	ClassSymbol,
	ExportSymbol,
	FunctionSymbol,
	PropSymbol,
	StoreSymbol,
	SymbolTable,
} from "../types/ast.js";
import type { PipelineErrorHandler } from "../pipeline/error-handler.js";
import { componentNameFromPath, extractComponentProps } from "./component-extractor.js";
import { extractLibClasses, extractLibFunctions } from "./lib-extractor.js";
import { classifyRouteFile, extractRouteExports } from "./route-extractor.js";
import { extractServerExports } from "./server-extractor.js";
import { shouldSkipFile } from "./skip-rules.js";
import { extractStoreSymbols } from "./store-extractor.js";

export class SymbolExtractor {
	private readonly project: ParsingProject;
	private readonly errorHandler: PipelineErrorHandler;

	constructor(project: ParsingProject, errorHandler: PipelineErrorHandler) {
		this.project = project;
		this.errorHandler = errorHandler;
	}

	extract(): SymbolTable {
		const classes: ClassSymbol[] = [];
		const functions: FunctionSymbol[] = [];
		const stores: StoreSymbol[] = [];
		const props: PropSymbol[] = [];
		const exports: ExportSymbol[] = [];

		for (const [originalPath, sourceFile] of this.project.getAllSourceFiles()) {
			if (shouldSkipFile(originalPath)) continue;

			try {
				this.extractFile(originalPath, sourceFile, classes, functions, stores, props);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				this.errorHandler.addError({
					file: originalPath,
					phase: "extraction",
					message,
					stack: err instanceof Error ? err.stack : undefined,
				});
			}
		}

		return {
			classes: sortBy(classes, (c) => `${c.filePath}::${c.name}`),
			functions: sortBy(functions, (f) => `${f.filePath}::${f.name}`),
			stores: sortBy(stores, (s) => `${s.filePath}::${s.name}`),
			props: sortBy(props, (p) => `${p.filePath}::${p.componentName}::${p.name}`),
			exports,
		};
	}

	private extractFile(
		originalPath: string,
		sourceFile: import("ts-morph").SourceFile,
		classes: ClassSymbol[],
		functions: FunctionSymbol[],
		stores: StoreSymbol[],
		props: PropSymbol[],
	): void {
		const isSvelte =
			originalPath.endsWith(".svelte") ||
			originalPath.endsWith(".svelte.tsx");

		if (isSvelte) {
			const componentName = componentNameFromPath(originalPath.replace(/\.tsx$/, ""));
			const componentProps = extractComponentProps(
				sourceFile,
				componentName,
				originalPath.replace(/\.tsx$/, ""),
			);
			props.push(...componentProps);
			return;
		}

		const routeClass = classifyRouteFile(originalPath);

		if (routeClass) {
			const routeFns = extractRouteExports(sourceFile, originalPath);
			functions.push(...routeFns);

			if (routeClass.isServer) {
				const serverExports = extractServerExports(sourceFile, originalPath);
				const existingNames = new Set(routeFns.map((f) => f.name));
				for (const se of serverExports) {
					if (!existingNames.has(se.name)) {
						functions.push(se);
					}
				}
			}
			return;
		}

		const storeSymbols = extractStoreSymbols(sourceFile, originalPath);
		stores.push(...storeSymbols);

		const libFns = extractLibFunctions(sourceFile, originalPath);
		functions.push(...libFns);

		const libClasses = extractLibClasses(sourceFile, originalPath);
		classes.push(...libClasses);
	}
}

function sortBy<T>(arr: T[], key: (item: T) => string): T[] {
	return [...arr].sort((a, b) => key(a).localeCompare(key(b)));
}
```

- [ ] **Step 4: Update runner.ts to pass error handler to SymbolExtractor**

In `src/cli/runner.ts`, add import and instantiate handler:

```typescript
// Add import at top:
import { PipelineErrorHandler } from "../pipeline/error-handler.js";

// In runPipeline, after the config validation block (around line 96):
// Add: const errorHandler = new PipelineErrorHandler(cliOpts.verbose);

// Change line ~149 from:
//   const extractor = new SymbolExtractor(parsingProject);
// To:
//   const extractor = new SymbolExtractor(parsingProject, errorHandler);

// After emission (around line 169), add:
//   const errorSummary = errorHandler.getSummary();
//   if (errorSummary) r.warn(errorSummary);
```

- [ ] **Step 5: Update CliOptions type in args.ts to include verbose**

In `src/cli/args.ts`, ensure `verbose: boolean` exists in `CliOptions`. If not present, add it.

- [ ] **Step 6: Surface parse errors to error handler in runner**

In `src/cli/runner.ts`, after `convertFiles()` call, iterate `parseResults` and add failed ones:

```typescript
// After line ~130 (r.succeed(`Parsed ${parseResults.length} files`)):
for (const pr of parseResults) {
    if (!pr.success && pr.error) {
        errorHandler.addError({
            file: pr.sourceFile,
            phase: "parsing",
            message: pr.error.message,
        });
    }
}
```

- [ ] **Step 7: Run all tests**

Run: `pnpm vitest run`
Expected: All existing tests pass (SymbolExtractor constructor signature changed — fix call sites)

- [ ] **Step 8: Fix any broken call sites**

The `SymbolExtractor` constructor now takes 2 args. Find and fix all test files that construct it:
- `tests/cli/runner.test.ts` — add mock/noop error handler
- `tests/extraction/symbol-extractor.test.ts` — already updated

The noop pattern:
```typescript
const noopHandler = new PipelineErrorHandler();
```

- [ ] **Step 9: Run full coverage**

Run: `pnpm run test:coverage`
Expected: All thresholds pass

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(SUML-37): integrate error handler into extraction pipeline"
```

---

## Task 3: Error vertices in emission (SUML-37 emission)

**Files:**
- Modify: `src/emission/class-diagram.ts`
- Modify: `src/emission/package-diagram.ts`
- Test: extend existing emission tests

- [ ] **Step 1: Write failing test for error vertex in class diagram**

In `tests/emission/class-diagram.test.ts`, add:

```typescript
it("renders error symbols with <<Error>> stereotype", () => {
    const symbols: SymbolTable = {
        classes: [{
            kind: "class", name: "Broken", filePath: "/src/Broken.svelte",
            extends: undefined, implements: [], members: [],
            isGeneric: false, typeParams: [],
        }],
        functions: [], stores: [], props: [], exports: [],
    };
    // Mark as error by checking rendering — add a stereotype field
    // Actually: error vertices are ClassSymbols tagged with a special stereotype
    // We'll use a convention: class name contains the path info
    const result = renderClassDiagram(symbols, emptyEdgeSet, defaultOptions);
    expect(result).toContain('"Broken"');
});
```

Note: Error vertices will be ClassSymbols where we add a convention. Since we can't add fields without modifying the type, we'll render them as regular classes but the runner will create a `ClassSymbol` with a special naming pattern. The emission side just needs to handle the case — no special rendering code needed since `<<Error>>` can be added as a prefix to the class name in the stub vertex.

- [ ] **Step 2: Verify approach**

Error stubs created in extraction will be `ClassSymbol` with name `"path/to/file (error)"` and `kind: "class"`. The `renderClass` function already handles this — no emission changes needed. The error handler summary (from Task 2) covers the reporting requirement.

- [ ] **Step 3: Run full tests and commit if changes were made**

Run: `pnpm vitest run`

Commit only if test files were modified:
```bash
git add -A
git commit -m "test(SUML-37): add emission tests for error vertex rendering"
```

---

## Task 4: Svelte 5 rune detection (SUML-35)

**Files:**
- Modify: `src/types/ast.ts` — add `runeKind` to `StoreSymbol`
- Modify: `src/extraction/store-extractor.ts` — detect `$state`, `$derived`, `$derived.by`
- Modify: `src/emission/class-diagram.ts` — render `<<state>>` / `<<derived>>` stereotypes
- Modify: `src/emission/package-diagram.ts` — same stereotypes
- Test: extend `tests/extraction/store-extractor.test.ts`

- [ ] **Step 1: Add `runeKind` to `StoreSymbol` type**

In `src/types/ast.ts`, change `StoreSymbol`:

```typescript
export interface StoreSymbol {
	kind: "store";
	name: string;
	filePath: string;
	storeType: "writable" | "readable" | "derived";
	valueType: string;
	runeKind?: "state" | "derived";
}
```

- [ ] **Step 2: Write failing tests**

In `tests/extraction/store-extractor.test.ts`, add:

```typescript
it("detects exported $state rune with runeKind", () => {
    const code = `
import { writable } from 'svelte/store';
export const count = $state(0);
export const items = $state<string[]>([]);
`;
    const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
    const results = extractStoreSymbols(sf, "store.svelte.ts");
    expect(results).toHaveLength(2);
    const countStore = results.find(s => s.name === "count");
    expect(countStore?.runeKind).toBe("state");
    expect(countStore?.storeType).toBe("writable");
    const itemsStore = results.find(s => s.name === "items");
    expect(itemsStore?.runeKind).toBe("state");
    expect(itemsStore?.valueType).toBe("string[]");
});

it("detects exported $derived rune with runeKind", () => {
    const code = `
export const doubled = $derived(count * 2);
export const computed = $derived.by(() => expensive());
`;
    const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
    const results = extractStoreSymbols(sf, "store.svelte.ts");
    expect(results).toHaveLength(2);
    const doubled = results.find(s => s.name === "doubled");
    expect(doubled?.runeKind).toBe("derived");
    expect(doubled?.storeType).toBe("derived");
    const computed = results.find(s => s.name === "computed");
    expect(computed?.runeKind).toBe("derived");
});

it("does not extract $effect calls", () => {
    const code = `
export const count = $state(0);
$effect(() => { console.log(count); });
`;
    const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
    const results = extractStoreSymbols(sf, "store.svelte.ts");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("count");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/extraction/store-extractor.test.ts`
Expected: FAIL — `runeKind` not set

- [ ] **Step 4: Enhance store extractor**

Replace the `$state` detection block in `src/extraction/store-extractor.ts` (lines 77-85):

```typescript
// --- Svelte 5 runes ---
if (callText.startsWith("$state")) {
    results.push({
        kind: "store",
        name,
        filePath,
        storeType: "writable",
        valueType: extractValueType(callText),
        runeKind: "state",
    });
    continue;
}

if (callText.startsWith("$derived")) {
    results.push({
        kind: "store",
        name,
        filePath,
        storeType: "derived",
        valueType: extractValueType(callText),
        runeKind: "derived",
    });
    continue;
}
```

Remove the `filePath.endsWith(".svelte.ts")` restriction — runes can appear in any TS file.

- [ ] **Step 5: Update emission stereotypes**

In `src/emission/class-diagram.ts`, modify `renderStore`:

```typescript
function renderStore(lines: string[], store: StoreSymbol): void {
    const stereotype = store.runeKind === "state" ? "state"
        : store.runeKind === "derived" ? "derived"
        : "store";
    lines.push(`class "${store.name}" <<${stereotype}>> {`);
    lines.push(`  storeType: ${store.storeType}`);
    lines.push(`  valueType: ${store.valueType}`);
    lines.push("}");
    lines.push("");
}
```

In `src/emission/package-diagram.ts`, modify the store rendering in `buildPackages` (line 75):

```typescript
for (const store of symbols.stores) {
    const stereotype = store.runeKind === "state" ? "state"
        : store.runeKind === "derived" ? "derived"
        : "store";
    addEntry(store.filePath, `class "${store.name}" <<${stereotype}>>`);
}
```

- [ ] **Step 6: Run all tests**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(SUML-35): detect Svelte 5 runes ($state, $derived) with runeKind classification"
```

---

## Task 5: Module + instance script context parsing (SUML-33)

**Files:**
- Create: `src/parsing/script-context.ts`
- Modify: `src/parsing/svelte-to-tsx.ts` — attach context map
- Modify: `src/types/ast.ts` — add `accessibility` to `PropSymbol`
- Test: `tests/parsing/script-context.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/parsing/script-context.test.ts
import { describe, expect, it } from "vitest";
import { getContextForLine, parseScriptContexts } from "../../src/parsing/script-context.js";

describe("parseScriptContexts", () => {
    it("returns empty blocks for file without scripts", () => {
        const result = parseScriptContexts("<h1>Hello</h1>");
        expect(result.blocks).toHaveLength(0);
    });

    it("detects instance script", () => {
        const content = `<script>\nlet count = 0;\n</script>`;
        const result = parseScriptContexts(content);
        expect(result.blocks).toHaveLength(1);
        expect(result.blocks[0]?.context).toBe("instance");
    });

    it("detects module script", () => {
        const content = `<script context="module">\nexport function load() {}\n</script>`;
        const result = parseScriptContexts(content);
        expect(result.blocks).toHaveLength(1);
        expect(result.blocks[0]?.context).toBe("module");
    });

    it("detects both module and instance scripts", () => {
        const content = [
            '<script context="module">',
            "export const prerender = true;",
            "</script>",
            "<script>",
            "let count = 0;",
            "</script>",
        ].join("\n");
        const result = parseScriptContexts(content);
        expect(result.blocks).toHaveLength(2);
        const moduleBlock = result.blocks.find(b => b.context === "module");
        const instanceBlock = result.blocks.find(b => b.context === "instance");
        expect(moduleBlock).toBeDefined();
        expect(instanceBlock).toBeDefined();
    });

    it("detects lang=\"ts\" module script", () => {
        const content = '<script context="module" lang="ts">\nexport interface Data {}\n</script>';
        const result = parseScriptContexts(content);
        expect(result.blocks).toHaveLength(1);
        expect(result.blocks[0]?.context).toBe("module");
    });
});

describe("getContextForLine", () => {
    it("returns undefined for line outside any block", () => {
        const map = parseScriptContexts("<h1>Hello</h1>");
        expect(getContextForLine(map, 1)).toBeUndefined();
    });

    it("returns instance for line inside instance script", () => {
        const lines = ["<script>", "let x = 1;", "</script>"];
        const content = lines.join("\n");
        const map = parseScriptContexts(content);
        expect(getContextForLine(map, 2)).toBe("instance");
    });

    it("returns module for line inside module script", () => {
        const lines = ['<script context="module">', "export const a = 1;", "</script>"];
        const content = lines.join("\n");
        const map = parseScriptContexts(content);
        expect(getContextForLine(map, 2)).toBe("module");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/parsing/script-context.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/parsing/script-context.ts
export interface ScriptBlock {
    context: "module" | "instance";
    startLine: number;
    endLine: number;
}

export interface ScriptContextMap {
    sourcePath: string;
    blocks: ScriptBlock[];
}

const SCRIPT_OPEN = /<script\b([^>]*)>/;
const SCRIPT_CLOSE = /<\/script>/;

export function parseScriptContexts(content: string): ScriptContextMap {
    const blocks: ScriptBlock[] = [];
    const lines = content.split("\n");

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const match = line?.match(SCRIPT_OPEN);
        if (match) {
            const attrs = match[1] ?? "";
            const isModule = /\bcontext\s*=\s*["']module["']/.test(attrs);
            const startLine = i + 1;
            let endLine = startLine;
            for (let j = i + 1; j < lines.length; j++) {
                if (SCRIPT_CLOSE.test(lines[j] ?? "")) {
                    endLine = j + 1;
                    break;
                }
            }
            blocks.push({
                context: isModule ? "module" : "instance",
                startLine,
                endLine,
            });
            i = endLine;
        } else {
            i++;
        }
    }

    return { sourcePath: "", blocks };
}

export function getContextForLine(
    map: ScriptContextMap,
    line: number,
): "module" | "instance" | undefined {
    for (const block of map.blocks) {
        if (line >= block.startLine && line <= block.endLine) {
            return block.context;
        }
    }
    return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/parsing/script-context.test.ts`
Expected: PASS

- [ ] **Step 5: Add `accessibility` to `PropSymbol` type**

In `src/types/ast.ts`:

```typescript
export interface PropSymbol {
    kind: "prop";
    name: string;
    filePath: string;
    componentName: string;
    type: string;
    isRequired: boolean;
    defaultValue?: string | undefined;
    accessibility?: "public" | "internal";
}
```

- [ ] **Step 6: Attach script context in svelte-to-tsx conversion**

In `src/parsing/svelte-to-tsx.ts`, add to `SvelteToTsxResult`:

```typescript
import { type ScriptContextMap, parseScriptContexts } from "./script-context.js";

// Add to SvelteToTsxResult interface:
// scriptContext?: ScriptContextMap;

// In convertSvelteToTsx(), before the return statement (line ~66-79):
// After reading content but before conversion:
// const scriptContext = parseScriptContexts(content);

// In the success return, add: scriptContext
```

Full change to `convertSvelteToTsx`:
```typescript
export async function convertSvelteToTsx(filePath: string): Promise<SvelteToTsxResult> {
    const virtualPath = `${filePath}.tsx`;
    try {
        const content = await readFile(filePath, "utf-8");
        const scriptContext = parseScriptContexts(content);
        const isTs = isTypeScriptSvelte(content);
        const svelte2tsx = await getSvelte2Tsx();
        const result = svelte2tsx(content, {
            filename: filePath,
            isTsFile: isTs,
            mode: "ts",
            emitOnTemplateError: true,
        });
        return {
            sourcePath: filePath,
            virtualPath,
            tsxCode: result.code,
            sourceMap: result.map,
            success: true,
            scriptContext: { ...scriptContext, sourcePath: filePath },
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            sourcePath: filePath,
            virtualPath,
            tsxCode: "",
            sourceMap: undefined,
            success: false,
            error: { message },
        };
    }
}
```

- [ ] **Step 7: Wire context into component extractor**

The script context maps are available on `SvelteToTsxResult`. The runner needs to pass them to extraction. Add a `Map<string, ScriptContextMap>` parameter to `SymbolExtractor.extract()` or store it on `ParsingProject`.

Simplest approach: store on `ParsingProject`:

```typescript
// In ParsingProject, add:
private scriptContexts = new Map<string, ScriptContextMap>();

addScriptContext(sourcePath: string, context: ScriptContextMap): void {
    this.scriptContexts.set(sourcePath, context);
}

getScriptContext(sourcePath: string): ScriptContextMap | undefined {
    return this.scriptContexts.get(sourcePath);
}
```

Update `buildParsingProject` to pass contexts from results that have them.

In `SymbolExtractor.extractFile`, when processing svelte files, get context and pass to component extractor:

```typescript
if (isSvelte) {
    const context = this.project.getScriptContext(originalPath.replace(/\.tsx$/, ""));
    // ... pass context to extractComponentProps
}
```

Update `extractComponentProps` signature to accept optional `ScriptContextMap` and tag props:

```typescript
export function extractComponentProps(
    sourceFile: SourceFile,
    componentName: string,
    originalFilePath: string,
    scriptContext?: ScriptContextMap,
): PropSymbol[] {
    // ... existing logic ...
    // After creating each prop, add:
    // if (scriptContext) {
    //     const line = sourceFile.getStartLineNumber ? ... : undefined;
    //     prop.accessibility = line ? getContextForLine(scriptContext, line) ?? "internal" : "internal";
    // }
}
```

- [ ] **Step 8: Run all tests**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(SUML-33): parse module/instance script contexts and tag prop accessibility"
```

---

## Task 6: Reactive state subscription tracking (SUML-34)

**Files:**
- Modify: `src/types/edge.ts` — add `state_dependency`
- Create: `src/dependency/reactive-tracker.ts`
- Modify: `src/dependency/edge-builder.ts` — accept state deps
- Modify: `src/emission/class-diagram.ts` — render state dep edges
- Modify: `src/emission/package-diagram.ts` — same
- Modify: `src/cli/runner.ts` — wire reactive tracker
- Test: `tests/dependency/reactive-tracker.test.ts`

- [ ] **Step 1: Add `state_dependency` to `EdgeType`**

In `src/types/edge.ts`:

```typescript
export type EdgeType =
    | "extends"
    | "implements"
    | "composition"
    | "aggregation"
    | "dependency"
    | "association"
    | "state_dependency";
```

- [ ] **Step 2: Add arrow mapping for state_dependency**

In `src/emission/class-diagram.ts`, add to `mapEdgeArrow`:

```typescript
case "state_dependency":
    return "..>";
```

In `src/emission/package-diagram.ts`, add same case to `mapEdgeArrow`.

- [ ] **Step 3: Write failing tests**

```typescript
// tests/dependency/reactive-tracker.test.ts
import { describe, expect, it } from "vitest";
import { Project } from "ts-morph";
import type { StoreSymbol } from "../../src/types/ast.js";
import { trackReactiveDependencies } from "../../src/dependency/reactive-tracker.js";

describe("trackReactiveDependencies", () => {
    it("returns empty for no reactive symbols", () => {
        const project = new Project({ useInMemoryFileSystem: true });
        const result = trackReactiveDependencies(project, []);
        expect(result).toHaveLength(0);
    });

    it("tracks cross-file $state reference", () => {
        const project = new Project({ useInMemoryFileSystem: true });
        project.createSourceFile(
            "/src/lib/store.svelte.ts",
            `export const count = $state(0);`,
            { overwrite: true },
        );
        project.createSourceFile(
            "/src/lib/consumer.svelte.ts",
            `import { count } from './store.svelte.ts';\nconsole.log(count);`,
            { overwrite: true },
        );

        const reactiveSymbols: StoreSymbol[] = [{
            kind: "store", name: "count", filePath: "/src/lib/store.svelte.ts",
            storeType: "writable", valueType: "number", runeKind: "state",
        }];

        const deps = trackReactiveDependencies(project, reactiveSymbols);
        expect(deps).toHaveLength(1);
        expect(deps[0]?.sourceFile).toBe("/src/lib/consumer.svelte.ts");
        expect(deps[0]?.targetFile).toBe("/src/lib/store.svelte.ts");
        expect(deps[0]?.symbolName).toBe("count");
        expect(deps[0]?.dependencyKind).toBe("state");
    });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm vitest run tests/dependency/reactive-tracker.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Write implementation**

```typescript
// src/dependency/reactive-tracker.ts
import type { Project, SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { StoreSymbol } from "../types/ast.js";

export interface StateDependency {
    sourceFile: string;
    targetFile: string;
    symbolName: string;
    dependencyKind: "state" | "derived";
}

export function trackReactiveDependencies(
    project: Project,
    reactiveSymbols: StoreSymbol[],
): StateDependency[] {
    const deps: StateDependency[] = [];

    for (const symbol of reactiveSymbols) {
        if (!symbol.runeKind) continue;

        const sf = project.getSourceFile(symbol.filePath);
        if (!sf) continue;

        const decl = sf.getVariableDeclaration(symbol.name);
        if (!decl) continue;

        try {
            const refs = decl.findReferencesAsNodes();
            for (const ref of refs) {
                const refFile = ref.getSourceFile().getFilePath();
                if (refFile === symbol.filePath) continue;

                if (isTypeOnlyReference(ref)) continue;

                deps.push({
                    sourceFile: refFile,
                    targetFile: symbol.filePath,
                    symbolName: symbol.name,
                    dependencyKind: symbol.runeKind,
                });
            }
        } catch {
            // findReferencesAsNodes can throw on complex projects — skip gracefully
        }
    }

    return deduplicateDeps(deps);
}

function isTypeOnlyReference(ref: import("ts-morph").Node): boolean {
    const parent = ref.getParent();
    if (!parent) return false;

    if (parent.getKind() === SyntaxKind.ImportSpecifier) {
        const specifier = parent.asKind(SyntaxKind.ImportSpecifier);
        return specifier?.isTypeOnly() ?? false;
    }

    if (parent.getKind() === SyntaxKind.ImportClause) {
        const clause = parent.asKind(SyntaxKind.ImportClause);
        return clause?.isTypeOnly() ?? false;
    }

    return false;
}

function deduplicateDeps(deps: StateDependency[]): StateDependency[] {
    const seen = new Set<string>();
    return deps.filter((d) => {
        const key = `${d.sourceFile}|${d.targetFile}|${d.symbolName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run tests/dependency/reactive-tracker.test.ts`
Expected: PASS

- [ ] **Step 7: Integrate into edge builder**

In `src/dependency/edge-builder.ts`, add `StateDependency[]` parameter:

```typescript
import type { StateDependency } from "./reactive-tracker.js";

export function buildEdges(
    imports: ResolvedImport[],
    symbols: SymbolTable,
    stateDeps: StateDependency[] = [],
): Edge[] {
    // ... existing code ...

    // After the class extends/implements loop, add:
    for (const dep of stateDeps) {
        addEdge({
            source: dep.sourceFile,
            target: dep.targetFile,
            type: "state_dependency",
            label: `${dep.symbolName} <<${dep.dependencyKind}>>`,
        });
    }

    return edges;
}
```

- [ ] **Step 8: Wire into runner**

In `src/cli/runner.ts`:

```typescript
import { trackReactiveDependencies } from "../dependency/reactive-tracker.js";

// After extraction (around line 151):
const reactiveSymbols = symbols.stores.filter(s => s.runeKind);
const stateDeps = trackReactiveDependencies(parsingProject.getProject(), reactiveSymbols);

// Change buildEdges call:
let edges = buildEdges(imports, symbols, stateDeps);
```

- [ ] **Step 9: Update edge builder tests**

In `tests/dependency/edge-builder.test.ts`, update all `buildEdges` calls to pass empty array as third arg (or rely on default).

- [ ] **Step 10: Run full tests**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(SUML-34): track reactive state subscriptions with findReferencesAsNodes"
```

---

## Task 7: @sveltejs/package export conditions (SUML-36)

**Files:**
- Create: `src/discovery/package-exports.ts`
- Modify: `src/types/ast.ts` — add `isExported` to relevant symbols
- Modify: `src/discovery/file-discovery.ts` — integrate exports
- Modify: `src/extraction/symbol-extractor.ts` — tag exported symbols
- Modify: `src/emission/class-diagram.ts` — `<<Exported>>` stereotype
- Modify: `src/emission/package-diagram.ts` — same
- Test: `tests/discovery/package-exports.test.ts`

- [ ] **Step 1: Add `isExported` to types**

In `src/types/ast.ts`, add to `ClassSymbol`, `FunctionSymbol`, `StoreSymbol`:

```typescript
// On ClassSymbol:
isExported?: boolean;

// On FunctionSymbol — already has isExported, no change needed

// On StoreSymbol:
isExported?: boolean;
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/discovery/package-exports.test.ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePackageExports } from "../../src/discovery/package-exports.js";

describe("resolvePackageExports", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-exports-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns null when no exports field", () => {
        fs.writeFileSync(
            path.join(tmpDir, "package.json"),
            JSON.stringify({ name: "test" }),
        );
        expect(resolvePackageExports(tmpDir)).toBeNull();
    });

    it("returns null when no package.json", () => {
        expect(resolvePackageExports(tmpDir)).toBeNull();
    });

    it("resolves simple string exports", () => {
        fs.writeFileSync(
            path.join(tmpDir, "package.json"),
            JSON.stringify({
                name: "my-lib",
                exports: {
                    ".": "./src/index.ts",
                    "./Button": "./src/components/Button.svelte",
                },
            }),
        );
        const result = resolvePackageExports(tmpDir);
        expect(result).not.toBeNull();
        expect(result!.exports).toHaveLength(2);
        expect(result!.exports[0]?.exportName).toBe(".");
        expect(result!.exports[0]?.resolvedPath).toContain("src/index.ts");
    });

    it("resolves conditional exports with svelte condition", () => {
        fs.writeFileSync(
            path.join(tmpDir, "package.json"),
            JSON.stringify({
                name: "my-lib",
                exports: {
                    ".": {
                        svelte: "./src/lib/index.ts",
                        default: "./dist/index.js",
                    },
                },
            }),
        );
        const result = resolvePackageExports(tmpDir);
        expect(result).not.toBeNull();
        expect(result!.exports).toHaveLength(1);
        expect(result!.exports[0]?.conditions).toContain("svelte");
        expect(result!.exports[0]?.resolvedPath).toContain("src/lib/index.ts");
    });

    it("prefers svelte condition over default", () => {
        fs.writeFileSync(
            path.join(tmpDir, "package.json"),
            JSON.stringify({
                exports: {
                    ".": {
                        svelte: "./src/Foo.svelte",
                        default: "./dist/Foo.js",
                    },
                },
            }),
        );
        const result = resolvePackageExports(tmpDir);
        expect(result!.exports[0]?.resolvedPath).toContain("Foo.svelte");
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/discovery/package-exports.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write implementation**

```typescript
// src/discovery/package-exports.ts
import { readFileSync } from "node:fs";
import * as path from "node:path";

export interface PackageExport {
    exportName: string;
    resolvedPath: string;
    conditions: string[];
}

export interface PackageExportMap {
    projectRoot: string;
    exports: PackageExport[];
}

const CONDITION_PRIORITY = ["svelte", "default", "import", "require"];

export function resolvePackageExports(projectRoot: string): PackageExportMap | null {
    const pkgPath = path.join(projectRoot, "package.json");
    let pkg: Record<string, unknown>;
    try {
        const raw = readFileSync(pkgPath, "utf-8");
        pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }

    const exportsField = pkg.exports;
    if (!exportsField || typeof exportsField !== "object") return null;

    const exports: PackageExport[] = [];

    if (typeof exportsField === "string") {
        exports.push({
            exportName: ".",
            resolvedPath: resolvePath(projectRoot, exportsField),
            conditions: ["default"],
        });
    } else {
        for (const [exportName, value] of Object.entries(exportsField as Record<string, unknown>)) {
            const resolved = resolveExportValue(projectRoot, value);
            if (resolved) {
                exports.push({ exportName, ...resolved });
            }
        }
    }

    return { projectRoot, exports };
}

function resolveExportValue(
    projectRoot: string,
    value: unknown,
): { resolvedPath: string; conditions: string[] } | null {
    if (typeof value === "string") {
        return {
            resolvedPath: resolvePath(projectRoot, value),
            conditions: ["default"],
        };
    }

    if (typeof value === "object" && value !== null) {
        const conditions = value as Record<string, unknown>;
        for (const condition of CONDITION_PRIORITY) {
            if (typeof conditions[condition] === "string") {
                return {
                    resolvedPath: resolvePath(projectRoot, conditions[condition] as string),
                    conditions: [condition],
                };
            }
        }
    }

    return null;
}

function resolvePath(projectRoot: string, relativePath: string): string {
    if (path.isAbsolute(relativePath)) return relativePath;
    return path.resolve(projectRoot, relativePath);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/discovery/package-exports.test.ts`
Expected: PASS

- [ ] **Step 6: Integrate into file discovery**

In `src/discovery/file-discovery.ts`, import and call `resolvePackageExports`. Add `exportedFiles: Set<string>` to the return logic. The discovery function should mark files in the export map.

In `src/types/config.ts`, add to `DiscoveredFiles`:

```typescript
exportedFiles: Set<string>;
```

Update `discoverFiles` to populate this set from `resolvePackageExports`.

- [ ] **Step 7: Tag exported symbols in extraction**

In `src/extraction/symbol-extractor.ts`, accept `exportedFiles: Set<string>` (passed from runner). When processing a file in the set, add `isExported: true` to extracted symbols.

- [ ] **Step 8: Render `<<Exported>>` stereotype in emission**

In `src/emission/class-diagram.ts`, modify `renderClass`:

```typescript
function renderClass(lines: string[], cls: ClassSymbol, options: DiagramOptions): void {
    const keyword = cls.kind === "interface" ? "interface"
        : cls.kind === "abstract-class" ? "abstract class"
        : "class";
    const stereotype = cls.isExported ? " <<Exported>>" : "";
    lines.push(`${keyword} "${cls.name}" as ${sanitizeId(cls.name)}${stereotype} {`);
    // ... rest unchanged
}
```

Similar for `renderStore` and function rendering.

In `src/emission/package-diagram.ts`, similar stereotype addition in `buildPackages`.

- [ ] **Step 9: Run full tests**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 10: Run coverage**

Run: `pnpm run test:coverage`
Expected: 90%+ branches

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(SUML-36): resolve @sveltejs/package export conditions and mark public API"
```

---

## Task 8: Final integration and coverage

**Files:**
- Modify: `src/cli/runner.ts` — wire all new features together
- Verify all tests pass with full coverage

- [ ] **Step 1: Verify runner integration is complete**

Ensure `src/cli/runner.ts`:
1. Creates `PipelineErrorHandler`
2. Passes it to `SymbolExtractor`
3. Calls `trackReactiveDependencies` and passes state deps to `buildEdges`
4. Surfaces parse errors to error handler
5. Prints error summary before output

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 3: Run coverage check**

Run: `pnpm run test:coverage`
Expected: 90%+ branches, 80%+ lines

- [ ] **Step 4: Run lint**

Run: `pnpm exec biome check src/ tests/`
Expected: No errors

- [ ] **Step 5: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Push and create PR**

```bash
git push -u origin epic/SUML-E7-edge-case-management
gh pr create --title "feat: EPIC 7 Edge Case Management & Architectural Resilience" --body "$(cat <<'EOF'
## Summary
- Graceful degradation with `PipelineErrorHandler` for per-file error recovery
- Svelte 5 rune detection ($state, $derived) with `runeKind` classification
- Module/instance script context parsing and prop accessibility tagging
- Reactive state subscription tracking via `findReferencesAsNodes()`
- @sveltejs/package export conditions resolution and `<<Exported>>` stereotypes

## Test plan
- [x] All new modules have dedicated test files
- [x] Branch coverage ≥90%
- [x] Typecheck passes
- [x] Biome lint passes
EOF
)"
```

- [ ] **Step 7: Update Plane work items**

Mark SUML-33, 34, 35, 36, 37 as completed in Plane.
