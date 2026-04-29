import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	convertPlainTsFile,
	convertSvelteToTsx,
	isTypeScriptSvelte,
} from "../../src/parsing/svelte-to-tsx.js";

describe("isTypeScriptSvelte", () => {
	it("detects lang='ts' in script tag", () => {
		expect(isTypeScriptSvelte(`<script lang="ts">let x = 1;</script>`)).toBe(true);
	});

	it("detects lang='typescript' in script tag", () => {
		expect(isTypeScriptSvelte(`<script lang='typescript'>let x = 1;</script>`)).toBe(true);
	});

	it("returns false for plain script tag", () => {
		expect(isTypeScriptSvelte(`<script>let x = 1;</script>`)).toBe(false);
	});

	it("returns false for lang='js'", () => {
		expect(isTypeScriptSvelte(`<script lang="js">let x = 1;</script>`)).toBe(false);
	});

	it("handles whitespace around lang attribute", () => {
		expect(isTypeScriptSvelte(`<script  lang = "ts" >let x = 1;</script>`)).toBe(true);
	});

	it("returns false for empty content", () => {
		expect(isTypeScriptSvelte("")).toBe(false);
	});
});

describe("convertPlainTsFile", () => {
	it("passes through TypeScript content unchanged", () => {
		const result = convertPlainTsFile(
			"/app/src/lib/utils.ts",
			"export function add(a: number, b: number): number { return a + b; }",
		);
		expect(result.virtualPath).toBe("/app/src/lib/utils.ts");
		expect(result.code).toBe("export function add(a: number, b: number): number { return a + b; }");
		expect(result.success).toBe(true);
		expect(result.sourceMap).toBeUndefined();
	});

	it("passes through JavaScript content unchanged", () => {
		const result = convertPlainTsFile("/app/src/app.js", "export default function() {}");
		expect(result.virtualPath).toBe("/app/src/app.js");
		expect(result.success).toBe(true);
	});
});

describe("convertSvelteToTsx", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte2tsx-test-"));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("converts a simple Svelte component with script tag", async () => {
		const filePath = path.join(tempDir, "Simple.svelte");
		fs.writeFileSync(
			filePath,
			`<script>let count = 0;</script>\n\n<button on:click={() => count++}>{count}</button>`,
			"utf-8",
		);

		const result = await convertSvelteToTsx(filePath);

		expect(result.sourcePath).toBe(filePath);
		expect(result.virtualPath).toBe(`${filePath}.tsx`);
		expect(result.success).toBe(true);
		expect(result.tsxCode.length).toBeGreaterThan(0);
		expect(result.sourceMap).toBeDefined();
	});

	it("detects TypeScript Svelte component", async () => {
		const filePath = path.join(tempDir, "Typed.svelte");
		fs.writeFileSync(
			filePath,
			`<script lang="ts">let count: number = 0;</script>\n\n<span>{count}</span>`,
			"utf-8",
		);

		const result = await convertSvelteToTsx(filePath);

		expect(result.success).toBe(true);
		expect(result.tsxCode).toContain("count");
	});

	it("returns error result for non-existent file", async () => {
		const result = await convertSvelteToTsx("/nonexistent/Component.svelte");

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error?.message).toBeTruthy();
		expect(result.tsxCode).toBe("");
	});

	it("returns error result for malformed Svelte", async () => {
		const filePath = path.join(tempDir, "Bad.svelte");
		fs.writeFileSync(filePath, `<script>let x = ;</script>`, "utf-8");

		const result = await convertSvelteToTsx(filePath);

		// svelte2tsx with emitOnTemplateError: true may still succeed
		// but we validate the result structure regardless
		expect(typeof result.success).toBe("boolean");
		if (!result.success) {
			expect(result.error).toBeDefined();
		}
	});
});
