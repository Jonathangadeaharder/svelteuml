import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
	let hashTempDir: string;

	beforeEach(() => {
		hashTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cache-hash-"));
	});

	afterEach(() => {
		fs.rmSync(hashTempDir, { recursive: true, force: true });
	});

	it("matches contentHash for same content", () => {
		const cache = new ConversionCache();
		expect(cache.computeHash("hello")).toBe(contentHash("hello"));
	});

	it("static computeHash returns hash for existing file", async () => {
		const filePath = path.join(hashTempDir, "hash-test.txt");
		fs.writeFileSync(filePath, "test content", "utf-8");
		const result = await ConversionCache.computeHash(filePath);
		expect(result.hash).toBe(contentHash("test content"));
		expect(result.mtimeMs).toBeGreaterThan(0);
	});

	it("static computeHash returns empty hash for nonexistent file", async () => {
		const result = await ConversionCache.computeHash("/nonexistent/file.txt");
		expect(result.hash).toBe("");
		expect(result.mtimeMs).toBe(0);
	});
});

describe("ConversionCache error paths", () => {
	let errTempDir: string;

	beforeEach(() => {
		errTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cache-err-"));
	});

	afterEach(() => {
		fs.rmSync(errTempDir, { recursive: true, force: true });
	});

	it("set falls back to empty hash for nonexistent file", () => {
		const cache = new ConversionCache();
		cache.set("/nonexistent/ghost.svelte", {
			sourcePath: "/nonexistent/ghost.svelte",
			virtualPath: "/nonexistent/ghost.svelte.tsx",
			tsxCode: "code",
			sourceMap: {},
			success: true,
		});
		expect(cache.size).toBe(1);
	});

	it("get returns undefined when cached file is deleted", () => {
		const cache = new ConversionCache();
		const filePath = path.join(errTempDir, "temp.svelte");
		fs.writeFileSync(filePath, "content", "utf-8");
		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "code",
			sourceMap: {},
			success: true,
		});
		fs.unlinkSync(filePath);
		expect(cache.get(filePath)).toBeUndefined();
	});

	it("has returns false when cached file is deleted", () => {
		const cache = new ConversionCache();
		const filePath = path.join(errTempDir, "temp2.svelte");
		fs.writeFileSync(filePath, "content", "utf-8");
		cache.set(filePath, {
			sourcePath: filePath,
			virtualPath: `${filePath}.tsx`,
			tsxCode: "code",
			sourceMap: {},
			success: true,
		});
		fs.unlinkSync(filePath);
		expect(cache.has(filePath)).toBe(false);
	});
});
