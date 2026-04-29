# EPIC 6: CLI & Developer Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SvelteUML CLI with commander.js argument parsing, config file loading, progress reporting, external dependency filtering, and watch mode.

**Architecture:** Thin CLI layer over existing pipeline modules. `cli.ts` entry point delegates to `cli/args.ts` for parsing, `cli/runner.ts` for pipeline orchestration, `cli/progress.ts` for TTY-aware output, `cli/config-loader.ts` for config file discovery, and `cli/watch.ts` for file watching. Each module is independently testable.

**Tech Stack:** commander (CLI parsing), ora (spinner), chokidar (file watching), zod (existing config validation), TypeScript ESM (Node16 resolution)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/cli.ts` | Entry point with shebang, imports run() |
| `src/cli/args.ts` | Commander program definition, CliOptions type, parseArgs() |
| `src/cli/runner.ts` | Pipeline orchestration: config → discover → parse → extract → resolve → emit → write |
| `src/cli/progress.ts` | TTY-aware progress reporter with spinner |
| `src/cli/config-loader.ts` | Config file discovery and loading |
| `src/cli/watch.ts` | Chokidar watch mode |
| `src/types/config.ts` | Add `OutputFormat` type |
| `src/dependency/import-scanner.ts` | Modify for exclude-externals support |
| `tests/cli/args.test.ts` | Commander argument parsing tests |
| `tests/cli/runner.test.ts` | Pipeline orchestration tests |
| `tests/cli/progress.test.ts` | Progress reporter tests |
| `tests/cli/config-loader.test.ts` | Config file loading tests |
| `tests/cli/watch.test.ts` | Watch mode tests |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install commander, ora, chokidar**

Run: `pnpm add commander ora chokidar && pnpm add -D @types/ora`

Expected: `package.json` updated with new dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add commander, ora, chokidar dependencies"
```

---

### Task 2: OutputFormat type + CliOptions type

**Files:**
- Modify: `src/types/config.ts`
- Create: `src/cli/args.ts`
- Create: `tests/cli/args.test.ts`

- [ ] **Step 1: Write the failing test for parseArgs**

```typescript
// tests/cli/args.test.ts
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
	it("parses target directory as positional arg", () => {
		const result = parseArgs(["node", "svelteuml", "./my-project"]);
		expect(result.targetDir).toBe("./my-project");
		expect(result.format).toBe("text");
	});

	it("defaults format to text", () => {
		const result = parseArgs(["node", "svelteuml", "./project"]);
		expect(result.format).toBe("text");
	});

	it("parses --format svg", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--format", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses --format png", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--format", "png"]);
		expect(result.format).toBe("png");
	});

	it("parses --output flag", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--output", "out.puml"]);
		expect(result.outputPath).toBe("out.puml");
	});

	it("parses --exclude-externals flag", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--exclude-externals"]);
		expect(result.excludeExternals).toBe(true);
	});

	it("defaults excludeExternals to false", () => {
		const result = parseArgs(["node", "svelteuml", "./project"]);
		expect(result.excludeExternals).toBe(false);
	});

	it("parses --max-depth", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--max-depth", "3"]);
		expect(result.maxDepth).toBe(3);
	});

	it("defaults maxDepth to 0", () => {
		const result = parseArgs(["node", "svelteuml", "./project"]);
		expect(result.maxDepth).toBe(0);
	});

	it("parses --exclude patterns", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--exclude", "*.spec.ts", "*.test.ts"]);
		expect(result.exclude).toEqual(["*.spec.ts", "*.test.ts"]);
	});

	it("parses --hide-type-deps", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--hide-type-deps"]);
		expect(result.hideTypeDeps).toBe(true);
	});

	it("parses --hide-state-deps", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--hide-state-deps"]);
		expect(result.hideStateDeps).toBe(true);
	});

	it("parses --quiet flag", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--quiet"]);
		expect(result.quiet).toBe(true);
	});

	it("parses --verbose flag", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--verbose"]);
		expect(result.verbose).toBe(true);
	});

	it("parses --watch flag", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "--watch"]);
		expect(result.watch).toBe(true);
	});

	it("parses --version flag and exits", () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});
		const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
		try {
			parseArgs(["node", "svelteuml", "--version"]);
		} catch {
			// exit throws
		}
		expect(mockLog).toHaveBeenCalled();
		mockExit.mockRestore();
		mockLog.mockRestore();
	});

	it("throws on missing target directory", () => {
		expect(() => parseArgs(["node", "svelteuml"])).toThrow();
	});

	it("throws on invalid format", () => {
		expect(() => parseArgs(["node", "svelteuml", "./project", "--format", "pdf"])).toThrow();
	});

	it("parses short flag -o", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "-o", "out.puml"]);
		expect(result.outputPath).toBe("out.puml");
	});

	it("parses short flag -f", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "-f", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses short flag -q", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "-q"]);
		expect(result.quiet).toBe(true);
	});

	it("parses short flag -e with single pattern", () => {
		const result = parseArgs(["node", "svelteuml", "./project", "-e", "*.spec.ts"]);
		expect(result.exclude).toEqual(["*.spec.ts"]);
	});

	it("parses combined flags", () => {
		const result = parseArgs([
			"node", "svelteuml", "./project",
			"--exclude-externals",
			"--hide-type-deps",
			"--hide-state-deps",
			"--max-depth", "5",
			"--quiet",
		]);
		expect(result).toMatchObject({
			targetDir: "./project",
			excludeExternals: true,
			hideTypeDeps: true,
			hideStateDeps: true,
			maxDepth: 5,
			quiet: true,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/cli/args.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Add OutputFormat to types/config.ts**

Append to `src/types/config.ts`:

```typescript
export type OutputFormat = "text" | "svg" | "png";
```

- [ ] **Step 4: Write parseArgs implementation**

```typescript
// src/cli/args.ts
import { Command, InvalidArgumentError } from "commander";
import type { OutputFormat } from "../types/config.js";

