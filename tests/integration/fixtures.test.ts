import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CliOptions } from "../../src/cli/args.js";
import { runPipeline } from "../../src/cli/runner.js";

const testOutputDir = join(tmpdir(), "svelteuml-integration-tests");

function makeCliOptions(fixtureName: string, overrides: Partial<CliOptions> = {}): CliOptions {
	const fixtureDir = resolve(import.meta.dirname, `../fixtures/${fixtureName}`);
	mkdirSync(testOutputDir, { recursive: true });
	return {
		subcommand: "generate",
		targetDir: fixtureDir,
		outputPath: join(testOutputDir, `${fixtureName}-output.puml`),
		format: "text",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		excludePatterns: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: false,
		diagram: "class",
		focus: undefined,
		layoutDirection: "top-to-bottom",
		noColor: false,
		...overrides,
	};
}

async function getOutput(
	fixtureName: string,
	overrides: Partial<CliOptions> = {},
): Promise<string> {
	const opts = makeCliOptions(fixtureName, overrides);
	await runPipeline(opts, {});
	return readFileSync(opts.outputPath!, "utf-8");
}

afterEach(() => {
	rmSync(testOutputDir, { recursive: true, force: true });
});

describe("Integration: minimal-sveltekit fixture", () => {
	it("produces valid PlantUML output", async () => {
		const output = await getOutput("minimal-sveltekit");
		expect(output).toContain("@startuml");
		expect(output).toContain("@enduml");
	});

	it("contains store definitions", async () => {
		const output = await getOutput("minimal-sveltekit");
		expect(output).toContain("userStore");
		expect(output).toContain("<<store>>");
	});

	it("contains route entries", async () => {
		const output = await getOutput("minimal-sveltekit");
		expect(output).toContain("+page");
		expect(output).toContain("+server");
	});

	it("contains function exports", async () => {
		const output = await getOutput("minimal-sveltekit");
		expect(output).toContain("setUser");
		expect(output).toContain("clearUser");
	});

	it("matches snapshot", async () => {
		const output = await getOutput("minimal-sveltekit");
		expect(output).toMatchSnapshot();
	});
});

describe("Integration: group-layouts fixture", () => {
	it("produces valid PlantUML output", async () => {
		const output = await getOutput("group-layouts");
		expect(output).toContain("@startuml");
		expect(output).toContain("@enduml");
	});

	it("contains auth group routes", async () => {
		const output = await getOutput("group-layouts");
		expect(output).toContain("+page");
		expect(output).toContain("+layout");
	});

	it("matches snapshot", async () => {
		const output = await getOutput("group-layouts");
		expect(output).toMatchSnapshot();
	});
});

describe("Integration: svelte-stores fixture", () => {
	it("produces valid PlantUML output", async () => {
		const output = await getOutput("svelte-stores");
		expect(output).toContain("@startuml");
		expect(output).toContain("@enduml");
	});

	it("contains store definitions", async () => {
		const output = await getOutput("svelte-stores");
		expect(output).toContain("<<store>>");
	});

	it("contains function exports", async () => {
		const output = await getOutput("svelte-stores");
		expect(output).toContain("<<function>>");
	});

	it("matches snapshot", async () => {
		const output = await getOutput("svelte-stores");
		expect(output).toMatchSnapshot();
	});
});

describe("Integration: sveltekit-synthetic fixture", () => {
	it("produces valid PlantUML output", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("@startuml");
		expect(output).toContain("@enduml");
	});

	it("contains route pattern entries", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("+page");
		expect(output).toContain("+layout");
		expect(output).toContain("+error");
		expect(output).toContain("+server");
	});

	it("contains dynamic and rest param routes", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("[id]");
		expect(output).toContain("[...slug]");
	});

	it("contains route groups", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("auth");
		expect(output).toContain("login");
		expect(output).toContain("register");
	});

	it("contains component definitions", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("Card");
		expect(output).toContain("Header");
	});

	it("contains store definitions", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("<<store>>");
	});

	it("contains server exports", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toContain("GET");
		expect(output).toContain("POST");
	});

	it("matches snapshot", async () => {
		const output = await getOutput("sveltekit-synthetic");
		expect(output).toMatchSnapshot();
	});
});

describe("Integration: synthetic fixture", () => {
	it("produces valid PlantUML output", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("@startuml");
		expect(output).toContain("@enduml");
	});

	it("contains component definitions", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("Button");
		expect(output).toContain("Card");
	});

	it("contains store definitions", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("count");
		expect(output).toContain("doubleCount");
		expect(output).toContain("<<store>>");
	});

	it("contains utility functions", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("greet");
		expect(output).toContain("formatPrice");
		expect(output).toContain("<<function>>");
	});

	it("contains server endpoint exports", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("GET");
		expect(output).toContain("POST");
	});

	it("contains route patterns", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("+page");
		expect(output).toContain("+layout");
		expect(output).toContain("+server");
	});

	it("contains stereotype tags", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("<<component>>");
		expect(output).toContain("<<store>>");
		expect(output).toContain("<<function>>");
		expect(output).toContain("<<endpoint>>");
	});

	it("detects prop definitions", async () => {
		const output = await getOutput("synthetic");
		expect(output).toContain("label");
		expect(output).toContain("title");
	});

	it("matches snapshot", async () => {
		const output = await getOutput("synthetic");
		expect(output).toMatchSnapshot();
	});
});

describe("Integration: cross-fixture validation", () => {
	it("all fixtures produce valid PlantUML with @startuml/@enduml", {
		timeout: 30_000,
	}, async () => {
		const fixtures = ["minimal-sveltekit", "group-layouts", "svelte-stores", "sveltekit-synthetic", "synthetic"];
		for (const fixture of fixtures) {
			const output = await getOutput(fixture);
			expect(output, `${fixture} should contain @startuml`).toContain("@startuml");
			expect(output, `${fixture} should contain @enduml`).toContain("@enduml");
		}
	});
});
