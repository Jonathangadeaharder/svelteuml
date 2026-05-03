import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
	it("parses target directory positional arg", () => {
		const result = parseArgs(["./src"]);
		expect(result.targetDir).toBe("./src");
	});

	it("defaults format to text", () => {
		const result = parseArgs(["./src"]);
		expect(result.format).toBe("text");
	});

	it("parses --format svg", () => {
		const result = parseArgs(["./src", "--format", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses --format png", () => {
		const result = parseArgs(["./src", "--format", "png"]);
		expect(result.format).toBe("png");
	});

	it("parses --output flag", () => {
		const result = parseArgs(["./src", "--output", "diagram.puml"]);
		expect(result.outputPath).toBe("diagram.puml");
	});

	it("defaults outputPath to undefined", () => {
		const result = parseArgs(["./src"]);
		expect(result.outputPath).toBeUndefined();
	});

	it("defaults excludeExternals to false", () => {
		const result = parseArgs(["./src"]);
		expect(result.excludeExternals).toBe(false);
	});

	it("parses --exclude-externals", () => {
		const result = parseArgs(["./src", "--exclude-externals"]);
		expect(result.excludeExternals).toBe(true);
	});

	it("defaults maxDepth to 0", () => {
		const result = parseArgs(["./src"]);
		expect(result.maxDepth).toBe(0);
	});

	it("parses --max-depth", () => {
		const result = parseArgs(["./src", "--max-depth", "5"]);
		expect(result.maxDepth).toBe(5);
	});

	it("parses --exclude with multiple patterns", () => {
		const result = parseArgs(["./src", "--exclude", "node_modules", "dist", ".svelte-kit"]);
		expect(result.exclude).toEqual(["node_modules", "dist", ".svelte-kit"]);
	});

	it("defaults exclude to empty array", () => {
		const result = parseArgs(["./src"]);
		expect(result.exclude).toEqual([]);
	});

	it("parses --hide-type-deps", () => {
		const result = parseArgs(["./src", "--hide-type-deps"]);
		expect(result.hideTypeDeps).toBe(true);
	});

	it("parses --hide-state-deps", () => {
		const result = parseArgs(["./src", "--hide-state-deps"]);
		expect(result.hideStateDeps).toBe(true);
	});

	it("defaults hideTypeDeps and hideStateDeps to false", () => {
		const result = parseArgs(["./src"]);
		expect(result.hideTypeDeps).toBe(false);
		expect(result.hideStateDeps).toBe(false);
	});

	it("parses --quiet", () => {
		const result = parseArgs(["./src", "--quiet"]);
		expect(result.quiet).toBe(true);
	});

	it("parses --verbose", () => {
		const result = parseArgs(["./src", "--verbose"]);
		expect(result.verbose).toBe(true);
	});

	it("parses --watch", () => {
		const result = parseArgs(["./src", "--watch"]);
		expect(result.watch).toBe(true);
	});

	it("defaults quiet, verbose, watch to false", () => {
		const result = parseArgs(["./src"]);
		expect(result.quiet).toBe(false);
		expect(result.verbose).toBe(false);
		expect(result.watch).toBe(false);
	});

	it("parses short flag -o for output", () => {
		const result = parseArgs(["./src", "-o", "out.puml"]);
		expect(result.outputPath).toBe("out.puml");
	});

	it("parses short flag -f for format", () => {
		const result = parseArgs(["./src", "-f", "svg"]);
		expect(result.format).toBe("svg");
	});

	it("parses short flag -q for quiet", () => {
		const result = parseArgs(["./src", "-q"]);
		expect(result.quiet).toBe(true);
	});

	it("parses short flag -e for exclude", () => {
		const result = parseArgs(["./src", "-e", "node_modules", "dist"]);
		expect(result.exclude).toEqual(["node_modules", "dist"]);
	});

	it("throws on missing target directory", () => {
		expect(() => parseArgs([])).toThrow();
	});

	it("throws on invalid format", () => {
		expect(() => parseArgs(["./src", "--format", "json"])).toThrow();
	});

	it("throws on negative max-depth", () => {
		expect(() => parseArgs(["./src", "--max-depth", "-1"])).toThrow();
	});

	it("combined flags test", () => {
		const result = parseArgs([
			"./project",
			"--output",
			"out.svg",
			"--format",
			"svg",
			"--exclude-externals",
			"--max-depth",
			"3",
			"--exclude",
			"node_modules",
			"--hide-type-deps",
			"--hide-state-deps",
			"--quiet",
			"--verbose",
			"--watch",
		]);
		expect(result.targetDir).toBe("./project");
		expect(result.outputPath).toBe("out.svg");
		expect(result.format).toBe("svg");
		expect(result.excludeExternals).toBe(true);
		expect(result.maxDepth).toBe(3);
		expect(result.exclude).toEqual(["node_modules"]);
		expect(result.hideTypeDeps).toBe(true);
		expect(result.hideStateDeps).toBe(true);
		expect(result.quiet).toBe(true);
		expect(result.verbose).toBe(true);
		expect(result.watch).toBe(true);
	});

	it("defaults diagram to class", () => {
		const result = parseArgs(["./src"]);
		expect(result.diagram).toBe("class");
	});

	it("parses --diagram package", () => {
		const result = parseArgs(["./src", "--diagram", "package"]);
		expect(result.diagram).toBe("package");
	});

	it("parses --diagram class", () => {
		const result = parseArgs(["./src", "-d", "class"]);
		expect(result.diagram).toBe("class");
	});

	it("throws on invalid diagram kind", () => {
		expect(() => parseArgs(["./src", "--diagram", "flowchart"])).toThrow();
	});

	it("parses --focus flag", () => {
		const result = parseArgs(["./src", "--focus", "MyComponent"]);
		expect(result.focus).toBe("MyComponent");
	});

	it("defaults focus to undefined", () => {
		const result = parseArgs(["./src"]);
		expect(result.focus).toBeUndefined();
	});

	it("parses --layout-direction", () => {
		const result = parseArgs(["./src", "--layout-direction", "left-to-right"]);
		expect(result.layoutDirection).toBe("left-to-right");
	});

	it("defaults layoutDirection to top-to-bottom", () => {
		const result = parseArgs(["./src"]);
		expect(result.layoutDirection).toBe("top-to-bottom");
	});

	it("throws on invalid layout direction", () => {
		expect(() => parseArgs(["./src", "--layout-direction", "circular"])).toThrow();
	});

	it("parses --disable-colors flag", () => {
		const result = parseArgs(["./src", "--disable-colors"]);
		expect(result.noColor).toBe(true);
	});

	it("defaults noColor to false", () => {
		const result = parseArgs(["./src"]);
		expect(result.noColor).toBe(false);
	});

	it("parses from real process.argv format (node + script prefix)", () => {
		const argv = ["node", "/usr/bin/svelteuml", "./src", "--verbose"];
		const result = parseArgs(argv);
		expect(result.targetDir).toBe("./src");
		expect(result.verbose).toBe(true);
	});

	it("parses from real process.argv with multiple flags", () => {
		const argv = [
			"node",
			"dist/cli.js",
			"./my-project",
			"--output",
			"diagram.puml",
			"--format",
			"svg",
			"--exclude-externals",
			"--verbose",
		];
		const result = parseArgs(argv);
		expect(result.targetDir).toBe("./my-project");
		expect(result.outputPath).toBe("diagram.puml");
		expect(result.format).toBe("svg");
		expect(result.excludeExternals).toBe(true);
		expect(result.verbose).toBe(true);
	});

	it("parses from Windows process.argv format", () => {
		const argv = [
			"C:\\Program Files\\nodejs\\node.exe",
			"C:\\project\\dist\\cli.js",
			".\\src",
			"--verbose",
		];
		const result = parseArgs(argv);
		expect(result.targetDir).toBe(".\\src");
		expect(result.verbose).toBe(true);
	});
});
