import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConversionCache } from "../../src/parsing/cache.js";
import { contentHash } from "../../src/parsing/source-map.js";

describe("ConversionCache", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cache-test-"));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("returns miss for uncached file", () => {
		const cache = new ConversionCache();
		expect(cache.has("/nonexistent.svelte")).toBe(false);
		expect(cache.get("/nonexistent.svelte")).toBeUndefined();
	});

	it("stores and retrieves entries", () => {
		const cache = new ConversionCache();
		const filePath = path.join(tempDir, "Comp.svelte");
		fs.writeFileSync(filePath, "<script>let x = 1;</script>", "utf-8");

		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "generated code",
			sourceMap: {},
			success: true,
		});

		expect(cache.has(filePath)).toBe(true);
		const entry = cache.get(filePath);
		expect(entry?.tsxCode).toBe("generated code");
		expect(entry?.success).toBe(true);
	});

	it("invalidates when file content changes", () => {
		const cache = new ConversionCache();
		const filePath = path.join(tempDir, "Comp.svelte");
		fs.writeFileSync(filePath, "original content", "utf-8");

		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "v1",
			sourceMap: {},
			success: true,
		});

		expect(cache.has(filePath)).toBe(true);

		fs.writeFileSync(filePath, "changed content", "utf-8");
		expect(cache.has(filePath)).toBe(false);
	});

	it("evicts entries by path", () => {
		const cache = new ConversionCache();
		const filePath = path.join(tempDir, "Comp.svelte");
		fs.writeFileSync(filePath, "content", "utf-8");

		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "code",
			sourceMap: {},
			success: true,
		});

		cache.evict(filePath);
		expect(cache.has(filePath)).toBe(false);
	});

	it("clears all entries", () => {
		const cache = new ConversionCache();
		const f1 = path.join(tempDir, "A.svelte");
		const f2 = path.join(tempDir, "B.svelte");
		fs.writeFileSync(f1, "a", "utf-8");
		fs.writeFileSync(f2, "b", "utf-8");

		cache.set(f1, {
			sourcePath: f1,
			virtualPath: `${f1}.tsx`,
			tsxCode: "a",
			sourceMap: {},
			success: true,
		});
		cache.set(f2, {
			sourcePath: f2,
			virtualPath: `${f2}.tsx`,
			tsxCode: "b",
			sourceMap: {},
			success: true,
		});

		expect(cache.size).toBe(2);
		cache.clear();
		expect(cache.size).toBe(0);
	});

	it("tracks size correctly", () => {
		const cache = new ConversionCache();
		expect(cache.size).toBe(0);

		const filePath = path.join(tempDir, "Comp.svelte");
		fs.writeFileSync(filePath, "content", "utf-8");

		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "code",
			sourceMap: {},
			success: true,
		});

		expect(cache.size).toBe(1);
	});
});

describe("ConversionCache computeHash", () => {
	it("matches contentHash for same content", () => {
		const cache = new ConversionCache();
		expect(cache.computeHash("hello")).toBe(contentHash("hello"));
	});
});
