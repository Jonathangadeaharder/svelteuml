import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { extractStoreSymbols } from "../../src/extraction/store-extractor.js";

function makeSourceFile(code: string, filePath = "/src/lib/stores.ts") {
	const project = new Project({ useInMemoryFileSystem: true });
	return project.createSourceFile(filePath, code);
}

describe("extractStoreSymbols", () => {
	it("extracts a writable store with type argument", () => {
		const sf = makeSourceFile(`
			import { writable } from 'svelte/store';
			export const count = writable<number>(0);
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("count");
		expect(result[0]?.storeType).toBe("writable");
		expect(result[0]?.valueType).toBe("number");
	});

	it("extracts a readable store", () => {
		const sf = makeSourceFile(`
			import { readable } from 'svelte/store';
			export const time = readable<Date>(new Date());
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.storeType).toBe("readable");
	});

	it("extracts a derived store", () => {
		const sf = makeSourceFile(`
			import { writable, derived } from 'svelte/store';
			export const base = writable<number>(0);
			export const doubled = derived<typeof base, number>(base, $b => $b * 2);
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		const doubledStore = result.find((s) => s.name === "doubled");
		expect(doubledStore?.storeType).toBe("derived");
	});

	it("ignores non-exported stores", () => {
		const sf = makeSourceFile(`
			import { writable } from 'svelte/store';
			const internal = writable<string>('hidden');
			export const visible = writable<string>('shown');
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("visible");
	});

	it("ignores non-store call expressions", () => {
		const sf = makeSourceFile(`
			export const items = new Map<string, number>();
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(0);
	});

	it("skips files in node_modules", () => {
		const sf = makeSourceFile(
			`
			export const count = writable<number>(0);
		`,
			"/project/node_modules/lib/stores.ts",
		);
		const result = extractStoreSymbols(sf, "/project/node_modules/lib/stores.ts");
		expect(result).toHaveLength(0);
	});

	it("extracts multiple stores from one file", () => {
		const sf = makeSourceFile(`
			import { writable, readable } from 'svelte/store';
			export const user = writable<User | null>(null);
			export const theme = readable<string>('light');
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(2);
		const names = result.map((s) => s.name);
		expect(names).toContain("user");
		expect(names).toContain("theme");
	});

	it("extracts store without type argument as unknown", () => {
		const sf = makeSourceFile(`
			import { writable } from 'svelte/store';
			export const bare = writable(0);
		`);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.valueType).toBe("unknown");
	});

	it("extracts Svelte 5 $state rune from .svelte.ts module", () => {
		const sf = makeSourceFile(
			`
			export const count = $state<number>(0);
		`,
			"/src/lib/stores.svelte.ts",
		);
		const result = extractStoreSymbols(sf, "/src/lib/stores.svelte.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("count");
		expect(result[0]?.storeType).toBe("writable");
		expect(result[0]?.valueType).toBe("number");
	});

	it("detects $state rune in regular .ts files with runeKind", () => {
		const sf = makeSourceFile(
			`
			export const count = $state<number>(0);
		`,
			"/src/lib/stores.ts",
		);
		const result = extractStoreSymbols(sf, "/src/lib/stores.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.runeKind).toBe("state");
	});

	it("detects exported $state rune with runeKind", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const code = `
import { writable } from 'svelte/store';
export const count = $state(0);
export const items = $state<string[]>([]);
`;
		const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
		const results = extractStoreSymbols(sf, "store.svelte.ts");
		expect(results).toHaveLength(2);
		const countStore = results.find((s) => s.name === "count");
		expect(countStore?.runeKind).toBe("state");
		expect(countStore?.storeType).toBe("writable");
		const itemsStore = results.find((s) => s.name === "items");
		expect(itemsStore?.runeKind).toBe("state");
		expect(itemsStore?.valueType).toBe("string[]");
	});

	it("detects exported $derived rune with runeKind", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const code = `
export const doubled = $derived(count * 2);
export const computed = $derived.by(() => expensive());
`;
		const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
		const results = extractStoreSymbols(sf, "store.svelte.ts");
		expect(results).toHaveLength(2);
		const doubled = results.find((s) => s.name === "doubled");
		expect(doubled?.runeKind).toBe("derived");
		expect(doubled?.storeType).toBe("derived");
		const computed = results.find((s) => s.name === "computed");
		expect(computed?.runeKind).toBe("derived");
	});

	it("does not extract $effect calls", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const code = `
export const count = $state(0);
$effect(() => { console.log(count); });
`;
		const sf = project.createSourceFile("store.svelte.ts", code, { overwrite: true });
		const results = extractStoreSymbols(sf, "store.svelte.ts");
		expect(results).toHaveLength(1);
		expect(results[0]?.name).toBe("count");
	});

	it("detects $state with union type in regular .ts files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const code = `export const theme = $state<'light' | 'dark'>('light');`;
		const sf = project.createSourceFile("theme.ts", code, { overwrite: true });
		const results = extractStoreSymbols(sf, "theme.ts");
		expect(results).toHaveLength(1);
		expect(results[0]?.runeKind).toBe("state");
		expect(results[0]?.valueType).toBe("'light' | 'dark'");
	});
});
