import { describe, expect, it } from "vitest";
import type { GroupConfig } from "../../src/types/diagram.js";
import { matchGroup, groupSymbols } from "../../src/emission/groups.js";
import type {
	ClassSymbol,
	FunctionSymbol,
	StoreSymbol,
	ComponentSymbol,
	SymbolTable,
} from "../../src/types/ast.js";

describe("matchGroup", () => {
	const groups: GroupConfig[] = [
		{ pattern: "src/lib/components/*", name: "Components" },
		{ pattern: "src/routes/**", name: "Routes" },
		{ pattern: "src/lib/stores/*", name: "Stores" },
	];

	it("matches file by glob pattern", () => {
		expect(matchGroup("src/lib/components/Button.svelte", groups)).toBe("Components");
	});

	it("matches ** glob pattern", () => {
		expect(matchGroup("src/routes/products/[id]/page.svelte", groups)).toBe("Routes");
	});

	it("returns undefined for no match", () => {
		expect(matchGroup("src/lib/utils/helper.ts", groups)).toBeUndefined();
	});

	it("returns first matching group", () => {
		const overlapping: GroupConfig[] = [
			{ pattern: "src/lib/**", name: "Lib" },
			{ pattern: "src/lib/components/*", name: "Components" },
		];
		expect(matchGroup("src/lib/components/Button.svelte", overlapping)).toBe("Lib");
	});

	it("handles empty groups array", () => {
		expect(matchGroup("src/foo.ts", [])).toBeUndefined();
	});
});

describe("groupSymbols", () => {
	const groups: GroupConfig[] = [
		{ pattern: "src/lib/components/*", name: "Components" },
		{ pattern: "src/lib/stores/*", name: "Stores" },
	];

	const makeClass = (name: string, filePath: string): ClassSymbol => ({
		kind: "class",
		name,
		filePath,
		implements: [],
		members: [],
		isGeneric: false,
		typeParams: [],
	});

	const makeFn = (name: string, filePath: string): FunctionSymbol => ({
		kind: "function",
		name,
		filePath,
		isExported: false,
		isAsync: false,
		parameters: [],
		typeParams: [],
	});

	const makeStore = (name: string, filePath: string): StoreSymbol => ({
		kind: "store",
		name,
		filePath,
		storeType: "writable",
		valueType: "number",
	});

	const makeComponent = (name: string, filePath: string): ComponentSymbol => ({
		kind: "component",
		name,
		filePath,
	});

	it("groups symbols by matching file paths", () => {
		const symbols: SymbolTable = {
			classes: [
				makeClass("Button", "src/lib/components/Button.svelte"),
				makeClass("Helper", "src/lib/utils/helper.ts"),
			],
			functions: [],
			stores: [makeStore("count", "src/lib/stores/count.ts")],
			props: [],
			events: [],
			exports: [],
			routes: [],
			components: [makeComponent("Card", "src/lib/components/Card.svelte")],
		};

		const { groups: grouped, ungrouped } = groupSymbols(symbols, groups);

		expect(grouped.has("Components")).toBe(true);
		expect(grouped.get("Components")!.classes).toHaveLength(1);
		expect(grouped.get("Components")!.classes[0]!.name).toBe("Button");
		expect(grouped.get("Components")!.components).toHaveLength(1);

		expect(grouped.has("Stores")).toBe(true);
		expect(grouped.get("Stores")!.stores).toHaveLength(1);

		expect(ungrouped.classes).toHaveLength(1);
		expect(ungrouped.classes[0]!.name).toBe("Helper");
	});

	it("handles symbols with no matching groups", () => {
		const symbols: SymbolTable = {
			classes: [makeClass("Helper", "src/lib/utils/helper.ts")],
			functions: [],
			stores: [],
			props: [],
			events: [],
			exports: [],
			routes: [],
			components: [],
		};

		const { groups: grouped, ungrouped } = groupSymbols(symbols, groups);
		expect(grouped.size).toBe(0);
		expect(ungrouped.classes).toHaveLength(1);
	});

	it("handles empty groups array", () => {
		const symbols: SymbolTable = {
			classes: [makeClass("Helper", "src/lib/utils/helper.ts")],
			functions: [],
			stores: [],
			props: [],
			events: [],
			exports: [],
			routes: [],
			components: [],
		};

		const { groups: grouped, ungrouped } = groupSymbols(symbols, []);
		expect(grouped.size).toBe(0);
		expect(ungrouped.classes).toHaveLength(1);
	});
});
