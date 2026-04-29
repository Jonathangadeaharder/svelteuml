import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfigFile, searchConfigFile } from "../../src/cli/config-loader.js";

describe("searchConfigFile", () => {
	let tempDir: string;

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("finds .svelteumlrc.json in directory", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		await writeFile(join(tempDir, ".svelteumlrc.json"), JSON.stringify({ targetDir: "./src" }));

		const result = await searchConfigFile(tempDir);
		expect(result).toBeDefined();
		expect(result!.path).toBe(join(tempDir, ".svelteumlrc.json"));
	});

	it("finds svelteuml.config.ts in directory", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		await writeFile(join(tempDir, "svelteuml.config.ts"), "export default {}");

		const result = await searchConfigFile(tempDir);
		expect(result).toBeDefined();
		expect(result!.path).toBe(join(tempDir, "svelteuml.config.ts"));
	});

	it("returns undefined when no config file found", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });

		const result = await searchConfigFile(tempDir);
		expect(result).toBeUndefined();
	});

	it("prefers svelteuml.config.ts over .svelteumlrc.json when both exist", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		await writeFile(join(tempDir, ".svelteumlrc.json"), JSON.stringify({ targetDir: "./src" }));
		await writeFile(join(tempDir, "svelteuml.config.ts"), "export default {}");

		const result = await searchConfigFile(tempDir);
		expect(result).toBeDefined();
		expect(result!.path).toBe(join(tempDir, "svelteuml.config.ts"));
	});
});

describe("loadConfigFile", () => {
	let tempDir: string;

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("loads JSON from .svelteumlrc.json and returns parsed object", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		const configPath = join(tempDir, ".svelteumlrc.json");
		await writeFile(configPath, JSON.stringify({ targetDir: "./src", maxDepth: 5 }));

		const result = await loadConfigFile(configPath);
		expect(result).toEqual({ targetDir: "./src", maxDepth: 5 });
	});

	it("loads JSON from .svelteumlrc (no extension) and returns parsed object", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		const configPath = join(tempDir, ".svelteumlrc");
		await writeFile(configPath, JSON.stringify({ outputPath: "diagram.puml" }));

		const result = await loadConfigFile(configPath);
		expect(result).toEqual({ outputPath: "diagram.puml" });
	});

	it("returns empty object for nonexistent file", async () => {
		const result = await loadConfigFile("/nonexistent/svelteuml-config-test.json");
		expect(result).toEqual({});
	});

	it("warns on unknown fields", async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		const configPath = join(tempDir, ".svelteumlrc.json");
		await writeFile(configPath, JSON.stringify({ targetDir: "./src", unknownField: "value" }));

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = await loadConfigFile(configPath);

		expect(result).toEqual({ targetDir: "./src", unknownField: "value" });
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknownField"));

		warnSpy.mockRestore();
	});
});
