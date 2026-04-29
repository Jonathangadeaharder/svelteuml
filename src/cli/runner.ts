import { existsSync, writeFileSync } from "node:fs";
import type { SvelteUMLConfigInput } from "../config/schema.js";
import { mergeConfigs, validateConfig } from "../config/schema.js";
import { buildEdges, scanImports } from "../dependency/index.js";
import { discoverFiles } from "../discovery/file-discovery.js";
import { loadSvelteConfig } from "../discovery/svelte-config.js";
import { loadTsConfig } from "../discovery/tsconfig.js";
import { emitPlantUML } from "../emission/plantuml-emitter.js";
import { SymbolExtractor } from "../extraction/symbol-extractor.js";
import { convertFiles } from "../parsing/svelte-to-tsx.js";
import { buildParsingProject } from "../parsing/ts-morph-project.js";
import type { OutputFormat } from "../types/config.js";
import type { Edge } from "../types/edge.js";
import { createEdgeSet } from "../types/edge.js";
import type { SvelteUMLConfig } from "../types/index.js";
import type { CliOptions } from "./args.js";
import type { ProgressReporter } from "./progress.js";

export interface RunResult {
	success: boolean;
	outputPath?: string;
	error?: string;
	fileCount?: number;
	edgeCount?: number;
}

const FORMAT_DEFAULTS: Record<OutputFormat, string> = {
	text: "diagram.puml",
	svg: "diagram.svg",
	png: "diagram.png",
};

function getDefaultOutputPath(format: OutputFormat): string {
	return FORMAT_DEFAULTS[format];
}

export function filterEdges(
	edges: Edge[],
	options: { hideTypeDeps: boolean; hideStateDeps: boolean },
): Edge[] {
	return edges.filter((edge) => {
		if (options.hideTypeDeps && edge.label === "type") return false;
		if (options.hideStateDeps && edge.label === "store") return false;
		return true;
	});
}

export function buildCliConfig(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
): SvelteUMLConfig {
	const outputPath = cliOpts.outputPath ?? getDefaultOutputPath(cliOpts.format);

	const cliMergeArgs: Partial<SvelteUMLConfigInput> = {
		targetDir: cliOpts.targetDir,
		outputPath,
		exclude: cliOpts.exclude,
	};
	if (cliOpts.maxDepth !== 0) cliMergeArgs.maxDepth = cliOpts.maxDepth;
	if (cliOpts.excludeExternals) cliMergeArgs.excludeExternals = cliOpts.excludeExternals;

	const merged = mergeConfigs(fileConfig as Partial<SvelteUMLConfigInput>, cliMergeArgs);

	return validateConfig(merged);
}

export async function runPipeline(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
	reporter?: ProgressReporter,
): Promise<RunResult> {
	const noopReporter: ProgressReporter = {
		start() {},
		update() {},
		succeed() {},
		fail() {},
		warn() {},
		info() {},
		stop() {},
		startPhase() {},
	};
	const r = reporter ?? noopReporter;

	if (!existsSync(cliOpts.targetDir)) {
		return { success: false, error: `Target directory does not exist: ${cliOpts.targetDir}` };
	}

	try {
		let config: SvelteUMLConfig;
		try {
			config = buildCliConfig(cliOpts, fileConfig);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return { success: false, error: message };
		}

		r.startPhase("discovery", 0);
		const discovered = await discoverFiles(config.targetDir, {
			include: config.include,
			exclude: config.exclude,
		});

		const allFiles = [
			...discovered.svelte,
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];
		r.succeed(`Discovered ${allFiles.length} files`);

		const svelteConfig = await loadSvelteConfig(config.targetDir);
		const tsConfig = await loadTsConfig(config.targetDir);

		const aliases: Record<string, string> = {
			...tsConfig.aliases,
			...svelteConfig.aliases,
			...config.aliasOverrides,
		};

		r.startPhase("parsing", allFiles.length);
		const plainFiles = [
			...discovered.typescript,
			...discovered.javascript,
			...discovered.svelteModules,
		];
		const { results: svelteResults, parseResults } = await convertFiles(
			discovered.svelte,
			plainFiles,
		);
		r.succeed(`Parsed ${parseResults.length} files`);

		const successfulResults = svelteResults.filter((res) => res.success);

		const plainFileEntries: Array<{ path: string; content: string }> = [];
		for (const result of successfulResults) {
			if (!result.sourcePath.endsWith(".svelte")) {
				plainFileEntries.push({ path: result.virtualPath, content: result.tsxCode });
			}
		}

		const parsingProject = buildParsingProject(
			successfulResults,
			plainFileEntries,
			config,
			aliases,
		);

		r.startPhase("extraction", 0);
		const extractor = new SymbolExtractor(parsingProject);
		const symbols = extractor.extract();
		r.succeed("Symbols extracted");

		r.startPhase("resolution", 0);
		const imports = scanImports(parsingProject, aliases);
		let edges = buildEdges(imports, symbols);

		edges = filterEdges(edges, {
			hideTypeDeps: cliOpts.hideTypeDeps,
			hideStateDeps: cliOpts.hideStateDeps,
		});

		const edgeSet = createEdgeSet(edges);
		r.succeed(`Resolved ${edges.length} dependencies`);

		r.startPhase("emission", 0);
		const emission = emitPlantUML(symbols, edgeSet);
		r.succeed("Diagram generated");

		if (cliOpts.format === "text" && !cliOpts.outputPath) {
			process.stdout.write(emission.content);
			return {
				success: true,
				fileCount: allFiles.length,
				edgeCount: edges.length,
			};
		}

		writeFileSync(config.outputPath, emission.content, "utf-8");

		return {
			success: true,
			outputPath: config.outputPath,
			fileCount: allFiles.length,
			edgeCount: edges.length,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		r.fail(message);
		return { success: false, error: message };
	}
}