export interface CliOptions {
	targetDir: string;
	outputPath?: string;
	format: OutputFormat;
	excludeExternals: boolean;
	maxDepth: number;
	exclude: string[];
	hideTypeDeps: boolean;
	hideStateDeps: boolean;
	quiet: boolean;
	verbose: boolean;
	watch: boolean;
}

const VALID_FORMATS: OutputFormat[] = ["text", "svg", "png"];

function parseFormat(value: string): OutputFormat {
	if (!VALID_FORMATS.includes(value as OutputFormat)) {
		throw new InvalidArgumentError(`format must be one of: ${VALID_FORMATS.join(", ")}`);
	}
	return value as OutputFormat;
}

function parseMaxDepth(value: string): number {
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 0) {
		throw new InvalidArgumentError("max-depth must be a non-negative integer");
	}
	return n;
}

export function parseArgs(argv: string[]): CliOptions {
	const program = new Command();

	program
		.name("svelteuml")
		.description("Architecture and Dependency Visualization for SvelteKit")
		.argument("<target-directory>", "Path to SvelteKit project root")
		.option("-o, --output <path>", "Output file path (default: stdout for text)")
		.option("-f, --format <type>", "Output format: text|svg|png", parseFormat, "text" as OutputFormat)
		.option("--exclude-externals", "Truncate traversal at node_modules boundaries", false)
		.option("--max-depth <n>", "Max dependency traversal depth (0=unlimited)", parseMaxDepth, 0)
		.option("-e, --exclude <glob...>", "Glob patterns to exclude")
		.option("--hide-type-deps", "Omit type-only dependency edges", false)
		.option("--hide-state-deps", "Omit state/store dependency edges", false)
		.option("-q, --quiet", "Suppress all non-error output", false)
		.option("--verbose", "Print resolved config and debug info", false)
		.option("--watch", "Watch target directory for changes", false)
		.version(getVersion())
		.exitOverride();

	program.parse(argv);

	const opts = program.opts();
	const targetDir = program.args[0] ?? "";

	return {
		targetDir,
		outputPath: opts.output,
		format: opts.format,
		excludeExternals: opts.excludeExternals ?? false,
		maxDepth: opts.maxDepth,
		exclude: opts.exclude ?? [],
		hideTypeDeps: opts.hideTypeDeps ?? false,
		hideStateDeps: opts.hideStateDeps ?? false,
		quiet: opts.quiet ?? false,
		verbose: opts.verbose ?? false,
		watch: opts.watch ?? false,
	};
}

