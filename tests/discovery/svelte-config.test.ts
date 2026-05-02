import * as fs from "node:fs";
import os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadSvelteConfig } from "../../src/discovery/svelte-config";

// Convert a JS object to a string with unquoted keys (matches real svelte.config format)
function toJSObject(obj: any, indent = 0): string {
	const pad = "  ".repeat(indent);
	const innerPad = "  ".repeat(indent + 1);
	const entries = Object.entries(obj);
	if (entries.length === 0) return "{}";
	const lines = entries.map(([key, val]) => {
		const value =
			typeof val === "object" && val !== null ? toJSObject(val, indent + 1) : JSON.stringify(val);
		return `${innerPad}${key}: ${value}`;
	});
	return `{\n${lines.join(",\n")}\n${pad}}`;
}

// Helper to write a config file in JS format (unquoted keys like real svelte.config.js)
function writeJSConfig(dir: string, obj: any) {
	const cfgPath = path.join(dir, "svelte.config.js");
	const content = `module.exports = ${toJSObject(obj)};\n`;
	fs.writeFileSync(cfgPath, content, "utf8");
}

// Helper to write a config file in MJS format (unquoted keys)
function writeMJSConfig(dir: string, obj: any) {
	const cfgPath = path.join(dir, "svelte.config.mjs");
	const content = `export default ${toJSObject(obj)};\n`;
	fs.writeFileSync(cfgPath, content, "utf8");
}

// Helper to write a config file in TS format (unquoted keys)
function writeTSConfig(dir: string, obj: any) {
	const cfgPath = path.join(dir, "svelte.config.ts");
	const content = `export default ${toJSObject(obj)};\n`;
	fs.writeFileSync(cfgPath, content, "utf8");
}

describe("svelte-config discovery", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-config-test-"));
	});

	afterEach(() => {
		// Clean up temp directory
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("loads from kit.alias when svelte.config.js exists", async () => {
		writeJSConfig(tempDir, {
			kit: {
				alias: {
					$lib: "src/libFromKit",
					$components: "src/componentsFromKit",
				},
			},
		});

		const res = await loadSvelteConfig(tempDir);

		// should be found and path should point to the JS config
		expect(res.found).toBe(true);
		expect(res.configPath?.endsWith("svelte.config.js")).toBe(true);
		// Kit alias should override default and be present
		// and also default alias should be merged as part of result
		expect(res.aliases).toHaveProperty("$lib");
		// Source resolves relative paths against projectRoot, so we check contains
		expect(res.aliases.$lib).toContain("src/libFromKit");
		expect(res.aliases).toHaveProperty("$components");
	});

	it("loads from vite alias when only svelte.config.js exists", async () => {
		writeJSConfig(tempDir, {
			vite: {
				resolve: {
					alias: {
						$lib: "src/libFromVite",
						$viteOnly: "src/vite",
					},
				},
			},
		});

		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.configPath?.endsWith("svelte.config.js")).toBe(true);
		// Vite alias should be picked up
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases.$lib).toContain("src/libFromVite");
		expect(res.aliases).toHaveProperty("$viteOnly");
	});

	it("merges when both kit.alias and vite.resolve.alias exist", async () => {
		writeJSConfig(tempDir, {
			kit: {
				alias: {
					$lib: "src/libFromKit",
					$customKit: "src/kit",
				},
			},
			vite: {
				resolve: {
					alias: {
						$lib: "src/libFromVite",
						$viteOnly: "src/vite",
					},
				},
			},
		});

		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		// JS config should be used (first candidate wins)
		expect(res.configPath?.endsWith("svelte.config.js")).toBe(true);
		// Merge should include both kit and vite aliases
		expect(res.aliases).toHaveProperty("$lib");
		// Kit alias should take precedence for conflicting keys (kit is parsed first)
		expect(res.aliases.$lib).toContain("src/libFromKit");
		expect(res.aliases).toHaveProperty("$viteOnly");
		expect(res.aliases).toHaveProperty("$customKit");
	});

	it("loads default alias when config exists but has no aliases", async () => {
		writeJSConfig(tempDir, {
			kit: {
				alias: {},
			},
		});
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases.$lib).toBe("src/lib");
	});

	it("falls back to default alias when no config file exists", async () => {
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(false);
		// No config path
		expect(res.configPath).toBeUndefined();
		// Default alias must be present
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases.$lib).toBe("src/lib");
		// Should not contain other aliases from config
		expect(Object.keys(res.aliases)).toEqual(["$lib"]);
	});

	it("uses the first existing candidate among svelte.config.js, .mjs, .ts", async () => {
		// Prepare three files with different values; first candidate should win
		writeJSConfig(tempDir, {
			kit: { alias: { $lib: "src/libFromJS" } },
		});
		// Create a MJS with a different alias value
		writeMJSConfig(tempDir, {
			kit: { alias: { $lib: "src/libFromMJS" } },
		});
		// Create a TS with yet another value
		writeTSConfig(tempDir, {
			kit: { alias: { $lib: "src/libFromTS" } },
		});

		const res = await loadSvelteConfig(tempDir);
		// Should pick the JS config first
		expect(res.configPath?.endsWith("svelte.config.js")).toBe(true);
		expect(res.aliases).toHaveProperty("$lib");
		expect(res.aliases.$lib).toContain("src/libFromJS");
	});

	it("normalizes alias paths that start with a leading slash", async () => {
		writeJSConfig(tempDir, {
			kit: { alias: { $special: "/src/special" } },
		});
		const res = await loadSvelteConfig(tempDir);
		expect(res.aliases).toHaveProperty("$special");
		expect(res.aliases.$special).toBe("/src/special");
	});

	it("handles config with escaped quotes in strings", async () => {
		fs.writeFileSync(
			path.join(tempDir, "svelte.config.js"),
			`
module.exports = {
  kit: {
    alias: { "$lib": "src/lib" },
    name: "test\\"value"
  }
};
`,
			"utf8",
		);
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.configPath).toBeDefined();
		expect(res.aliases).toHaveProperty("$lib");
	});

	it("handles config with unbalanced braces gracefully", async () => {
		fs.writeFileSync(
			path.join(tempDir, "svelte.config.js"),
			`
module.exports = {
  kit: {
    alias: { "$lib": "src/lib"
  }
};
`,
			"utf8",
		);
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.configPath).toBeDefined();
		expect(res.aliases).toHaveProperty("$lib");
	});

	it("handles kit block with no closing brace", async () => {
		fs.writeFileSync(
			path.join(tempDir, "svelte.config.js"),
			`module.exports = { kit: { alias: { "$lib": "src/lib" }`,
			"utf8",
		);
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.aliases).toHaveProperty("$lib"); // falls back to default
	});

	it("handles vite block without resolve", async () => {
		writeJSConfig(tempDir, {
			vite: {
				server: { port: 3000 },
			},
		});
		const res = await loadSvelteConfig(tempDir);
		expect(res.found).toBe(true);
		expect(res.aliases).toHaveProperty("$lib"); // default alias
	});
});
