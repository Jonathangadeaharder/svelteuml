import { describe, expect, it } from "vitest";
import {
	assignGroups,
	parseAliasGroups,
	validateGroups,
	type AliasGroup,
} from "../../src/emission/alias.js";
import type { SymbolTable } from "../../src/types/ast.js";

function makeTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

describe("parseAliasGroups", () => {
	it("parses pattern:name pairs", () => {
		const result = parseAliasGroups(["src/**/*.ts:Library", "src/routes/**/*.svelte:Pages"]);
		expect(result).toEqual([
			{ pattern: "src/**/*.ts", name: "Library" },
			{ pattern: "src/routes/**/*.svelte", name: "Pages" },
		]);
	});

	it("handles single entry", () => {
		const result = parseAliasGroups(["src/lib/**/*.service.ts:Services"]);
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("Services");
	});

	it("returns empty array for empty input", () => {
		const result = parseAliasGroups([]);
		expect(result).toEqual([]);
	});

	it("returns empty array for no args", () => {
		const result = parseAliasGroups();
		expect(result).toEqual([]);
	});
});

describe("validateGroups", () => {
	it("returns empty for valid groups", () => {
		const groups: AliasGroup[] = [
			{ pattern: "src/**/*.ts", name: "Lib" },
			{ pattern: "src/**/*.svelte", name: "Components" },
		];
		expect(validateGroups(groups)).toEqual([]);
	});

	it("catches empty pattern", () => {
		const groups: AliasGroup[] = [{ pattern: "", name: "Empty" }];
		const errors = validateGroups(groups);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("pattern");
	});

	it("catches empty name", () => {
		const groups: AliasGroup[] = [{ pattern: "src/**/*.ts", name: "" }];
		const errors = validateGroups(groups);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("name");
	});

	it("catches duplicate names", () => {
		const groups: AliasGroup[] = [
			{ pattern: "src/**/*.ts", name: "Dupe" },
			{ pattern: "src/**/*.svelte", name: "Dupe" },
		];
		const errors = validateGroups(groups);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((e) => e.includes("Dupe"))).toBe(true);
	});
});

describe("assignGroups", () => {
	it("assigns group based on first matching glob", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "UserService",
					filePath: "/project/src/services/user.service.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "ProductService",
					filePath: "/project/src/services/product.service.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
			functions: [
				{
					kind: "function",
					name: "helper",
					filePath: "/project/src/lib/helper.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					typeParams: [],
				},
			],
		});

		const groups: AliasGroup[] = [
			{ pattern: "**/services/**", name: "Services" },
			{ pattern: "**/lib/**", name: "Library" },
		];

		const result = assignGroups(table, groups);
		expect(result.classes[0]?.group).toBe("Services");
		expect(result.classes[1]?.group).toBe("Services");
		expect(result.functions[0]?.group).toBe("Library");
	});

	it("leaves group undefined when no pattern matches", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "Something",
					filePath: "/project/src/other/thing.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});

		const groups: AliasGroup[] = [{ pattern: "**/services/**", name: "Services" }];
		const result = assignGroups(table, groups);
		expect(result.classes[0]?.group).toBeUndefined();
	});

	it("matches first group when multiple patterns match", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "FooService",
					filePath: "/project/src/services/foo.service.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});

		const groups: AliasGroup[] = [
			{ pattern: "**/services/**", name: "Services" },
			{ pattern: "**/*.service.*", name: "ServiceFiles" },
		];

		const result = assignGroups(table, groups);
		expect(result.classes[0]?.group).toBe("Services");
	});

	it("assigns groups to all symbol types", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "C",
					filePath: "/src/c.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
			stores: [
				{
					kind: "store",
					name: "s",
					filePath: "/src/s.ts",
					storeType: "writable",
					valueType: "number",
				},
			],
			props: [
				{
					kind: "prop",
					name: "p",
					filePath: "/src/p.ts",
					componentName: "C",
					type: "string",
					isRequired: true,
				},
			],
			exports: [
				{
					kind: "export",
					name: "e",
					filePath: "/src/e.ts",
					exportType: "value",
				},
			],
			routes: [
				{
					kind: "route",
					name: "/",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
			],
			components: [
				{
					kind: "component",
					name: "Comp",
					filePath: "/src/comp.svelte",
				},
			],
		});

		const groups: AliasGroup[] = [{ pattern: "**/*", name: "All" }];
		const result = assignGroups(table, groups);

		expect(result.classes[0]?.group).toBe("All");
		expect(result.stores[0]?.group).toBe("All");
		expect(result.props[0]?.group).toBe("All");
		expect(result.exports[0]?.group).toBe("All");
		expect(result.routes[0]?.group).toBe("All");
		expect(result.components[0]?.group).toBe("All");
	});

	it("returns new table without mutating input", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/src/services/svc.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});

		const groups: AliasGroup[] = [{ pattern: "**/services/**", name: "Services" }];
		const result = assignGroups(table, groups);

		expect(result).not.toBe(table);
		expect(result.classes[0]?.group).toBe("Services");
		expect(table.classes[0]?.group).toBeUndefined();
	});

	it("handles empty groups array", () => {
		const table = makeTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/src/svc.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});

		const result = assignGroups(table, []);
		expect(result.classes[0]?.group).toBeUndefined();
	});

	it("handles empty symbol table", () => {
		const groups: AliasGroup[] = [{ pattern: "**/*", name: "All" }];
		const result = assignGroups(makeTable(), groups);
		expect(result.classes).toHaveLength(0);
	});
});
