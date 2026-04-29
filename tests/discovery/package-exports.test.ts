import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePackageExports } from "../../src/discovery/package-exports.js";

describe("resolvePackageExports", () => {
	let rootDir: string;

	beforeEach(() => {
		rootDir = join(os.tmpdir(), `pkg-exports-test-${Date.now()}`);
		mkdirSync(rootDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(rootDir, { recursive: true, force: true });
	});

	it("returns null when no package.json exists", () => {
		const result = resolvePackageExports(rootDir);
		expect(result).toBeNull();
	});

	it("returns null when package.json has no exports field", () => {
		writeFileSync(join(rootDir, "package.json"), JSON.stringify({ name: "my-lib" }));
		const result = resolvePackageExports(rootDir);
		expect(result).toBeNull();
	});

	it("resolves simple string exports", () => {
		writeFileSync(
			join(rootDir, "package.json"),
			JSON.stringify({ name: "my-lib", exports: "./src/index.ts" }),
		);
		const result = resolvePackageExports(rootDir);
		expect(result).not.toBeNull();
		expect(result?.exports).toHaveLength(1);
		expect(result?.exports[0]?.exportName).toBe(".");
		expect(result?.exports[0]?.resolvedPath).toBe(join(rootDir, "src/index.ts"));
		expect(result?.exports[0]?.conditions).toEqual(["default"]);
	});

	it("resolves conditional exports preferring svelte over default", () => {
		writeFileSync(
			join(rootDir, "package.json"),
			JSON.stringify({
				name: "my-lib",
				exports: {
					".": {
						svelte: "./src/index.svelte.ts",
						default: "./dist/index.js",
					},
				},
			}),
		);
		const result = resolvePackageExports(rootDir);
		expect(result).not.toBeNull();
		expect(result?.exports).toHaveLength(1);
		expect(result?.exports[0]?.conditions).toEqual(["svelte"]);
		expect(result?.exports[0]?.resolvedPath).toBe(join(rootDir, "src/index.svelte.ts"));
	});

	it("resolves multiple export entries", () => {
		writeFileSync(
			join(rootDir, "package.json"),
			JSON.stringify({
				name: "my-lib",
				exports: {
					".": "./src/index.ts",
					"./utils": "./src/utils.ts",
					"./components/Button.svelte": "./src/components/Button.svelte",
				},
			}),
		);
		const result = resolvePackageExports(rootDir);
		expect(result).not.toBeNull();
		expect(result?.exports).toHaveLength(3);
		const names = result?.exports.map((e) => e.exportName);
		expect(names).toContain(".");
		expect(names).toContain("./utils");
		expect(names).toContain("./components/Button.svelte");
	});

	it("handles nested conditional objects correctly", () => {
		writeFileSync(
			join(rootDir, "package.json"),
			JSON.stringify({
				name: "my-lib",
				exports: {
					".": {
						import: "./dist/esm/index.js",
						require: "./dist/cjs/index.js",
					},
				},
			}),
		);
		const result = resolvePackageExports(rootDir);
		expect(result).not.toBeNull();
		expect(result?.exports).toHaveLength(1);
		expect(result?.exports[0]?.conditions).toEqual(["import"]);
		expect(result?.exports[0]?.resolvedPath).toBe(join(rootDir, "dist/esm/index.js"));
	});

	it("returns null for malformed package.json", () => {
		writeFileSync(join(rootDir, "package.json"), "not valid json {{{");
		const result = resolvePackageExports(rootDir);
		expect(result).toBeNull();
	});

	it("returns projectRoot in result", () => {
		const pkg = { exports: { ".": "./index.ts" } };
		writeFileSync(join(rootDir, "package.json"), JSON.stringify(pkg));
		const result = resolvePackageExports(rootDir);
		expect(result?.projectRoot).toBe(rootDir);
	});
});
