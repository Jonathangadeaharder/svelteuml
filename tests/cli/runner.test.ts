import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { buildCliConfig, filterEdges, runPipeline } from "../../src/cli/runner.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("../../src/discovery/file-discovery.js", () => ({
	discoverFiles: vi.fn().mockResolvedValue({
		svelte: [],
		typescript: [],
		javascript: [],
		svelteModules: [],
		exportedFiles: new Set(),
	}),
}));

vi.mock("../../src/discovery/svelte-config.js", () => ({
	loadSvelteConfig: vi.fn().mockResolvedValue({ aliases: {} }),
}));

vi.mock("../../src/discovery/tsconfig.js", () => ({
	loadTsConfig: vi.fn().mockResolvedValue({ aliases: {} }),
}));

vi.mock("../../src/parsing/svelte-to-tsx.js", () => ({
	convertFiles: vi.fn().mockResolvedValue({
		results: [],
		parseResults: [],
	}),
}));

vi.mock("../../src/parsing/ts-morph-project.js", () => ({
	buildParsingProject: vi.fn().mockReturnValue({
		getProject: vi.fn().mockReturnValue({
			getSourceFile: vi.fn().mockReturnValue(undefined),
		}),
	}),
}));

vi.mock("../../src/extraction/symbol-extractor.js", () => ({
	SymbolExtractor: vi.fn().mockImplementation(() => ({
		extract: vi.fn().mockReturnValue({
			classes: [],
			functions: [],
			stores: [],
			props: [],
			exports: [],
			routes: [],
			components: [],
		}),
	})),
}));

vi.mock("../../src/dependency/index.js", () => ({
	scanImports: vi.fn().mockReturnValue([]),
	buildEdges: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/dependency/reactive-tracker.js", () => ({
	trackReactiveDependencies: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/emission/plantuml-emitter.js", () => ({
	emitPlantUML: vi.fn().mockReturnValue({ content: "@startuml\n@enduml" }),
}));

import { existsSync, writeFileSync } from "node:fs";