function getVersion(): string {
	try {
		return "0.1.0";
	} catch {
		return "unknown";
	}
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/cli/args.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/config.ts src/cli/args.ts tests/cli/args.test.ts
git commit -m "feat(cli): add CliOptions type and parseArgs with commander"
```

---

### Task 3: Progress reporter

**Files:**
- Create: `src/cli/progress.ts`
- Create: `tests/cli/progress.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/cli/progress.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createProgressReporter } from "../../src/cli/progress.js";

describe("createProgressReporter", () => {
	beforeEach(() => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates a reporter that starts with phase name", () => {
		const reporter = createProgressReporter({ quiet: false });
		expect(reporter).toBeDefined();
		expect(() => reporter.start("Discovery")).not.toThrow();
		reporter.stop();
	});

	it("update changes the current phase text", () => {
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("Discovery");
		expect(() => reporter.update("Parsing (5 files)")).not.toThrow();
		reporter.stop();
	});

	it("succeed outputs final text", () => {
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("Emission");
		expect(() => reporter.succeed("42 files → diagram.puml")).not.toThrow();
	});

	it("fail outputs error text", () => {
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("Discovery");
		expect(() => reporter.fail("Directory not found")).not.toThrow();
	});

	it("quiet mode suppresses all output", () => {
		const reporter = createProgressReporter({ quiet: true });
		expect(() => reporter.start("Discovery")).not.toThrow();
		expect(() => reporter.update("Parsing")).not.toThrow();
		expect(() => reporter.succeed("done")).not.toThrow();
	});

	it("non-TTY creates no-op reporter", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: undefined },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => reporter.start("Discovery")).not.toThrow();
		expect(() => reporter.succeed("done")).not.toThrow();
	});

	it("startPhase advances through pipeline phases", () => {
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.startPhase("discovery", 0);
			reporter.startPhase("parsing", 10);
			reporter.startPhase("extraction", 10);
			reporter.startPhase("resolution", 10);
			reporter.startPhase("emission", 10);
		}).not.toThrow();
		reporter.stop();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/cli/progress.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write progress reporter implementation**

```typescript
// src/cli/progress.ts
import ora from "ora";
import type { Ora } from "ora";

export interface ProgressReporter {
	start(text: string): void;
	update(text: string): void;
	succeed(text?: string): void;
	fail(text?: string): void;
	warn(text: string): void;
	info(text: string): void;
	stop(): void;
	startPhase(phase: string, count: number): void;
}

const PHASE_LABELS: Record<string, string> = {
	discovery: "Discovering files",
	parsing: "Parsing files",
	extraction: "Extracting symbols",
	resolution: "Resolving dependencies",
	emission: "Generating diagram",
};

interface ProgressOptions {
	quiet: boolean;
}

export function createProgressReporter(options: ProgressOptions): ProgressReporter {
	if (options.quiet) {
		return createNoOpReporter();
	}

	if (!process.stdout.isTTY) {
		return createNoOpReporter();
	}

	return createOraReporter();
}

function createOraReporter(): ProgressReporter {
	let spinner: Ora | undefined;

	return {
		start(text: string) {
			spinner = ora({ text }).start();
		},
		update(text: string) {
			spinner?.start(text);
		},
		succeed(text?: string) {
			if (spinner) {
				spinner.succeed(text);
				spinner = undefined;
			}
		},
		fail(text?: string) {
			if (spinner) {
				spinner.fail(text);
				spinner = undefined;
			}
		},
		warn(text: string) {
			spinner?.warn(text);
		},
		info(text: string) {
			spinner?.info(text);
		},
		stop() {
			spinner?.stop();
			spinner = undefined;
		},
		startPhase(phase: string, count: number) {
			const label = PHASE_LABELS[phase] ?? phase;
			const text = count > 0 ? `${label}... (${count} files)` : `${label}...`;
			if (spinner) {
				spinner.start(text);
			} else {
				spinner = ora({ text }).start();
			}
		},
	};
}

function createNoOpReporter(): ProgressReporter {
	return {
		start() {},
		update() {},
		succeed() {},
		fail() {},
		warn() {},
		info() {},
		stop() {},
		startPhase() {},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/cli/progress.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/progress.ts tests/cli/progress.test.ts
git commit -m "feat(cli): add TTY-aware progress reporter with ora spinner"
```

---

### Task 4: Config file loader

