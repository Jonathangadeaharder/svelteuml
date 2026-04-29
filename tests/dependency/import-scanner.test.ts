import { describe, expect, it } from "vitest";
import { scanImports } from "../../src/dependency/import-scanner.js";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import type { AliasMap } from "../../src/types/config.js";

function buildProject(files: Record<string, string>): ParsingProject {
	const parsingProject = new ParsingProject();
	for (const [filePath, content] of Object.entries(files)) {
		parsingProject.addPlainSourceFile(filePath, content);
	}
	return parsingProject;
}

describe("scanImports", () => {
	it("returns empty array for project with no imports", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function add(a: number, b: number): number { return a + b; }`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("extracts a relative import", () => {
		const project = buildProject({
			"/src/lib/a.ts": `export function a() {}`,
			"/src/lib/b.ts": `import { a } from './a.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.sourceFile).toBe("/src/lib/b.ts");
		expect(result[0]?.targetFile).toBe("/src/lib/a.ts");
		expect(result[0]?.importedNames).toEqual(["a"]);
		expect(result[0]?.isTypeOnly).toBe(false);
	});

	it("extracts a type-only import", () => {
		const project = buildProject({
			"/src/lib/types.ts": `export interface User { id: string; }`,
			"/src/lib/api.ts": `import type { User } from './types.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.isTypeOnly).toBe(true);
		expect(result[0]?.importedNames).toEqual(["User"]);
	});

	it("resolves $lib alias using AliasMap", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function helper(): void {}`,
			"/src/routes/+page.ts": `import { helper } from '$lib/utils';`,
		});
		const aliases: AliasMap = { $lib: "/src/lib" };
		const result = scanImports(project, aliases);
		expect(result).toHaveLength(1);
		expect(result[0]?.targetFile).toBe("/src/lib/utils.ts");
	});

	it("skips external imports (node_modules)", () => {
		const project = buildProject({
			"/src/lib/stores.ts": `import { writable } from 'svelte/store'; export const x = writable(0);`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("handles namespace import", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function a() {} export function b() {}`,
			"/src/lib/consumer.ts": `import * as utils from './utils.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.importedNames).toEqual([]);
		expect(result[0]?.targetFile).toBe("/src/lib/utils.ts");
	});

	it("skips import with unresolvable target", () => {
		const project = buildProject({
			"/src/lib/consumer.ts": `import { missing } from './nonexistent.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("extracts multiple imports from same file", () => {
		const project = buildProject({
			"/src/lib/a.ts": `export const x = 1;`,
			"/src/lib/b.ts": `export const y = 2;`,
			"/src/lib/c.ts": `
				import { x } from './a.js';
				import { y } from './b.js';
			`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(2);
		const targets = result.map((r) => r.targetFile);
		expect(targets).toContain("/src/lib/a.ts");
		expect(targets).toContain("/src/lib/b.ts");
	});

	it("skips .svelte.tsx virtual paths", () => {
		const project = buildProject({
			"/src/lib/Button.svelte.tsx": `export default function Button() {}`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(0);
	});

	it("resolves import without extension to .ts file", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `export function helper(): void {}`,
			"/src/lib/consumer.ts": `import { helper } from './utils';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.targetFile).toBe("/src/lib/utils.ts");
	});

	it("handles default import", () => {
		const project = buildProject({
			"/src/lib/counter.ts": `export default class Counter {}`,
			"/src/lib/app.ts": `import Counter from './counter.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.importedNames).toEqual(["Counter"]);
	});

	it("handles mixed named and default import as named", () => {
		const project = buildProject({
			"/src/lib/mod.ts": `export function a() {} export function b() {}`,
			"/src/lib/consumer.ts": `import { a, b } from './mod.js';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.importedNames).toContain("a");
		expect(result[0]?.importedNames).toContain("b");
	});

	it("resolves index.ts from directory import", () => {
		const project = buildProject({
			"/src/lib/index.ts": `export function util() {}`,
			"/src/consumer.ts": `import { util } from './lib';`,
		});
		const result = scanImports(project, {});
		expect(result).toHaveLength(1);
		expect(result[0]?.targetFile).toBe("/src/lib/index.ts");
	});
});
