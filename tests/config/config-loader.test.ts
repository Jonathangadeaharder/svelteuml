import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { searchConfigFile, loadConfigFile } from "../../src/cli/config-loader.js";

describe("searchConfigFile", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "svelteuml-config-test-"));
	});

	afterEach(() => {
		const { rmSync } = require("node:fs");
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("finds svelteuml.config.ts", async () => {
		writeFileSync(join(tmpDir, "svelteuml.config.ts"), "export default {}");
		const result = await searchConfigFile(tmpDir);
		expect(result).toBeDefined();
		expect(result!.path).toContain("svelteuml.config.ts");
	});

	it("finds svelteuml.config.js", async () => {
		writeFileSync(join(tmpDir, "svelteuml.config.js"), "export default {}");
		const result = await searchConfigFile(tmpDir);
		expect(result).toBeDefined();
		expect(result!.path).toContain("svelteuml.config.js");
	});

	it("finds svelteuml.config.mjs", async () => {
		writeFileSync(join(tmpDir, "svelteuml.config.mjs"), "export default {}");
		const result = await searchConfigFile(tmpDir);
		expect(result).toBeDefined();
		expect(result!.path).toContain("svelteuml.config.mjs");
	});

	it("returns undefined when no config file exists", async () => {
		const result = await searchConfigFile(tmpDir);
		expect(result).toBeUndefined();
	});

	it("prefers .ts over .js when both exist", async () => {
		writeFileSync(join(tmpDir, "svelteuml.config.js"), "export default {}");
		writeFileSync(join(tmpDir, "svelteuml.config.ts"), "export default {}");
		const result = await searchConfigFile(tmpDir);
		expect(result).toBeDefined();
		expect(result!.path).toContain("svelteuml.config.ts");
	});
});

describe("loadConfigFile", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "svelteuml-config-load-test-"));
	});

	afterEach(() => {
		const { rmSync } = require("node:fs");
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("loads JSON config", async () => {
		const configPath = join(tmpDir, ".svelteumlrc");
		writeFileSync(configPath, JSON.stringify({ targetDir: "/tmp" }));
		const result = await loadConfigFile(configPath);
		expect(result.targetDir).toBe("/tmp");
	});

	it("returns empty object for nonexistent file", async () => {
		const result = await loadConfigFile(join(tmpDir, "nonexistent.ts"));
		expect(result).toEqual({});
	});

	it("loads TypeScript config with groups", async () => {
		const configPath = join(tmpDir, "svelteuml.config.ts");
		writeFileSync(
			configPath,
			`export default {
				groups: [
					{ pattern: "src/lib/components/*", name: "Components" },
					{ pattern: "src/routes/*", name: "Routes" },
				],
			};`,
		);
		const result = await loadConfigFile(configPath);
		expect(result.groups).toBeDefined();
		expect(Array.isArray(result.groups)).toBe(true);
		expect(result.groups).toHaveLength(2);
		expect(result.groups![0]).toEqual({ pattern: "src/lib/components/*", name: "Components" });
		expect(result.groups![1]).toEqual({ pattern: "src/routes/*", name: "Routes" });
	});
});
