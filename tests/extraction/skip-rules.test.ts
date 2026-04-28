import { describe, it, expect } from "vitest";
import { shouldSkipFile, isVirtualSpecifier } from "../../src/extraction/skip-rules.js";

describe("shouldSkipFile", () => {
	it("skips .d.ts declaration files", () => {
		expect(shouldSkipFile("/project/src/lib/utils.d.ts")).toBe(true);
	});

	it("skips __types__.d.ts (SvelteKit generated)", () => {
		expect(shouldSkipFile("/project/src/routes/__types__.d.ts")).toBe(true);
	});

	it("skips files inside node_modules", () => {
		expect(shouldSkipFile("/project/node_modules/svelte/index.ts")).toBe(true);
	});

	it("skips files inside .svelte-kit", () => {
		expect(shouldSkipFile("/project/.svelte-kit/generated/types.ts")).toBe(true);
	});

	it("skips files inside dist", () => {
		expect(shouldSkipFile("/project/dist/cli.js")).toBe(true);
	});

	it("skips files inside .git", () => {
		expect(shouldSkipFile("/project/.git/hooks/pre-commit")).toBe(true);
	});

	it("skips $types virtual paths", () => {
		expect(shouldSkipFile("/project/src/routes/$types")).toBe(true);
	});

	it("skips __types__ virtual paths", () => {
		expect(shouldSkipFile("/project/src/routes/__types__")).toBe(true);
	});

	it("does NOT skip regular .ts files", () => {
		expect(shouldSkipFile("/project/src/lib/utils.ts")).toBe(false);
	});

	it("does NOT skip .svelte files", () => {
		expect(shouldSkipFile("/project/src/lib/Button.svelte")).toBe(false);
	});

	it("does NOT skip route files", () => {
		expect(shouldSkipFile("/project/src/routes/+page.svelte")).toBe(false);
	});

	it("does NOT skip test files at src level", () => {
		expect(shouldSkipFile("/project/src/lib/utils.test.ts")).toBe(false);
	});
});

describe("isVirtualSpecifier", () => {
	it("recognises $types", () => {
		expect(isVirtualSpecifier("$types")).toBe(true);
	});

	it("recognises $app/stores", () => {
		expect(isVirtualSpecifier("$app/stores")).toBe(true);
	});

	it("recognises $app/navigation", () => {
		expect(isVirtualSpecifier("$app/navigation")).toBe(true);
	});

	it("recognises $env/static/public", () => {
		expect(isVirtualSpecifier("$env/static/public")).toBe(true);
	});

	it("recognises __sveltekit internal specifiers", () => {
		expect(isVirtualSpecifier("__sveltekit_internal")).toBe(true);
	});

	it("does NOT flag $lib (user alias)", () => {
		expect(isVirtualSpecifier("$lib/utils")).toBe(false);
	});

	it("does NOT flag regular relative paths", () => {
		expect(isVirtualSpecifier("../utils")).toBe(false);
	});

	it("does NOT flag npm package names", () => {
		expect(isVirtualSpecifier("svelte/store")).toBe(false);
	});
});
