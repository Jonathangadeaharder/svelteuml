import { describe, expect, it } from "vitest";
import { trackStoreSubscriptions } from "../../src/dependency/store-subscription.js";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import type { StoreSymbol } from "../../src/types/ast.js";

function makeParsingProject(files: Array<{ path: string; content: string }>): ParsingProject {
	const project = new ParsingProject();
	for (const f of files) {
		project.addPlainSourceFile(f.path, f.content);
	}
	return project;
}

function makeStoreSymbol(
	overrides: Partial<StoreSymbol> & { name: string; filePath: string },
): StoreSymbol {
	return {
		kind: "store",
		storeType: "writable",
		valueType: "unknown",
		...overrides,
	};
}

describe("trackStoreSubscriptions", () => {
	it("returns empty for no store symbols", () => {
		const project = makeParsingProject([
			{ path: "/src/routes/+page.svelte", content: "let $count = 5;" },
		]);
		const result = trackStoreSubscriptions(project, []);
		expect(result).toHaveLength(0);
	});

	it("detects $count subscription in .svelte file", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					import { count } from './stores.js';
					let $count = __sveltets_2_store_get(count);
					console.log($count);
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "count", filePath: "/src/lib/stores/counter.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(1);
		expect(result[0]?.sourceFile).toBe("/src/routes/+page.svelte");
		expect(result[0]?.targetFile).toBe("/src/lib/stores/counter.svelte.ts");
		expect(result[0]?.symbolName).toBe("$count");
		expect(result[0]?.dependencyKind).toBe("store-subscription");
	});

	it("detects $userName subscription via template reference", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					import { userName } from './auth.svelte.js';
					let $userName = __sveltets_2_store_get(userName);
					{ svelteHTML.createElement("h1", {}); $userName; }
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "userName", filePath: "/src/lib/stores/auth.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(1);
		expect(result[0]?.symbolName).toBe("$userName");
	});

	it("detects multiple store subscriptions from same file", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					let $count = __sveltets_2_store_get(count);
					let $user = __sveltets_2_store_get(user);
					console.log($count, $user);
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "count", filePath: "/src/lib/stores/counter.svelte.ts" }),
			makeStoreSymbol({ name: "user", filePath: "/src/lib/stores/user.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(2);
		const names = result.map((d) => d.symbolName).sort((a, b) => a.localeCompare(b));
		expect(names).toEqual(["$count", "$user"]);
	});

	it("returns empty for TS files (not .svelte)", () => {
		const project = makeParsingProject([
			{
				path: "/src/lib/consumer.ts",
				content: "let $count = store.get(count);",
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "count", filePath: "/src/lib/stores/counter.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(0);
	});

	it("skips Svelte runes like $state, $derived, $effect", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					let x = $state(0);
					let y = $derived(x * 2);
					$effect(() => console.log(x));
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "state", filePath: "/src/lib/states.svelte.ts" }),
			makeStoreSymbol({ name: "derived", filePath: "/src/lib/states.svelte.ts" }),
			makeStoreSymbol({ name: "effect", filePath: "/src/lib/states.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(0);
	});

	it("deduplicates same subscription in file", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					let $count = __sveltets_2_store_get(count);
					console.log($count);
					console.log($count + 1);
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "count", filePath: "/src/lib/stores/counter.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(1);
	});

	it("handles empty project gracefully", () => {
		const project = makeParsingProject([]);
		const result = trackStoreSubscriptions(project, []);
		expect(result).toHaveLength(0);
	});

	it("only matches exact store name, not prefix", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					let $counter = __sveltets_2_store_get(counter);
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "count", filePath: "/src/lib/stores/counter.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(0);
	});

	it("tracks $isLoggedIn boolean store", () => {
		const project = makeParsingProject([
			{
				path: "/src/routes/+page.svelte",
				content: `
					let $isLoggedIn = __sveltets_2_store_get(isLoggedIn);
					if ($isLoggedIn) { console.log('logged in'); }
				`,
			},
		]);
		const stores: StoreSymbol[] = [
			makeStoreSymbol({ name: "isLoggedIn", filePath: "/src/lib/stores/auth.svelte.ts" }),
		];
		const result = trackStoreSubscriptions(project, stores);
		expect(result).toHaveLength(1);
		expect(result[0]?.symbolName).toBe("$isLoggedIn");
	});
});
