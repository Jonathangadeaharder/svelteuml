import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/cli/runner.js";
import type { CliOptions } from "../../src/cli/args.js";

const testOutputDir = join(tmpdir(), "svelteuml-integration-tests");

function makeCliOptions(fixtureName: string, overrides: Partial<CliOptions> = {}): CliOptions {
	const fixtureDir = resolve(import.meta.dirname, `../fixtures/${fixtureName}`);
	mkdirSync(testOutputDir, { recursive: true });
	return {
		targetDir: fixtureDir,
		outputPath: join(testOutputDir, `${fixtureName}-output.puml`),
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

async function getOutput(fixtureName: string, overrides: Partial<CliOptions> = {}): Promise<string> {
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

describe("Integration: cross-fixture validation", () => {
	it("all fixtures produce valid PlantUML with @startuml/@enduml", async () => {
		const fixtures = ["minimal-sveltekit", "group-layouts", "svelte-stores"];
		for (const fixture of fixtures) {
			const output = await getOutput(fixture);
			expect(output, `${fixture} should contain @startuml`).toContain("@startuml");
			expect(output, `${fixture} should contain @enduml`).toContain("@enduml");
		}
	});
});