const mockedExistsSync = vi.mocked(existsSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

function makeCliOpts(overrides: Partial<CliOptions> = {}): CliOptions {
	return {
		targetDir: "/tmp/project",
		outputPath: undefined,
		format: "text",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: false,
		...overrides,
	};
}

describe("src/cli/runner.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedExistsSync.mockReturnValue(true);
	});

	describe("buildCliConfig", () => {
		it("maps CliOptions to SvelteUMLConfig with defaults", () => {
			const cliOpts = makeCliOpts();
			const result = buildCliConfig(cliOpts, {});

			expect(result.targetDir).toBe(resolve("/tmp/project"));
			expect(result.outputPath).toBe(resolve("diagram.puml"));
			expect(result.excludeExternals).toBe(false);
			expect(result.maxDepth).toBe(0);
		});

		it("file config overrides defaults", () => {
			const cliOpts = makeCliOpts();
			const fileConfig = { maxDepth: 5, excludeExternals: true, exclude: ["**/*.test.ts"] };
			const result = buildCliConfig(cliOpts, fileConfig);

			expect(result.maxDepth).toBe(5);
			expect(result.excludeExternals).toBe(true);
			expect(result.exclude).toEqual(["**/*.test.ts"]);
		});

		it("CLI flags override file config", () => {
			const cliOpts = makeCliOpts({ maxDepth: 3, exclude: ["**/*.spec.ts"] });
			const fileConfig = { maxDepth: 5 };
			const result = buildCliConfig(cliOpts, fileConfig);

			expect(result.maxDepth).toBe(3);
			expect(result.exclude).toEqual(["**/*.spec.ts"]);
		});

		it("SVG format gets .svg default output path", () => {
			const cliOpts = makeCliOpts({ format: "svg" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("diagram.svg"));
		});

		it("PNG format gets .png default output path", () => {
			const cliOpts = makeCliOpts({ format: "png" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("diagram.png"));
		});

		it("uses CLI outputPath when provided", () => {
			const cliOpts = makeCliOpts({ outputPath: "/custom/output.puml" });
			const result = buildCliConfig(cliOpts, {});

			expect(result.outputPath).toBe(resolve("/custom/output.puml"));
		});

		it("sets maxDepth from CLI when non-zero", () => {
			const cliOpts = makeCliOpts({ maxDepth: 7 });
			const result = buildCliConfig(cliOpts, {});

			expect(result.maxDepth).toBe(7);
		});

		it("sets excludeExternals from CLI when true", () => {
			const cliOpts = makeCliOpts({ excludeExternals: true });
			const result = buildCliConfig(cliOpts, {});

			expect(result.excludeExternals).toBe(true);
		});
	});

	describe("filterEdges", () => {
		it("filters type-labeled edges when hideTypeDeps is true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: true, hideStateDeps: false });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});

		it("filters store-labeled edges when hideStateDeps is true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "store" },
				{ source: "c", target: "d", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: false, hideStateDeps: true });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});

		it("keeps all edges when both flags are false", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "dependency" as const, label: "store" },
			];

			const result = filterEdges(edges, { hideTypeDeps: false, hideStateDeps: false });
			expect(result).toHaveLength(2);
		});

		it("filters both type and store edges when both flags are true", () => {
			const edges = [
				{ source: "a", target: "b", type: "dependency" as const, label: "type" },
				{ source: "c", target: "d", type: "dependency" as const, label: "store" },
				{ source: "e", target: "f", type: "association" as const, label: "import" },
			];

			const result = filterEdges(edges, { hideTypeDeps: true, hideStateDeps: true });
			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe("import");
		});
	});

	describe("runPipeline", () => {
		it("returns error for non-existent target directory", async () => {
			mockedExistsSync.mockReturnValue(false);
			const cliOpts = makeCliOpts({ targetDir: "/nonexistent/path" });

			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
			expect(result.error).toContain("does not exist");
		});

		it("returns error when config validation fails", async () => {
			const cliOpts = makeCliOpts({ maxDepth: 0 });
			const result = await runPipeline(cliOpts, { maxDepth: -1 });

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("uses provided reporter instead of noop", async () => {
			const reporter = {
				start: vi.fn(),
				update: vi.fn(),
				succeed: vi.fn(),
				fail: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				stop: vi.fn(),
				startPhase: vi.fn(),
			};
			const cliOpts = makeCliOpts({ maxDepth: 0 });
			const result = await runPipeline(cliOpts, { maxDepth: -1 }, reporter);

			expect(result.success).toBe(false);
		});

		it("writes file when format is not text or outputPath is set", async () => {
			const cliOpts = makeCliOpts({ format: "text", outputPath: "/tmp/out.puml" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.outputPath).toBe(resolve("/tmp/out.puml"));
			expect(mockedWriteFileSync).toHaveBeenCalledWith(
				resolve("/tmp/out.puml"),
				expect.any(String),
				"utf-8",
			);
		});

		it("writes file for svg format without outputPath", async () => {
			const cliOpts = makeCliOpts({ format: "svg" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.outputPath).toBe(resolve("diagram.svg"));
			expect(mockedWriteFileSync).toHaveBeenCalledWith(
				resolve("diagram.svg"),
				expect.any(String),
				"utf-8",
			);
		});

		it("returns success for text format without outputPath (stdout)", async () => {
			const originalWrite = process.stdout.write;
			process.stdout.write = vi.fn().mockReturnValue(true);

			const cliOpts = makeCliOpts({ format: "text" });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
			expect(result.fileCount).toBe(0);
			expect(mockedWriteFileSync).not.toHaveBeenCalled();

			process.stdout.write = originalWrite;
		});

		it("catches unexpected errors and returns failure", async () => {
			const { discoverFiles } = await import("../../src/discovery/file-discovery.js");
			vi.mocked(discoverFiles).mockRejectedValueOnce(new Error("disk failure"));

			const cliOpts = makeCliOpts();
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(false);
			expect(result.error).toContain("disk failure");
		});

		it("applies focus filtering when focus option is set", async () => {
			const cliOpts = makeCliOpts({ focus: "MyComponent", maxDepth: 2 });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});

		it("applies hideTypeDeps and hideStateDeps filtering", async () => {
			const cliOpts = makeCliOpts({ hideTypeDeps: true, hideStateDeps: true });
			const result = await runPipeline(cliOpts, {});

			expect(result.success).toBe(true);
		});
	});
});
