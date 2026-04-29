import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DiscoveryOptions } from "../../src/discovery/file-discovery";
import { discoverFiles } from "../../src/discovery/file-discovery";

// Lightweight integration tests against the real filesystem fixture
describe("src/discovery/file-discovery.ts", () => {
	let rootDir: string;

	beforeEach(() => {
		// Create a fresh temporary directory for each test suite run
		rootDir = join(os.tmpdir(), `file-discovery-test-${Date.now()}`);
		mkdirSync(rootDir, { recursive: true });

		// Baseline fixtures that cover all default include patterns
		writeFileSync(join(rootDir, "component.svelte"), "<script>export let a;</script>");
		writeFileSync(join(rootDir, "util.ts"), "export const a = 1;");
		writeFileSync(join(rootDir, "signal.js"), 'console.log("x");');
		writeFileSync(join(rootDir, "module.svelte.ts"), "<script>export default 1</script>");
		writeFileSync(join(rootDir, "bar.svelte.js"), "export default {};");

		// Edge cases: files with multiple extensions should go to svelteModules
		writeFileSync(join(rootDir, "module.svelte.ts"), "<script>export const a=1</script>");
		writeFileSync(join(rootDir, "bar.svelte.js"), "export default {};");

		// Subdirectories/files that should be excluded by default
		mkdirSync(join(rootDir, "dist"), { recursive: true });
		writeFileSync(join(rootDir, "dist", "ignore.js"), "// ignore");

		// node_modules should be excluded by default
		mkdirSync(join(rootDir, "node_modules", "pkg"), { recursive: true });
		writeFileSync(join(rootDir, "node_modules", "pkg", "ignored.js"), 'console.log("ignore");');

		// .svelte-kit should be excluded by default
		mkdirSync(join(rootDir, ".svelte-kit"), { recursive: true });
		writeFileSync(join(rootDir, ".svelte-kit", "ignored.js"), "// ignore");
	});

	afterEach(() => {
		rmSync(rootDir, { recursive: true, force: true });
	});

	it("discovers default files into categories", async () => {
		const res = await discoverFiles(rootDir);

		// svelte: only plain .svelte files
		expect(res.svelte.some((p) => /component\.svelte$/.test(p))).toBe(true);

		// svelteModules: .svelte.ts and .svelte.js should be present
		expect(res.svelteModules).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/module\.svelte\.ts$/),
				expect.stringMatching(/bar\.svelte\.js$/),
			]),
		);

		// typescript: .ts files that are not .svelte.ts
		expect(res.typescript).toEqual(expect.arrayContaining([expect.stringMatching(/util\.ts$/)]));

		// javascript: plain .js files
		expect(res.javascript).toEqual(expect.arrayContaining([expect.stringMatching(/signal\.js$/)]));

		// Exclusions by default
		expect(res.javascript.find((p) => /node_modules/.test(p))).toBeUndefined();
		expect(res.svelteModules.find((p) => /node_modules/.test(p))).toBeUndefined();
		expect(res.svelte.find((p) => /node_modules/.test(p))).toBeUndefined();
		expect(res.svelte.find((p) => /\.svelte-kit/.test(p))).toBeUndefined();
	});

	it("discovers with an empty project returns empty arrays", async () => {
		const emptyDir = join(rootDir, "empty-project");
		mkdirSync(emptyDir, { recursive: true });
		const res = await discoverFiles(emptyDir);
		expect(res.svelte.length).toBe(0);
		expect(res.typescript.length).toBe(0);
		expect(res.javascript.length).toBe(0);
		expect(res.svelteModules.length).toBe(0);
	});

	it("custom include patterns add files beyond defaults", async () => {
		// Add an extra JSX file and include it via patterns
		writeFileSync(join(rootDir, "extra.jsx"), "export const x = 1;");
		const opts: DiscoveryOptions = {
			include: [
				"**/*.svelte",
				"**/*.ts",
				"**/*.js",
				"**/*.svelte.ts",
				"**/*.svelte.js",
				"**/*.jsx",
			],
		};
		const res = await discoverFiles(rootDir, opts);
		// extra.jsx should end up in javascript (jsx treated as JS)
		expect(res.javascript).toEqual(expect.arrayContaining([expect.stringMatching(/extra\.jsx$/)]));
	});

	it("custom exclude patterns remove files from defaults", async () => {
		const opts: DiscoveryOptions = { exclude: ["**/*.js"] };
		const res = await discoverFiles(rootDir, opts);
		// Should have excluded the plain JS files
		expect(res.javascript.length).toBe(0);
		// svelte modules should remain unaffected by this exclude
		expect(res.svelteModules.length).toBeGreaterThanOrEqual(1);
	});

	it("edge case: .svelte.ts and .svelte.js go to svelteModules", async () => {
		const res = await discoverFiles(rootDir);
		expect(res.svelteModules).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/module\.svelte\.ts$/),
				expect.stringMatching(/bar\.svelte\.js$/),
			]),
		);
		expect(res.typescript).not.toEqual(
			expect.arrayContaining([expect.stringMatching(/module\.svelte\.ts$/)]),
		);
		expect(res.javascript).not.toEqual(
			expect.arrayContaining([expect.stringMatching(/bar\.svelte\.js$/)]),
		);
	});

	it("categorizes .tsx files as typescript", async () => {
		writeFileSync(join(rootDir, "component.tsx"), "export const X = () => <div/>;");
		const res = await discoverFiles(rootDir);
		expect(res.typescript).toEqual(
			expect.arrayContaining([expect.stringMatching(/component\.tsx$/)]),
		);
	});
});
