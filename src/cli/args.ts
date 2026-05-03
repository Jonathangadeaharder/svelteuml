import { Command } from "commander";
import type { OutputFormat } from "../types/config.js";
import type { DiagramKind, LayoutDirection } from "../types/diagram.js";

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
	diagram: DiagramKind;
	focus: string | undefined;
	layoutDirection: LayoutDirection;
	noColor: boolean;
}

const VALID_FORMATS: readonly OutputFormat[] = ["text", "svg", "png"];
const VALID_DIAGRAM_KINDS: readonly DiagramKind[] = ["class", "package"];
const VALID_LAYOUT_DIRECTIONS: readonly LayoutDirection[] = [
	"top-to-bottom",
	"left-to-right",
	"bottom-to-top",
	"right-to-left",
];

function parseFormat(value: string): OutputFormat {
	if (!VALID_FORMATS.includes(value as OutputFormat)) {
		throw new Error(`Invalid format: "${value}". Must be one of: ${VALID_FORMATS.join(", ")}`);
	}
	return value as OutputFormat;
}

function parseDiagramKind(value: string): DiagramKind {
	if (!VALID_DIAGRAM_KINDS.includes(value as DiagramKind)) {
		throw new Error(
			`Invalid diagram kind: "${value}". Must be one of: ${VALID_DIAGRAM_KINDS.join(", ")}`,
		);
	}
	return value as DiagramKind;
}

function parseLayoutDirection(value: string): LayoutDirection {
	if (!VALID_LAYOUT_DIRECTIONS.includes(value as LayoutDirection)) {
		throw new Error(
			`Invalid layout direction: "${value}". Must be one of: ${VALID_LAYOUT_DIRECTIONS.join(", ")}`,
		);
	}
	return value as LayoutDirection;
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
		.option(
			"-d, --diagram <kind>",
			"diagram kind (class, package)",
			parseDiagramKind,
			"class" as DiagramKind,
		)
		.option("--focus <name>", "focus on a specific node and its neighbourhood")
		.option(
			"--layout-direction <dir>",
			"layout direction",
			parseLayoutDirection,
			"top-to-bottom" as LayoutDirection,
		)
		.option("--disable-colors", "disable stereotype color theming", false)
		.option("-q, --quiet", "suppress all output", false)
		.option("--verbose", "show verbose output", false)
		.option("--watch", "watch for file changes", false)
		.exitOverride();

	program.parse(stripNodeArgv(argv), { from: "user" });

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
		diagram: opts.diagram as DiagramKind,
		focus: opts.focus as string | undefined,
		layoutDirection: opts.layoutDirection as LayoutDirection,
		noColor: opts.disableColors as boolean,
		quiet: opts.quiet as boolean,
		verbose: opts.verbose as boolean,
		watch: opts.watch as boolean,
	};
}

function stripNodeArgv(argv: string[]): string[] {
	// If argv looks like process.argv (node binary + script path), strip first 2
	if (argv.length >= 2 && /(?:^|[\\/])node(?:\d+)?(?:\.exe)?$/i.test(argv[0] ?? "")) {
		return argv.slice(2);
	}
	return argv;
}
