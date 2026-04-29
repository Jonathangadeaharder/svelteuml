import { Command } from "commander";
import type { OutputFormat } from "../types/config.js";

export interface CliOptions {
	targetDir: string;
	outputPath: string | undefined;
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

const VALID_FORMATS: readonly OutputFormat[] = ["text", "svg", "png"];

function parseFormat(value: string): OutputFormat {
	if (!VALID_FORMATS.includes(value as OutputFormat)) {
		throw new Error(
			`Invalid format: "${value}". Must be one of: ${VALID_FORMATS.join(", ")}`,
		);
	}
	return value as OutputFormat;
}

function parseMaxDepth(value: string): number {
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n < 0) {
		throw new Error(`--max-depth must be a non-negative integer, got: "${value}"`);
	}
	return n;
}

export function parseArgs(argv: string[]): CliOptions {
	const program = new Command()
		.name("svelteuml")
		.version("0.1.0")
		.argument("<target-directory>", "path to the SvelteKit project root")
		.option("-o, --output <path>", "output file path")
		.option(
			"-f, --format <type>",
			"output format (text, svg, png)",
			parseFormat,
			"text" as OutputFormat,
		)
		.option("--exclude-externals", "exclude external dependencies", false)
		.option("--max-depth <n>", "max dependency traversal depth (0 = unlimited)", parseMaxDepth, 0)
		.option("-e, --exclude [glob...]", "glob patterns to exclude", [])
		.option("--hide-type-deps", "hide TypeScript type dependencies", false)
		.option("--hide-state-deps", "hide Svelte store/state dependencies", false)
		.option("-q, --quiet", "suppress all output", false)
		.option("--verbose", "show verbose output", false)
		.option("--watch", "watch for file changes", false)
		.exitOverride();

	program.parse(argv, { from: "user" });

	const opts = program.opts();
	const targetDir = program.processedArgs[0] as string;

	return {
		targetDir,
		outputPath: opts.output as string | undefined,
		format: opts.format as OutputFormat,
		excludeExternals: opts.excludeExternals as boolean,
		maxDepth: opts.maxDepth as number,
		exclude: (opts.exclude as string[] | undefined) ?? [],
		hideTypeDeps: opts.hideTypeDeps as boolean,
		hideStateDeps: opts.hideStateDeps as boolean,
		quiet: opts.quiet as boolean,
		verbose: opts.verbose as boolean,
		watch: opts.watch as boolean,
	};
}
