import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadTsConfig } from "../../src/discovery/tsconfig";
import type { TsConfigResult } from "../../src/types/config";

// Helper to safely create a nested directory
async function ensureDir(p: string) {
	await fs.mkdir(p, { recursive: true });
}

describe("discovery/tsconfig.ts", () => {
	let tmpDir: string;
	let kitDir: string;
	let tsPath: string;
	let kitPath: string;

	beforeEach(async () => {
		// Create a fresh temporary project root for each test
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "svelteuml-tsconfig-"));
		kitDir = path.join(tmpDir, ".svelte-kit");
		tsPath = path.join(tmpDir, "tsconfig.json");
		kitPath = path.join(kitDir, "tsconfig.json");
	});

	afterEach(async () => {
		// Cleanup temporary directory between tests
		try {
			await fs.rm(tmpDir, { recursive: true, force: true });
		} catch {
			// ignore
		}
	});

	it("loads .svelte-kit/tsconfig.json when present (priority over tsconfig.json)", async () => {
		// Setup: both config files exist; .svelte-kit one should win
		await ensureDir(kitDir);
		await fs.writeFile(
			kitPath,
			JSON.stringify({
				compilerOptions: {
					baseUrl: ".",
					paths: {
						"$lib/*": ["src/lib/*"],
					},
				},
			}),
			"utf8",
		);

		await fs.writeFile(
			tsPath,
			JSON.stringify({
				compilerOptions: {
					baseUrl: ".",
					paths: {
						"$lib/*": ["src/alt/*"],
					},
				},
			}),
			"utf8",
		);

		const res: TsConfigResult = await loadTsConfig(tmpDir);

		// Verify priority: .svelte-kit config should be loaded
		expect(res.found).toBe(true);
		expect(res.configPath).toBe(kitPath);
		// Source strips /* from alias and target, resolves relative to baseUrl
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases["$lib"]).toContain("src/lib");
		// baseUrl should resolve relative to the project root
		expect(res.baseUrl).toBe(path.resolve(tmpDir, "."));
	});

	it("loads tsconfig.json when .svelte-kit/tsconfig.json is missing", async () => {
		// Only tsconfig.json exists
		await fs.writeFile(
			tsPath,
			JSON.stringify({
				compilerOptions: {
					baseUrl: ".",
					paths: {
						"$base/*": ["src/base/*"],
					},
				},
			}),
			"utf8",
		);

		const res: TsConfigResult = await loadTsConfig(tmpDir);
		expect(res.found).toBe(true);
		expect(res.configPath).toBe(tsPath);
		expect(res.aliases).toHaveProperty("$base");
		expect(res.aliases["$base"]).toContain("src/base");
	});

	it("returns found=false when neither config exists and baseUrl defaults to project root", async () => {
		// Ensure neither config file exists
		const res: TsConfigResult = await loadTsConfig(tmpDir);
		expect(res.found).toBe(false);
		// When not found, aliases should be empty and baseUrl should default to project root
		expect(res.aliases).toEqual({});
		expect(res.baseUrl).toBe(path.resolve(tmpDir));
	});

	it("handles JSON with comments inside tsconfig (strip comments gracefully)", async () => {
		// Create a kit tsconfig containing comments inline with JSON
		await ensureDir(kitDir);
		await fs.writeFile(
			kitPath,
			`{
        // inline comment line
        "compilerOptions": {
          "baseUrl": ".",
          "paths": {
            "$mod/*": ["src/mod/*"]
          }
        }
        // trailing comment
      }`,
			"utf8",
		);
		const res: TsConfigResult = await loadTsConfig(tmpDir);
		expect(res.found).toBe(true);
		expect(res.configPath).toBe(kitPath);
		expect(res.aliases).toHaveProperty("$mod");
		expect(res.aliases["$mod"]).toContain("src/mod");
	});

	it("resolves multiple aliases from paths", async () => {
		await fs.writeFile(
			tsPath,
			JSON.stringify({
				compilerOptions: {
					baseUrl: ".",
					paths: {
						"$lib/*": ["src/lib/*"],
						"$components/*": ["src/components/*"],
						"$utils/*": ["src/utils/*"],
					},
				},
			}),
			"utf8",
		);

		const res: TsConfigResult = await loadTsConfig(tmpDir);
		expect(res.found).toBe(true);
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases).toHaveProperty("$components");
		expect(res.aliases).toHaveProperty("$utils");
		expect(res.aliases["$lib"]).toContain("src/lib");
		expect(res.aliases["$components"]).toContain("src/components");
		expect(res.aliases["$utils"]).toContain("src/utils");
	});
});