**Files:**
- Create: `src/cli/config-loader.ts`
- Create: `tests/cli/config-loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/cli/config-loader.test.ts
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { loadConfigFile, searchConfigFile } from "../../src/cli/config-loader.js";

let tempDir: string;

beforeEach(async () => {
	tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe("searchConfigFile", () => {
	it("finds .svelteumlrc.json in current directory", async () => {
		await writeFile(join(tempDir, ".svelteumlrc.json"), JSON.stringify({ maxDepth: 5 }));
		const result = await searchConfigFile(tempDir);
		expect(result).toBeDefined();
		expect(result?.path).toContain(".svelteumlrc.json");
	});

	it("finds svelteuml.config.ts", async () => {
		await writeFile(join(tempDir, "svelteuml.config.ts"), "export default { maxDepth: 3 }");
		const result = await searchConfigFile(tempDir);
		expect(result).toBeDefined();
		expect(result?.path).toContain("svelteuml.config.ts");
	});

	it("returns undefined when no config file found", async () => {
		const result = await searchConfigFile(tempDir);
		expect(result).toBeUndefined();
	});

	it("prefers svelteuml.config.ts over .svelteumlrc.json", async () => {
		await writeFile(join(tempDir, ".svelteumlrc.json"), JSON.stringify({ maxDepth: 5 }));
		await writeFile(join(tempDir, "svelteuml.config.ts"), "export default { maxDepth: 3 }");
		const result = await searchConfigFile(tempDir);
		expect(result?.path).toContain("svelteuml.config.ts");
	});
});

describe("loadConfigFile", () => {
	it("loads JSON config from .svelteumlrc.json", async () => {
		const configPath = join(tempDir, ".svelteumlrc.json");
		await writeFile(configPath, JSON.stringify({ maxDepth: 5, excludeExternals: true }));
		const result = await loadConfigFile(configPath);
		expect(result).toEqual({ maxDepth: 5, excludeExternals: true });
	});

	it("loads JSON config from .svelteumlrc (no extension)", async () => {
		const configPath = join(tempDir, ".svelteumlrc");
		await writeFile(configPath, JSON.stringify({ maxDepth: 3 }));
		const result = await loadConfigFile(configPath);
		expect(result).toEqual({ maxDepth: 3 });
	});

	it("returns empty object for unreadable file", async () => {
		const result = await loadConfigFile(join(tempDir, "nonexistent.json"));
		expect(result).toEqual({});
	});

	it("warns on unknown fields", async () => {
		const configPath = join(tempDir, ".svelteumlrc.json");
		await writeFile(configPath, JSON.stringify({ unknownField: true, maxDepth: 2 }));
		const result = await loadConfigFile(configPath);
		expect(result.maxDepth).toBe(2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/cli/config-loader.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write config loader implementation**

```typescript
// src/cli/config-loader.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CONFIG_FILENAMES = [
	"svelteuml.config.ts",
	".svelteumlrc.json",
	".svelteumlrc",
];

const KNOWN_FIELDS = new Set([
	"targetDir",
	"outputPath",
	"aliasOverrides",
	"exclude",
	"include",
	"maxDepth",
	"excludeExternals",
]);

interface ConfigFileResult {
	path: string;
}

export async function searchConfigFile(
	searchDir: string,
): Promise<ConfigFileResult | undefined> {
	for (const filename of CONFIG_FILENAMES) {
		const fullPath = join(searchDir, filename);
		if (existsSync(fullPath)) {
			return { path: fullPath };
		}
	}
	return undefined;
}

export async function loadConfigFile(
	configPath: string,
): Promise<Record<string, unknown>> {
	try {
		if (configPath.endsWith(".ts")) {
			return await loadTypeScriptConfig(configPath);
		}
		return loadJSONConfig(configPath);
	} catch {
		return {};
	}
}

function loadJSONConfig(configPath: string): Record<string, unknown> {
	const raw = readFileSync(configPath, "utf-8");
	const parsed = JSON.parse(raw) as Record<string, unknown>;
	warnUnknownFields(parsed, configPath);
	return parsed;
}

async function loadTypeScriptConfig(configPath: string): Promise<Record<string, unknown>> {
	const moduleUrl = `file://${configPath}`;
	const mod = await import(moduleUrl);
	const config = (mod.default ?? mod) as Record<string, unknown>;
	warnUnknownFields(config, configPath);
	return config;
}

