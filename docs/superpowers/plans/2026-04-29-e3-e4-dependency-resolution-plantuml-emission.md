# E3+E4: Dependency Resolution & PlantUML Emission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dependency resolution layer (import scanning → edge extraction) and the PlantUML emission layer (symbol table + edges → PlantUML diagram output).

**Architecture:** Two new top-level modules: `src/dependency/` scans import declarations via ts-morph and resolves specifiers through aliases to produce `Edge[]`; `src/emission/` renders `SymbolTable` + `EdgeSet` into PlantUML class and package diagrams. All code uses ts-morph's AST API, follows existing project patterns (in-memory Project, biome formatting, vitest testing).

**Tech Stack:** ts-morph, TypeScript, vitest, biome

---

### Task 1: Import Scanner — Types & Interface

**Files:**
- Create: `src/dependency/import-scanner.ts`
- Create: `tests/dependency/import-scanner.test.ts`

- [ ] **Step 1: Write the failing tests for import scanning**

```ts
// tests/dependency/import-scanner.test.ts
import { describe, it, expect } from "vitest";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { scanImports } from "../../src/dependency/import-scanner.js";
import type { AliasMap } from "../../src/types/config.js";

function buildProject(files: Record<string, string>): ParsingProject {
	const parsingProject = new ParsingProject();
	for (const [filePath, content] of Object.entries(files)) {
		parsingProject.addPlainSourceFile(filePath, content);
	}
	return parsingProject;
}

describe("scanImports", () => {
	it("returns empty array for project with no imports", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function add(a: number, b: number): number { return a + b; }`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("extracts a relative import", () => {
		const project = buildProject({
			"/src/lib/a.ts": `export function a() {}`,
			"/src/lib/b.ts": `import { a } from './a.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.sourceFile).toBe("/src/lib/b.ts");
		expect(result[0]?.targetFile).toBe("/src/lib/a.ts");
		expect(result[0]?.importedNames).toEqual(["a"]);
		expect(result[0]?.isTypeOnly).toBe(false);
	});

	it("extracts a type-only import", () => {
		const project = buildProject({
			"/src/lib/types.ts": `export interface User { id: string; }`,
			"/src/lib/api.ts": `import type { User } from './types.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.isTypeOnly).toBe(true);
		expect(result[0]?.importedNames).toEqual(["User"]);
	});

	it("resolves $lib alias using AliasMap", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function helper(): void {}`,
			"/src/routes/+page.ts": `import { helper } from '$lib/utils';`,
		});
		const aliases: AliasMap = { $lib: "/src/lib" };
		const result = scanImports(project, aliases);
		expect(result).toHaveLength(1);
		expect(result[0]?.targetFile).toBe("/src/lib/utils.ts");
	});

	it("skips external imports (node_modules)", () => {
		const project = buildProject({
			"/src/lib/stores.ts": `import { writable } from 'svelte/store'; export const x = writable(0);`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("handles namespace import", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function a() {} export function b() {}`,
			"/src/lib/consumer.ts": `import * as utils from './utils.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.importedNames).toEqual([]);
		expect(result[0]?.targetFile).toBe("/src/lib/utils.ts");
	});

	it("skips import with unresolvable target", () => {
		const project = buildProject({
			"/src/lib/consumer.ts": `import { missing } from './nonexistent.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("extracts multiple imports from same file", () => {
		const project = buildProject({
			"/src/lib/a.ts": `export const x = 1;`,
			"/src/lib/b.ts": `export const y = 2;`,
			"/src/lib/c.ts": `
				import { x } from './a.js';
				import { y } from './b.js';
			`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(2);
		const targets = result.map(r => r.targetFile);
		expect(targets).toContain("/src/lib/a.ts");
		expect(targets).toContain("/src/lib/b.ts");
	});

	it("skips .svelte.tsx virtual paths", () => {
		const project = buildProject({
			"/src/lib/Button.svelte.tsx": `export default function Button() {}`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/dependency/import-scanner.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the import-scanner implementation**

```ts
// src/dependency/import-scanner.ts
import type { SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { AliasMap } from "../types/config.js";

export interface ResolvedImport {
	sourceFile: string;
	targetFile: string;
	importedNames: string[];
	isTypeOnly: boolean;
}

export function scanImports(
	parsingProject: ParsingProject,
	aliases: AliasMap,
): ResolvedImport[] {
	const allFiles = parsingProject.getAllSourceFiles();
	const results: ResolvedImport[] = [];
	const knownFiles = new Set(allFiles.keys());

	for (const [originalPath, sourceFile] of allFiles) {
		if (originalPath.endsWith(".svelte.tsx")) continue;

		const imports = extractImportsFromFile(sourceFile, originalPath, aliases, knownFiles);
		results.push(...imports);
	}

	return results;
}

function extractImportsFromFile(
	sourceFile: SourceFile,
	originalPath: string,
	aliases: AliasMap,
	knownFiles: Set<string>,
): ResolvedImport[] {
	const results: ResolvedImport[] = [];

	for (const importDecl of sourceFile.getImportDeclarations()) {
		const specifier = importDecl.getModuleSpecifierValue();
		if (!specifier) continue;

		const resolvedTarget = resolveSpecifier(specifier, originalPath, aliases, knownFiles);
		if (!resolvedTarget) continue;

		const isTypeOnly = importDecl.isTypeOnly();

		const namedImports: string[] = [];
		for (const ni of importDecl.getNamedImports()) {
			namedImports.push(ni.getName());
		}

		const namespaceImport = importDecl.getNamespaceImport();
		if (namespaceImport) {
			results.push({
				sourceFile: originalPath,
				targetFile: resolvedTarget,
				importedNames: [],
				isTypeOnly,
			});
			continue;
		}

		const defaultImport = importDecl.getDefaultImport();
		if (defaultImport && namedImports.length === 0) {
			results.push({
				sourceFile: originalPath,
				targetFile: resolvedTarget,
				importedNames: [defaultImport.getText()],
				isTypeOnly,
			});
			continue;
		}

		if (namedImports.length > 0 || importDecl.getNamespaceImport()) {
			results.push({
				sourceFile: originalPath,
				targetFile: resolvedTarget,
				importedNames: namedImports,
				isTypeOnly,
			});
		} else {
			results.push({
				sourceFile: originalPath,
				targetFile: resolvedTarget,
				importedNames: [],
				isTypeOnly,
			});
		}
	}

	return results;
}

function resolveSpecifier(
	specifier: string,
	fromFile: string,
	aliases: AliasMap,
	knownFiles: Set<string>,
): string | undefined {
	// Try alias resolution first
	for (const [alias, resolved] of Object.entries(aliases)) {
		if (specifier === alias || specifier.startsWith(`${alias}/`)) {
			const relativePart = specifier.slice(alias.length);
			const candidate = `${resolved}${relativePart}`;
			const resolvedPath = tryResolve(candidate, knownFiles);
			if (resolvedPath) return resolvedPath;
		}
	}

	// Try relative resolution
	if (specifier.startsWith(".")) {
		const dir = fromFile.substring(0, fromFile.lastIndexOf("/"));
		const candidate = `${dir}/${specifier}`;
		const resolvedPath = tryResolve(candidate, knownFiles);
		if (resolvedPath) return resolvedPath;
	}

	return undefined;
}

function tryResolve(basePath: string, knownFiles: Set<string>): string | undefined {
	const extensions = [".ts", ".tsx", ".js", ".jsx", ".svelte", ".svelte.ts", ".svelte.js"];
	for (const ext of extensions) {
		const candidate = stripExtension(basePath) + ext;
		if (knownFiles.has(candidate)) return candidate;
	}
	if (knownFiles.has(basePath)) return basePath;
	const indexPath = stripExtension(basePath) + "/index.ts";
	if (knownFiles.has(indexPath)) return indexPath;
	return undefined;
}

function stripExtension(path: string): string {
	const dotIndex = path.lastIndexOf(".");
	if (dotIndex === -1) return path;
	return path.substring(0, dotIndex);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/dependency/import-scanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dependency/import-scanner.ts tests/dependency/import-scanner.test.ts
git commit -m "feat(dependency): implement import scanner with alias resolution"
```

---

### Task 2: Edge Builder

**Files:**
- Create: `src/dependency/edge-builder.ts`
- Create: `tests/dependency/edge-builder.test.ts`

- [ ] **Step 1: Write the failing tests for edge building**

```ts
// tests/dependency/edge-builder.test.ts
import { describe, it, expect } from "vitest";
import { buildEdges } from "../../src/dependency/edge-builder.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { Edge } from "../../src/types/edge.js";

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		...overrides,
	};
}

describe("buildEdges", () => {
	it("returns empty array for no imports and no symbols", () => {
		const result = buildEdges([], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("creates dependency edge for function import", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/lib/api.ts", targetFile: "/src/lib/utils.ts", importedNames: ["formatDate"], isTypeOnly: false },
		];
		const symbols = makeSymbolTable({
			functions: [
				{ kind: "function", name: "formatDate", filePath: "/src/lib/utils.ts", isExported: true, isAsync: false, parameters: [], returnType: "string", typeParams: [] },
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
		expect(result[0]?.source).toBe("/src/lib/api.ts");
		expect(result[0]?.target).toBe("/src/lib/utils.ts");
		expect(result[0]?.label).toBe("formatDate");
	});

	it("creates extends edge from class hierarchy", () => {
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "class", name: "BaseService", filePath: "/src/lib/base.ts",
					extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [],
				},
				{
					kind: "class", name: "ApiService", filePath: "/src/lib/api.ts",
					extends: "BaseService", implements: [], members: [], isGeneric: false, typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		const extendsEdge = result.find(e => e.type === "extends");
		expect(extendsEdge).toBeDefined();
		expect(extendsEdge?.source).toBe("/src/lib/api.ts");
		expect(extendsEdge?.target).toBe("/src/lib/base.ts");
		expect(extendsEdge?.label).toBe("BaseService");
	});

	it("creates implements edge from class interface", () => {
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "interface", name: "IRepo", filePath: "/src/lib/types.ts",
					implements: [], members: [], isGeneric: false, typeParams: [],
				},
				{
					kind: "class", name: "Repo", filePath: "/src/lib/repo.ts",
					extends: undefined, implements: ["IRepo"], members: [], isGeneric: false, typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		const implEdge = result.find(e => e.type === "implements");
		expect(implEdge).toBeDefined();
		expect(implEdge?.source).toBe("/src/lib/repo.ts");
		expect(implEdge?.target).toBe("/src/lib/types.ts");
		expect(implEdge?.label).toBe("IRepo");
	});

	it("creates composition edge for store import", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/stores.ts", importedNames: ["user"], isTypeOnly: false },
		];
		const symbols = makeSymbolTable({
			stores: [
				{ kind: "store", name: "user", filePath: "/src/lib/stores.ts", storeType: "writable", valueType: "User" },
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("composition");
		expect(result[0]?.label).toBe("user");
	});

	it("creates association edge for route importing component", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Button.svelte", importedNames: ["Button"], isTypeOnly: false },
		];
		const symbols = makeSymbolTable({
			props: [
				{ kind: "prop", name: "label", filePath: "/src/lib/Button.svelte", componentName: "Button", type: "string", isRequired: true },
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("association");
		expect(result[0]?.label).toBe("Button");
	});

	it("deduplicates edges between same source and target", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/lib/a.ts", targetFile: "/src/lib/b.ts", importedNames: ["x", "y"], isTypeOnly: false },
		];
		const symbols = makeSymbolTable({
			functions: [
				{ kind: "function", name: "x", filePath: "/src/lib/b.ts", isExported: true, isAsync: false, parameters: [], returnType: "void", typeParams: [] },
				{ kind: "function", name: "y", filePath: "/src/lib/b.ts", isExported: true, isAsync: false, parameters: [], returnType: "void", typeParams: [] },
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
	});

	it("handles type-only imports as dependency edges", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/lib/api.ts", targetFile: "/src/lib/types.ts", importedNames: ["User"], isTypeOnly: true },
		];
		const symbols = makeSymbolTable({
			classes: [
				{ kind: "interface", name: "User", filePath: "/src/lib/types.ts", implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
	});

	it("defaults to dependency when imported symbol kind is unknown", () => {
		const imports: ResolvedImport[] = [
			{ sourceFile: "/src/lib/a.ts", targetFile: "/src/lib/b.ts", importedNames: ["default"], isTypeOnly: false },
		];
		const result = buildEdges(imports, makeSymbolTable());
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/dependency/edge-builder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the edge-builder implementation**

```ts
// src/dependency/edge-builder.ts
import type { ResolvedImport } from "./import-scanner.js";
import type { ClassSymbol, SymbolTable } from "../types/ast.js";
import type { Edge } from "../types/edge.js";

export function buildEdges(imports: ResolvedImport[], symbols: SymbolTable): Edge[] {
	const edges: Edge[] = [];
	const seen = new Set<string>();

	const addEdge = (edge: Edge) => {
		const key = `${edge.source}|${edge.target}|${edge.type}`;
		if (!seen.has(key)) {
			seen.add(key);
			edges.push(edge);
		}
	};

	const classByFileAndName = new Map<string, ClassSymbol>();
	for (const cls of symbols.classes) {
		classByFileAndName.set(`${cls.filePath}::${cls.name}`, cls);
	}
	const classNamesByFile = new Map<string, Set<string>>();
	for (const cls of symbols.classes) {
		let names = classNamesByFile.get(cls.filePath);
		if (!names) {
			names = new Set();
			classNamesByFile.set(cls.filePath, names);
		}
		names.add(cls.name);
	}

	const storeFiles = new Set(symbols.stores.map(s => s.filePath));
	const componentFiles = new Set(symbols.props.map(p => p.filePath));

	for (const imp of imports) {
		const isStoreImport = storeFiles.has(imp.targetFile);
		const isComponentImport = componentFiles.has(imp.targetFile);
		const routeSource = imp.sourceFile.includes("/routes/") || imp.sourceFile.includes("\\routes\\");

		let edgeType: Edge["type"];
		if (isStoreImport) {
			edgeType = "composition";
		} else if (isComponentImport && routeSource) {
			edgeType = "association";
		} else {
			edgeType = "dependency";
		}

		const label = imp.importedNames.length > 0 ? imp.importedNames.join(", ") : undefined;
		addEdge({ source: imp.sourceFile, target: imp.targetFile, type: edgeType, label });
	}

	for (const cls of symbols.classes) {
		if (cls.extends) {
			const targetFile = findClassFile(cls.extends, cls.filePath, classNamesByFile, classByFileAndName);
			if (targetFile) {
				addEdge({
					source: cls.filePath,
					target: targetFile,
					type: "extends",
					label: cls.extends,
				});
			}
		}

		for (const iface of cls.implements) {
			const targetFile = findClassFile(iface, cls.filePath, classNamesByFile, classByFileAndName);
			if (targetFile) {
				addEdge({
					source: cls.filePath,
					target: targetFile,
					type: "implements",
					label: iface,
				});
			}
		}
	}

	return edges;
}

function findClassFile(
	name: string,
	currentFilePath: string,
	classNamesByFile: Map<string, Set<string>>,
	classByFileAndName: Map<string, ClassSymbol>,
): string | undefined {
	for (const [filePath, names] of classNamesByFile) {
		if (names.has(name)) return filePath;
	}
	return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/dependency/edge-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dependency/edge-builder.ts tests/dependency/edge-builder.test.ts
git commit -m "feat(dependency): implement edge builder with extends/implements/composition/association"
```

---

### Task 3: Dependency Module Barrel Export

**Files:**
- Create: `src/dependency/index.ts`

- [ ] **Step 1: Create the barrel export**

```ts
// src/dependency/index.ts
export { buildEdges } from "./edge-builder.js";
export type { ResolvedImport } from "./import-scanner.js";
export { scanImports } from "./import-scanner.js";
```

- [ ] **Step 2: Commit**

```bash
git add src/dependency/index.ts
git commit -m "feat(dependency): add barrel export for dependency module"
```

---

### Task 4: PlantUML Class Diagram Renderer

**Files:**
- Create: `src/emission/class-diagram.ts`
- Create: `tests/emission/class-diagram.test.ts`

- [ ] **Step 1: Write the failing tests for class diagram rendering**

```ts
// tests/emission/class-diagram.test.ts
import { describe, it, expect } from "vitest";
import { renderClassDiagram } from "../../src/emission/class-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { EdgeSet } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		...overrides,
	};
}

describe("renderClassDiagram", () => {
	it("renders empty diagram with start/end tags", () => {
		const result = renderClassDiagram(makeEmptySymbolTable(), createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("@startuml");
		expect(result).toContain("@enduml");
	});

	it("renders a class with members", () => {
		const symbols = makeEmptySymbolTable({
			classes: [{
				kind: "class",
				name: "AudioPlayer",
				filePath: "/src/lib/audio.ts",
				extends: undefined,
				implements: [],
				members: [
					{ kind: "property", name: "volume", visibility: "private", type: "number", isStatic: false, isAbstract: false, isReadonly: false },
					{ kind: "method", name: "play", visibility: "public", type: "void", isStatic: false, isAbstract: false, isReadonly: false, parameters: [{ name: "url", type: "string", isOptional: false }], returnType: "void" },
				],
				isGeneric: false,
				typeParams: [],
			}],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain('class "AudioPlayer"');
		expect(result).toContain("- volume: number");
		expect(result).toContain("+ play(url: string): void");
	});

	it("renders an interface with stereotype", () => {
		const symbols = makeEmptySymbolTable({
			classes: [{
				kind: "interface",
				name: "IRepository",
				filePath: "/src/lib/types.ts",
				implements: [],
				members: [],
				isGeneric: false,
				typeParams: [],
			}],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("interface");
	});

	it("renders an abstract class", () => {
		const symbols = makeEmptySymbolTable({
			classes: [{
				kind: "abstract-class",
				name: "BaseService",
				filePath: "/src/lib/base.ts",
				extends: undefined,
				implements: [],
				members: [],
				isGeneric: false,
				typeParams: [],
			}],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("abstract");
	});

	it("renders extends edge", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{ kind: "class", name: "Base", filePath: "/a.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Child", filePath: "/b.ts", extends: "Base", implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edges = createEdgeSet([
			{ source: "/b.ts", target: "/a.ts", type: "extends", label: "Base" },
		]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Child <|-- Base");
	});

	it("renders implements edge", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{ kind: "interface", name: "IRepo", filePath: "/a.ts", implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Repo", filePath: "/b.ts", extends: undefined, implements: ["IRepo"], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edges = createEdgeSet([
			{ source: "/b.ts", target: "/a.ts", type: "implements", label: "IRepo" },
		]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Repo ..|> IRepo");
	});

	it("renders dependency edge", () => {
		const edges = createEdgeSet([
			{ source: "/a.ts", target: "/b.ts", type: "dependency" },
		]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("..>");
	});

	it("renders composition edge for stores", () => {
		const symbols = makeEmptySymbolTable({
			stores: [{
				kind: "store", name: "userStore", filePath: "/src/lib/stores.ts",
				storeType: "writable", valueType: "User",
			}],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<store>>");
		expect(result).toContain("userStore");
	});

	it("renders component with props when showProps is true", () => {
		const symbols = makeEmptySymbolTable({
			props: [
				{ kind: "prop", name: "label", filePath: "/src/lib/Button.svelte", componentName: "Button", type: "string", isRequired: true },
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<component>>");
		expect(result).toContain("Button");
		expect(result).toContain("label: string");
	});

	it("hides members when showMembers is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [{
				kind: "class", name: "Svc", filePath: "/a.ts",
				extends: undefined, implements: [],
				members: [
					{ kind: "property", name: "x", visibility: "private", type: "number", isStatic: false, isAbstract: false, isReadonly: false },
				],
				isGeneric: false, typeParams: [],
			}],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMembers: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("x: number");
	});

	it("hides methods when showMethods is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [{
				kind: "class", name: "Svc", filePath: "/a.ts",
				extends: undefined, implements: [],
				members: [
					{ kind: "method", name: "doWork", visibility: "public", type: "void", isStatic: false, isAbstract: false, isReadonly: false, parameters: [], returnType: "void" },
				],
				isGeneric: false, typeParams: [],
			}],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMethods: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("doWork");
	});

	it("includes title when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "My App" };
		const result = renderClassDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("@startuml My App");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/emission/class-diagram.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the class-diagram implementation**

```ts
// src/emission/class-diagram.ts
import type { ClassSymbol, MemberSymbol, PropSymbol, StoreSymbol, SymbolTable } from "../types/ast.js";
import type { EdgeType } from "../types/edge.js";
import type { EdgeSet } from "../types/edge.js";
import type { DiagramOptions } from "../types/diagram.js";

export function renderClassDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Diagram";
	lines.push(`@startuml ${title}`);
	lines.push("skinparam classAttributeIconSize 0");
	lines.push("");

	for (const cls of symbols.classes) {
		renderClass(lines, cls, options);
	}

	if (options.showStores) {
		for (const store of symbols.stores) {
			renderStore(lines, store);
		}
	}

	if (options.showProps) {
		const components = groupPropsByComponent(symbols.props);
		for (const [name, props] of components) {
			renderComponent(lines, name, props, options);
		}
	}

	for (const fn of symbols.functions) {
		lines.push(`class "${fn.name}" <<function>> {`);
		lines.push("}");
		lines.push("");
	}

	for (const edge of edgeSet.edges) {
		renderEdge(lines, edge.source, edge.target, edge.type, edge.label);
	}

	lines.push("@enduml");
	return lines.join("\n");
}

function renderClass(lines: string[], cls: ClassSymbol, options: DiagramOptions): void {
	const keyword = cls.kind === "interface" ? "interface" : cls.kind === "abstract-class" ? "abstract class" : "class";
	lines.push(`${keyword} "${cls.name}" as ${cls.name} {`);
	if (options.showMembers) {
		for (const member of cls.members) {
			if (member.kind === "method" && !options.showMethods) continue;
			const vis = mapVisibility(member.visibility, options.showVisibility);
			if (member.kind === "property") {
				lines.push(`  ${vis}${member.name}: ${member.type}`);
			} else {
				const params = member.parameters?.map(p => `${p.name}: ${p.type}`).join(", ") ?? "";
				const ret = member.returnType ?? member.type;
				lines.push(`  ${vis}${member.name}(${params}): ${ret}`);
			}
		}
	}
	lines.push("}");
	lines.push("");
}

function renderStore(lines: string[], store: StoreSymbol): void {
	lines.push(`class "${store.name}" <<store>> {`);
	lines.push(`  storeType: ${store.storeType}`);
	lines.push(`  valueType: ${store.valueType}`);
	lines.push("}");
	lines.push("");
}

function renderComponent(lines: string[], name: string, props: PropSymbol[], options: DiagramOptions): void {
	lines.push(`class "${name}" <<component>> {`);
	if (options.showMembers) {
		for (const prop of props) {
			const suffix = prop.isRequired ? "" : "?";
			lines.push(`  + ${prop.name}${suffix}: ${prop.type}`);
		}
	}
	lines.push("}");
	lines.push("");
}

function renderEdge(lines: string[], source: string, target: string, type: EdgeType, label?: string): void {
	const arrow = mapEdgeArrow(type);
	const labelText = label ? ` : ${label}` : "";
	const sourceId = sanitizeId(source);
	const targetId = sanitizeId(target);
	lines.push(`${sourceId} ${arrow} ${targetId}${labelText}`);
}

function mapEdgeArrow(type: EdgeType): string {
	switch (type) {
		case "extends": return "<|--";
		case "implements": return "..|>";
		case "composition": return "*--";
		case "aggregation": return "o--";
		case "dependency": return "..>";
		case "association": return "-->";
	}
}

function mapVisibility(vis: string, show: boolean): string {
	if (!show) return "";
	switch (vis) {
		case "private": return "- ";
		case "protected": return "# ";
		default: return "+ ";
	}
}

function sanitizeId(path: string): string {
	return path.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

function groupPropsByComponent(props: PropSymbol[]): Map<string, PropSymbol[]> {
	const map = new Map<string, PropSymbol[]>();
	for (const prop of props) {
		let list = map.get(prop.componentName);
		if (!list) {
			list = [];
			map.set(prop.componentName, list);
		}
		list.push(prop);
	}
	return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/emission/class-diagram.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/emission/class-diagram.ts tests/emission/class-diagram.test.ts
git commit -m "feat(emission): implement PlantUML class diagram renderer"
```

---

### Task 5: PlantUML Package Diagram Renderer

**Files:**
- Create: `src/emission/package-diagram.ts`
- Create: `tests/emission/package-diagram.test.ts`

- [ ] **Step 1: Write the failing tests for package diagram rendering**

```ts
// tests/emission/package-diagram.test.ts
import { describe, it, expect } from "vitest";
import { renderPackageDiagram } from "../../src/emission/package-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { EdgeSet } from "../types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		...overrides,
	};
}

describe("renderPackageDiagram", () => {
	it("renders empty diagram with start/end tags", () => {
		const result = renderPackageDiagram(makeEmptySymbolTable(), createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("@startuml");
		expect(result).toContain("@enduml");
	});

	it("groups classes into packages by directory", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{ kind: "class", name: "AudioPlayer", filePath: "/src/lib/audio.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "VideoPlayer", filePath: "/src/lib/media/video.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain('package "src/lib"');
		expect(result).toContain('package "src/lib/media"');
		expect(result).toContain("AudioPlayer");
		expect(result).toContain("VideoPlayer");
	});

	it("renders dependency between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("src_routes ..> src_lib");
	});

	it("hides empty packages when hideEmptyPackages is true", () => {
		const result = renderPackageDiagram(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			hideEmptyPackages: true,
		});
		expect(result).toContain("@startuml");
		expect(result).toContain("@enduml");
	});

	it("includes title when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "Packages" };
		const result = renderPackageDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("@startuml Packages");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/emission/package-diagram.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the package-diagram implementation**

```ts
// src/emission/package-diagram.ts
import type { SymbolTable } from "../types/ast.js";
import type { EdgeType } from "../types/edge.js";
import type { EdgeSet } from "../types/edge.js";
import type { DiagramOptions } from "../types/diagram.js";

export function renderPackageDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Package Diagram";
	lines.push(`@startuml ${title}`);
	lines.push("");

	const packages = buildPackages(symbols, options);

	if (options.hideEmptyPackages) {
		for (const [pkg, entries] of packages) {
			if (entries.length === 0) {
				packages.delete(pkg);
			}
		}
	}

	for (const [pkg, entries] of packages) {
		lines.push(`package "${pkg}" as ${sanitizeId(pkg)} {`);
		for (const entry of entries) {
			lines.push(`  ${entry}`);
		}
		lines.push("}");
		lines.push("");
	}

	const renderedEdges = new Set<string>();
	for (const edge of edgeSet.edges) {
		const sourcePkg = extractPackage(edge.source);
		const targetPkg = extractPackage(edge.target);
		if (sourcePkg && targetPkg && sourcePkg !== targetPkg) {
			const key = `${sourcePkg}|${targetPkg}`;
			if (!renderedEdges.has(key)) {
				renderedEdges.add(key);
				const arrow = mapEdgeArrow(edge.type);
				lines.push(`${sanitizeId(sourcePkg)} ${arrow} ${sanitizeId(targetPkg)}`);
			}
		}
	}

	if (renderedEdges.size > 0) lines.push("");
	lines.push("@enduml");
	return lines.join("\n");
}

interface PkgEntry {
	kind: string;
	name: string;
}

function buildPackages(symbols: SymbolTable, options: DiagramOptions): Map<string, string[]> {
	const packages = new Map<string, string[]>();

	const addEntry = (filePath: string, line: string) => {
		const pkg = extractPackage(filePath);
		if (!pkg) return;
		let entries = packages.get(pkg);
		if (!entries) {
			entries = [];
			packages.set(pkg, entries);
		}
		entries.push(line);
	};

	for (const cls of symbols.classes) {
		addEntry(cls.filePath, `${cls.kind === "interface" ? "interface" : "class"} ${cls.name}`);
	}

	if (options.showStores) {
		for (const store of symbols.stores) {
			addEntry(store.filePath, `class "${store.name}" <<store>>`);
		}
	}

	if (options.showProps) {
		const seen = new Set<string>();
		for (const prop of symbols.props) {
			if (!seen.has(prop.componentName)) {
				seen.add(prop.componentName);
				addEntry(prop.filePath, `class "${prop.componentName}" <<component>>`);
			}
		}
	}

	for (const fn of symbols.functions) {
		addEntry(fn.filePath, `class "${fn.name}" <<function>>`);
	}

	return packages;
}

function extractPackage(filePath: string): string | undefined {
	const parts = filePath.split("/");
	if (parts.length < 2) return undefined;
	parts.pop();
	return parts.join("/");
}

function sanitizeId(path: string): string {
	return path.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

function mapEdgeArrow(type: EdgeType): string {
	switch (type) {
		case "extends": return "<|--";
		case "implements": return "..|>";
		case "composition": return "*--";
		case "aggregation": return "o--";
		case "dependency": return "..>";
		case "association": return "-->";
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/emission/package-diagram.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/emission/package-diagram.ts tests/emission/package-diagram.test.ts
git commit -m "feat(emission): implement PlantUML package diagram renderer"
```

---

### Task 6: PlantUML Emitter Facade

**Files:**
- Create: `src/emission/plantuml-emitter.ts`
- Create: `src/emission/index.ts`
- Create: `tests/emission/plantuml-emitter.test.ts`

- [ ] **Step 1: Write the failing tests for the emitter facade**

```ts
// tests/emission/plantuml-emitter.test.ts
import { describe, it, expect } from "vitest";
import { emitPlantUML } from "../../src/emission/plantuml-emitter.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { EdgeSet } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return { classes: [], functions: [], stores: [], props: [], exports: [], ...overrides };
}

describe("emitPlantUML", () => {
	it("defaults to class diagram kind", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.diagramKind).toBe("class");
		expect(result.content).toContain("@startuml");
	});

	it("produces class diagram when kind is class", () => {
		const result = emitPlantUML(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			{ ...DEFAULT_DIAGRAM_OPTIONS, kind: "class" },
		);
		expect(result.diagramKind).toBe("class");
	});

	it("produces package diagram when kind is package", () => {
		const result = emitPlantUML(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			{ ...DEFAULT_DIAGRAM_OPTIONS, kind: "package" },
		);
		expect(result.diagramKind).toBe("package");
		expect(result.content).toContain("@startuml");
	});

	it("uses DEFAULT_DIAGRAM_OPTIONS when no options provided", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.content).toContain("@startuml");
		expect(result.content).toContain("@enduml");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/emission/plantuml-emitter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the plantuml-emitter facade**

```ts
// src/emission/plantuml-emitter.ts
import type { SymbolTable } from "../types/ast.js";
import type { EdgeSet } from "../types/edge.js";
import type { DiagramOptions, EmissionResult } from "../types/index.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";
import { renderClassDiagram } from "./class-diagram.js";
import { renderPackageDiagram } from "./package-diagram.js";

export function emitPlantUML(
	symbols: SymbolTable,
	edges: EdgeSet,
	options?: DiagramOptions,
): EmissionResult {
	const opts = options ?? DEFAULT_DIAGRAM_OPTIONS;

	const content =
		opts.kind === "package"
			? renderPackageDiagram(symbols, edges, opts)
			: renderClassDiagram(symbols, edges, opts);

	return {
		content,
		diagramKind: opts.kind,
	};
}
```

- [ ] **Step 4: Write the emission barrel export**

```ts
// src/emission/index.ts
export { renderClassDiagram } from "./class-diagram.js";
export { emitPlantUML } from "./plantuml-emitter.js";
export { renderPackageDiagram } from "./package-diagram.js";
```

- [ ] **Step 5: Run all emission tests**

Run: `pnpm test -- tests/emission/`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/emission/plantuml-emitter.ts src/emission/index.ts tests/emission/plantuml-emitter.test.ts
git commit -m "feat(emission): implement PlantUML emitter facade with class/package dispatch"
```

---

### Task 7: Update Public API (src/index.ts)

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add dependency and emission exports to src/index.ts**

Add these lines at the end of `src/index.ts`:

```ts
export { buildEdges } from "./dependency/index.js";
export type { ResolvedImport } from "./dependency/index.js";
export { scanImports } from "./dependency/index.js";
export { emitPlantUML, renderClassDiagram, renderPackageDiagram } from "./emission/index.js";
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: export dependency and emission modules from public API"
```

---

### Task 8: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run linter**

Run: `pnpm run lint`
Expected: PASS (or fix any issues)

- [ ] **Step 4: Run coverage**

Run: `pnpm test:coverage`
Expected: Coverage meets thresholds (90% branch)
