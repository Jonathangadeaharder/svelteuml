import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { trackReactiveDependencies } from "../../src/dependency/reactive-tracker.js";
import type { StoreSymbol } from "../../src/types/ast.js";

describe("trackReactiveDependencies", () => {
	it("returns empty for no reactive symbols", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const result = trackReactiveDependencies(project, []);
		expect(result).toHaveLength(0);
	});

	it("tracks cross-file $state reference", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.svelte.ts", `export const count = $state(0);`, {
			overwrite: true,
		});
		project.createSourceFile(
			"/src/lib/consumer.svelte.ts",
			`import { count } from './store.svelte.ts';\nconsole.log(count);`,
			{ overwrite: true },
		);

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "count",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(1);
		expect(deps[0]?.sourceFile).toBe("/src/lib/consumer.svelte.ts");
		expect(deps[0]?.targetFile).toBe("/src/lib/store.svelte.ts");
		expect(deps[0]?.symbolName).toBe("count");
		expect(deps[0]?.dependencyKind).toBe("state");
	});

	it("skips same-file references", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile(
			"/src/lib/store.svelte.ts",
			`export const count = $state(0);\nconst doubled = count * 2;`,
			{ overwrite: true },
		);

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "count",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(0);
	});

	it("skips symbols without runeKind", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.ts", `export const data = writable(0);`, {
			overwrite: true,
		});

		const storeSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "data",
				filePath: "/src/lib/store.ts",
				storeType: "writable",
				valueType: "number",
			},
		];

		const deps = trackReactiveDependencies(project, storeSymbols);
		expect(deps).toHaveLength(0);
	});

	it("deduplicates multiple references from same file", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.svelte.ts", `export const count = $state(0);`, {
			overwrite: true,
		});
		project.createSourceFile(
			"/src/lib/consumer.svelte.ts",
			`import { count } from './store.svelte.ts';\nconst a = count;\nconst b = count + 1;`,
			{ overwrite: true },
		);

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "count",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(1);
	});

	it("tracks $derived dependencies", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile(
			"/src/lib/store.svelte.ts",
			`export const label = $derived('hello');`,
			{ overwrite: true },
		);
		project.createSourceFile(
			"/src/lib/view.svelte.ts",
			`import { label } from './store.svelte.ts';\nconsole.log(label);`,
			{ overwrite: true },
		);

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "label",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "derived",
				valueType: "string",
				runeKind: "derived",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(1);
		expect(deps[0]?.dependencyKind).toBe("derived");
	});

	it("filters type-only import clause (default import type)", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.svelte.ts", `export default $state(0);`, {
			overwrite: true,
		});
		project.createSourceFile(
			"/src/lib/types-only.ts",
			`import type store from './store.svelte.js';`,
			{ overwrite: true },
		);

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "default",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(0);
	});

	it("handles errors gracefully during reference tracking", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.svelte.ts", `export let count = $state(0);`, {
			overwrite: true,
		});

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "count",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(0);
	});

	it("skips symbols when source file not found in project", () => {
		const project = new Project({ useInMemoryFileSystem: true });

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "count",
				filePath: "/src/lib/nonexistent.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(0);
	});

	it("skips symbols when variable declaration not found", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		project.createSourceFile("/src/lib/store.svelte.ts", `export const other = $state(0);`, {
			overwrite: true,
		});

		const reactiveSymbols: StoreSymbol[] = [
			{
				kind: "store",
				name: "nonexistent",
				filePath: "/src/lib/store.svelte.ts",
				storeType: "writable",
				valueType: "number",
				runeKind: "state",
			},
		];

		const deps = trackReactiveDependencies(project, reactiveSymbols);
		expect(deps).toHaveLength(0);
	});
});