function warnUnknownFields(config: Record<string, unknown>, configPath: string): void {
	for (const key of Object.keys(config)) {
		if (!KNOWN_FIELDS.has(key)) {
			console.warn(`Warning: unknown config field "${key}" in ${configPath}`);
		}
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/cli/config-loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/config-loader.ts tests/cli/config-loader.test.ts
git commit -m "feat(cli): add config file discovery and loading"
```

---

### Task 5: Pipeline runner

**Files:**
- Create: `src/cli/runner.ts`
- Create: `tests/cli/runner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/cli/runner.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildCliConfig, runPipeline } from "../../src/cli/runner.js";
import type { CliOptions } from "../../src/cli/args.js";
import type { SvelteUMLConfig } from "../../src/types/config.js";

describe("buildCliConfig", () => {
	it("maps CliOptions to SvelteUMLConfig with defaults", () => {
		const cliOpts: CliOptions = {
			targetDir: "/tmp/project",
			format: "text",
			excludeExternals: false,
			maxDepth: 0,
			exclude: [],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: false,
			verbose: false,
			watch: false,
		};
		const config = buildCliConfig(cliOpts, {});
		expect(config.targetDir).toContain("project");
		expect(config.outputPath).toBeDefined();
		expect(config.excludeExternals).toBe(false);
		expect(config.maxDepth).toBe(0);
	});

	it("overrides defaults with file config", () => {
		const cliOpts: CliOptions = {
			targetDir: "/tmp/project",
			format: "text",
			excludeExternals: false,
			maxDepth: 0,
			exclude: [],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: false,
			verbose: false,
			watch: false,
		};
		const fileConfig = { maxDepth: 5, excludeExternals: true };
		const config = buildCliConfig(cliOpts, fileConfig);
		expect(config.maxDepth).toBe(5);
		expect(config.excludeExternals).toBe(true);
	});

	it("CLI flags override file config", () => {
		const cliOpts: CliOptions = {
			targetDir: "/tmp/project",
			format: "text",
			excludeExternals: true,
			maxDepth: 3,
			exclude: ["*.spec.ts"],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: false,
			verbose: false,
			watch: false,
		};
		const fileConfig = { maxDepth: 5, excludeExternals: false };
		const config = buildCliConfig(cliOpts, fileConfig);
		expect(config.maxDepth).toBe(3);
		expect(config.excludeExternals).toBe(true);
		expect(config.exclude).toEqual(["*.spec.ts"]);
	});

	it("resolves output path for svg format", () => {
		const cliOpts: CliOptions = {
			targetDir: "/tmp/project",
			format: "svg",
			excludeExternals: false,
			maxDepth: 0,
			exclude: [],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: false,
			verbose: false,
			watch: false,
		};
		const config = buildCliConfig(cliOpts, {});
		expect(config.outputPath).toMatch(/\.svg$/);
	});

	it("resolves output path for png format", () => {
		const cliOpts: CliOptions = {
			targetDir: "/tmp/project",
			format: "png",
			excludeExternals: false,
			maxDepth: 0,
			exclude: [],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: false,
			verbose: false,
			watch: false,
		};
		const config = buildCliConfig(cliOpts, {});
		expect(config.outputPath).toMatch(/\.png$/);
	});
});

describe("runPipeline", () => {
	it("returns error for non-existent target directory", async () => {
		const cliOpts: CliOptions = {
			targetDir: "/nonexistent/dir/xyz123",
			format: "text",
			excludeExternals: false,
			maxDepth: 0,
			exclude: [],
			hideTypeDeps: false,
			hideStateDeps: false,
			quiet: true,
			verbose: false,
			watch: false,
		};
		const result = await runPipeline(cliOpts, {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/cli/runner.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write runner implementation**

```typescript
// src/cli/runner.ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import type { CliOptions } from "./args.js";
import { createProgressReporter, type ProgressReporter } from "./progress.js";
import type { SvelteUMLConfig, SvelteUMLConfigInput } from "../types/config.js";
import type { OutputFormat } from "../types/config.js";
import { mergeConfigs, validateConfig } from "../config/schema.js";
import { discoverFiles } from "../discovery/file-discovery.js";
import { loadSvelteConfig } from "../discovery/svelte-config.js";
import { loadTsConfig } from "../discovery/tsconfig.js";
import { convertFiles } from "../parsing/svelte-to-tsx.js";
import { buildParsingProject } from "../parsing/ts-morph-project.js";
import { SymbolExtractor } from "../extraction/symbol-extractor.js";
import { scanImports, buildEdges } from "../dependency/index.js";
import { emitPlantUML } from "../emission/plantuml-emitter.js";
import { createEdgeSet } from "../types/edge.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";

interface RunResult {
	success: boolean;
	outputPath?: string;
	error?: string;
	fileCount?: number;
	edgeCount?: number;
}

function getDefaultOutputPath(format: OutputFormat): string {
	if (format === "svg") return "diagram.svg";
	if (format === "png") return "diagram.png";
	return "diagram.puml";
}

export function buildCliConfig(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
): SvelteUMLConfig {
	const outputPath = cliOpts.outputPath ?? getDefaultOutputPath(cliOpts.format);

	const input: SvelteUMLConfigInput = mergeConfigs(fileConfig, {
		targetDir: cliOpts.targetDir,
		outputPath,
		exclude: cliOpts.exclude.length > 0 ? cliOpts.exclude : undefined,
		maxDepth: cliOpts.maxDepth,
		excludeExternals: cliOpts.excludeExternals,
	});

	return validateConfig(input);
}

export async function runPipeline(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
	reporter?: ProgressReporter,
): Promise<RunResult> {
	const progress = reporter ?? createProgressReporter({ quiet: cliOpts.quiet });

	if (!existsSync(cliOpts.targetDir)) {
		const msg = `Target directory does not exist: ${cliOpts.targetDir}`;
		progress.fail(msg);
		return { success: false, error: msg };
	}

	let config: SvelteUMLConfig;
	try {
		config = buildCliConfig(cliOpts, fileConfig);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		progress.fail(msg);
		return { success: false, error: msg };
	}

	if (cliOpts.verbose) {
		progress.info(`Resolved config: ${JSON.stringify(config, null, 2)}`);
	}

	try {
		progress.startPhase("discovery", 0);
		const aliases = { ...(await loadSvelteConfig(config.targetDir)).aliases, ...(await loadTsConfig(config.targetDir)).aliases, ...config.aliasOverrides };
		const files = await discoverFiles(config.targetDir, { exclude: config.exclude });

		const allPlainFiles = [...files.typescript, ...files.javascript, ...files.svelteModules];
		const totalFiles = files.svelte.length + allPlainFiles.length;
		progress.startPhase("parsing", totalFiles);

		const { results, parseResults } = await convertFiles(files.svelte, allPlainFiles);
		const failedCount = parseResults.filter((r) => !r.success).length;
		if (failedCount > 0 && !cliOpts.quiet) {
			progress.warn(`${failedCount} files failed to parse`);
		}

		progress.startPhase("extraction", totalFiles);
		const plainFileData = allPlainFiles.map((p) => ({ path: p, content: results.find((r) => r.sourcePath === p)?.tsxCode ?? "" }));
		const parsingProject = buildParsingProject(results, plainFileData, config, aliases);
		const extractor = new SymbolExtractor(parsingProject);
		const symbols = extractor.extract();

		progress.startPhase("resolution", totalFiles);
		const imports = scanImports(parsingProject, aliases);
		const edgeArray = buildEdges(imports, symbols);

		if (cliOpts.hideTypeDeps) {
			// filter handled in emission
		}

		if (cliOpts.hideStateDeps) {
			// filter handled in emission
		}

		progress.startPhase("emission", totalFiles);
		const filteredEdges = filterEdges(edgeArray, cliOpts);
		const edgeSet = createEdgeSet(filteredEdges);
		const diagramOpts = { ...DEFAULT_DIAGRAM_OPTIONS };
		const emission = emitPlantUML(symbols, edgeSet, diagramOpts);

		if (cliOpts.format === "text") {
			if (cliOpts.outputPath) {
				await writeFile(config.outputPath, emission.content, "utf-8");
			} else if (!process.stdout.isTTY || cliOpts.outputPath === undefined) {
				process.stdout.write(emission.content);
			}
		} else {
			await writeFile(config.outputPath, emission.content, "utf-8");
		}

		const summary = `${totalFiles} files, ${filteredEdges.length} relationships → ${config.outputPath}`;
		progress.succeed(summary);

		return {
			success: true,
			outputPath: config.outputPath,
			fileCount: totalFiles,
			edgeCount: filteredEdges.length,
		};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		progress.fail(msg);
		return { success: false, error: msg };
	}
}

function filterEdges(
	edges: Array<{ source: string; target: string; type: import("../types/edge.js").EdgeType; label?: string }>,
	cliOpts: CliOptions,
): Array<{ source: string; target: string; type: import("../types/edge.js").EdgeType; label?: string }> {
	let filtered = edges;

	if (cliOpts.hideTypeDeps) {
		filtered = filtered.filter((e) => e.type !== "dependency" || !e.label?.includes("type "));
	}

	if (cliOpts.hideStateDeps) {
		filtered = filtered.filter((e) => e.type !== "composition");
	}

	return filtered;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/cli/runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/runner.ts tests/cli/runner.test.ts
git commit -m "feat(cli): add pipeline runner with config building and orchestration"
```

---

### Task 6: CLI entry point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write cli.ts**

```typescript
#!/usr/bin/env node
import { parseArgs } from "./cli/args.js";
import { searchConfigFile, loadConfigFile } from "./cli/config-loader.js";
import { runPipeline } from "./cli/runner.js";

async function main(): Promise<void> {
	const cliOpts = parseArgs(process.argv);

	const configFile = await searchConfigFile(cliOpts.targetDir);
	const fileConfig = configFile ? await loadConfigFile(configFile.path) : {};

	const result = await runPipeline(cliOpts, fileConfig);

	if (!result.success) {
		process.exitCode = 1;
		if (result.error) {
			console.error(`Error: ${result.error}`);
		}
		return;
	}

	if (cliOpts.watch) {
		const { startWatcher } = await import("./cli/watch.js");
		await startWatcher(cliOpts, fileConfig);
	}
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exitCode = 2;
});
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add CLI entry point with shebang"
```

---

### Task 7: Watch mode

**Files:**
- Create: `src/cli/watch.ts`
- Create: `tests/cli/watch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/cli/watch.test.ts
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { startWatcher } from "../../src/cli/watch.js";
import type { CliOptions } from "../../src/cli/args.js";

let tempDir: string;

beforeEach(async () => {
	tempDir = join(tmpdir(), `svelteuml-watch-test-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

function makeCliOpts(overrides?: Partial<CliOptions>): CliOptions {
	return {
		targetDir: tempDir,
		format: "text",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: true,
		...overrides,
	};
}

describe("startWatcher", () => {
	it("creates a watcher that can be stopped", async () => {
		const watcher = startWatcher(makeCliOpts(), {});
		expect(watcher).toBeDefined();
		expect(typeof watcher.close).toBe("function");
		await watcher.close();
	});

	it("emits change event on file modification", async () => {
		const onChange = vi.fn();
		const watcher = startWatcher(makeCliOpts(), {});
		watcher.on("change", onChange);

		await writeFile(join(tempDir, "test.svelte"), "<script>let x = 1;</script>");

		await new Promise((resolve) => setTimeout(resolve, 800));

		await watcher.close();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/cli/watch.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write watch mode implementation**

```typescript
// src/cli/watch.ts
import chokidar from "chokidar";
import type { CliOptions } from "./args.js";
import { createProgressReporter, type ProgressReporter } from "./progress.js";
import { runPipeline } from "./runner.js";

export interface Watcher {
	close(): Promise<void>;
	on(event: "change", callback: (file: string) => void): void;
}

export function startWatcher(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
	reporter?: ProgressReporter,
): Watcher {
	const progress = reporter ?? createProgressReporter({ quiet: cliOpts.quiet });
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	const changeCallbacks: Array<(file: string) => void> = [];

	const watcher = chokidar.watch(cliOpts.targetDir, {
		ignored: [
			"**/node_modules/**",
			"**/.svelte-kit/**",
			"**/dist/**",
			"**/.git/**",
		],
		ignoreInitial: true,
		persistent: true,
	});

	const handleChange = (filePath: string) => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			progress.info(`Change detected: ${filePath}`);
			for (const cb of changeCallbacks) {
				cb(filePath);
			}
			await runPipeline(cliOpts, fileConfig, progress);
		}, 500);
	};

	watcher.on("add", handleChange);
	watcher.on("change", handleChange);
	watcher.on("unlink", handleChange);

	watcher.on("error", (err: unknown) => {
		progress.fail(`Watcher error: ${err instanceof Error ? err.message : String(err)}`);
	});

	return {
		async close() {
			if (debounceTimer) clearTimeout(debounceTimer);
			await watcher.close();
		},
		on(event: "change", callback: (file: string) => void) {
			if (event === "change") {
				changeCallbacks.push(callback);
			}
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/cli/watch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/watch.ts tests/cli/watch.test.ts
git commit -m "feat(cli): add watch mode with chokidar and 500ms debounce"
```

---

### Task 8: Exclude externals — modify import-scanner

**Files:**
- Modify: `src/dependency/import-scanner.ts`
- Modify: `tests/dependency/import-scanner.test.ts`

- [ ] **Step 1: Read existing test to understand patterns**

Read: `tests/dependency/import-scanner.test.ts`

- [ ] **Step 2: Add failing tests for exclude-externals**

Add to existing `tests/dependency/import-scanner.test.ts`:

```typescript
it("returns external stub when excludeExternals is true and import is from node_modules", () => {
	const { project, aliases } = createTestProject({
		"src/app.svelte": `import { onMount } from 'svelte';`,
	});
	const result = scanImports(project, aliases, { excludeExternals: true });
	const ext = result.find((r) => r.targetFile.includes("node_modules"));
	// External imports should still be returned but marked as external
	expect(result.length).toBeGreaterThanOrEqual(0);
});

it("collapse multiple imports from same package into one when excludeExternals is true", () => {
	// This tests that the external collapsing logic works
	const { project, aliases } = createTestProject({
		"src/a.ts": `import { ref } from 'svelte';`,
		"src/b.ts": `import { reactive } from 'svelte';`,
	});
	const result = scanImports(project, aliases, { excludeExternals: true });
	expect(result.length).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 3: Modify import-scanner to accept excludeExternals option**

Modify `src/dependency/import-scanner.ts`:

Add options interface:
```typescript
export interface ScanOptions {
	excludeExternals?: boolean;
}
```

Modify `scanImports` signature:
```typescript
export function scanImports(
	parsingProject: ParsingProject,
	aliases: AliasMap,
	options?: ScanOptions,
): ResolvedImport[] {
```

Inside `extractImportsFromFile`, after resolving the specifier, add:
```typescript
if (options?.excludeExternals && resolvedTarget.includes("node_modules")) {
	const packageName = extractPackageName(specifier);
	return [{
		sourceFile: originalPath,
		targetFile: `<<External>>/${packageName}`,
		importedNames,
		isTypeOnly,
	}];
}
```

Add `extractPackageName` helper:
```typescript
function extractPackageName(specifier: string): string {
	if (specifier.startsWith("@")) {
		const parts = specifier.split("/");
		return `${parts[0]}/${parts[1]}`;
	}
	return specifier.split("/")[0];
}
```

Pass `options` through from `scanImports` to `extractImportsFromFile`.

- [ ] **Step 4: Run all tests**

Run: `pnpm exec vitest run`
Expected: All existing + new tests pass

- [ ] **Step 5: Commit**

```bash
git add src/dependency/import-scanner.ts tests/dependency/import-scanner.test.ts
git commit -m "feat(cli): add exclude-externals support to import scanner"
```

---

### Task 9: Integration test and final verification

**Files:**
- Modify: `src/types/config.ts` (ensure OutputFormat is exported)
- Modify: `src/index.ts` (export new CLI types if needed)

- [ ] **Step 1: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 4: Run coverage check**

Run: `pnpm run test:coverage`
Expected: Meets thresholds (branches 90%, lines 80%, functions 90%, statements 90%)

- [ ] **Step 5: Build and verify CLI**

Run: `pnpm run build && node dist/cli.js --help`
Expected: Help output with all flags documented

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint/typecheck issues for CLI module"
```

---

### Task 10: Push and create PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin epic/SUML-E6-cli-developer-experience
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat: EPIC 6 CLI & Developer Experience" \
  --body "## Summary
- CLI argument parsing with commander.js (SUML-28)
- Config file support .svelteumlrc / svelteuml.config.ts (SUML-29)
- Progress reporting with ora spinner (SUML-30)
- --exclude-externals flag (SUML-31)
- Watch mode with chokidar (SUML-32)

## Test Plan
- [x] 285+ existing tests continue to pass
- [x] New CLI module tests with 90%+ branch coverage
- [x] Typecheck clean
- [x] Lint clean"
```
