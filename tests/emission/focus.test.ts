import { describe, expect, it } from "vitest";
import {
	filterEdgesByScope,
	filterSymbolsByScope,
	resolveFocusScope,
} from "../../src/emission/focus.js";
import type { SymbolTable } from "../../src/types/ast.js";
import type { Edge, EdgeSet } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeSymbols(overrides?: Partial<SymbolTable>): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		routes: [],
		...overrides,
	};
}

function makeEdgeSet(edges: Edge[]): EdgeSet {
	return createEdgeSet(edges);
}

describe("resolveFocusScope", () => {
	it("returns all names when focus node not found", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "Foo",
					filePath: "/src/Foo.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Bar",
					filePath: "/src/Bar.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "Missing", depth: 1 });
		expect(scope.size).toBe(2);
		expect(scope.has("Foo")).toBe(true);
		expect(scope.has("Bar")).toBe(true);
	});

	it("returns only the focus node at depth 0", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "Foo",
					filePath: "/src/Foo.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Bar",
					filePath: "/src/Bar.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([{ source: "Foo", target: "Bar", type: "dependency" as const }]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "Foo", depth: 0 });
		expect(scope.size).toBe(2);
	});

	it("includes neighbours at depth 1", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "A",
					filePath: "/src/A.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "B",
					filePath: "/src/B.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "C",
					filePath: "/src/C.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([
			{ source: "A", target: "B", type: "dependency" as const },
			{ source: "B", target: "C", type: "dependency" as const },
		]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "A", depth: 1 });
		expect(scope.has("A")).toBe(true);
		expect(scope.has("B")).toBe(true);
		expect(scope.has("C")).toBe(false);
	});

	it("includes 2-hop neighbours at depth 2", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "A",
					filePath: "/src/A.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "B",
					filePath: "/src/B.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "C",
					filePath: "/src/C.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([
			{ source: "A", target: "B", type: "dependency" as const },
			{ source: "B", target: "C", type: "dependency" as const },
		]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "A", depth: 2 });
		expect(scope.has("A")).toBe(true);
		expect(scope.has("B")).toBe(true);
		expect(scope.has("C")).toBe(true);
	});

	it("unlimited depth when depth is 0 and focus matches", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "A",
					filePath: "/src/A.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "B",
					filePath: "/src/B.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "C",
					filePath: "/src/C.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([
			{ source: "A", target: "B", type: "dependency" as const },
			{ source: "B", target: "C", type: "dependency" as const },
		]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "A", depth: 0 });
		expect(scope.size).toBe(3);
	});

	it("fuzzy matches case-insensitively", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "MyComponent",
					filePath: "/src/MyComponent.svelte",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "mycomponent", depth: 1 });
		expect(scope.has("MyComponent")).toBe(true);
	});

	it("fuzzy matches by path suffix", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "Layout",
					filePath: "/src/routes/(auth)/+layout.svelte",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "Layout", depth: 1 });
		expect(scope.has("Layout")).toBe(true);
	});

	it("follows incoming edges (reverse direction)", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "A",
					filePath: "/src/A.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "B",
					filePath: "/src/B.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([{ source: "A", target: "B", type: "dependency" as const }]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "B", depth: 1 });
		expect(scope.has("A")).toBe(true);
		expect(scope.has("B")).toBe(true);
	});
});

describe("filterSymbolsByScope", () => {
	it("filters classes by scope", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "A",
					filePath: "/src/A.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "B",
					filePath: "/src/B.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = filterSymbolsByScope(symbols, new Set(["A"]));
		expect(result.classes).toHaveLength(1);
		expect(result.classes[0].name).toBe("A");
	});

	it("filters routes by scope", () => {
		const symbols = makeSymbols({
			routes: [
				{
					kind: "route",
					name: "/page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page" as const,
					isServer: false,
					routeSegment: { raw: "/", params: [], groups: [] },
				},
				{
					kind: "route",
					name: "/about",
					filePath: "/src/routes/about/+page.svelte",
					routeKind: "page" as const,
					isServer: false,
					routeSegment: { raw: "/about", params: [], groups: [] },
				},
			],
		});
		const result = filterSymbolsByScope(symbols, new Set(["/page"]));
		expect(result.routes).toHaveLength(1);
		expect(result.routes[0].name).toBe("/page");
	});

	it("filters props by componentName", () => {
		const symbols = makeSymbols({
			props: [
				{
					kind: "prop",
					name: "foo",
					filePath: "/src/A.svelte",
					componentName: "A",
					type: "string",
					isRequired: true,
				},
				{
					kind: "prop",
					name: "bar",
					filePath: "/src/B.svelte",
					componentName: "B",
					type: "number",
					isRequired: false,
				},
			],
		});
		const result = filterSymbolsByScope(symbols, new Set(["A"]));
		expect(result.props).toHaveLength(1);
		expect(result.props[0].componentName).toBe("A");
	});
});

describe("filterEdgesByScope", () => {
	it("keeps only edges within scope", () => {
		const edges: Edge[] = [
			{ source: "A", target: "B", type: "dependency" },
			{ source: "B", target: "C", type: "dependency" },
		];
		const result = filterEdgesByScope(edges, new Set(["A", "B"]));
		expect(result).toHaveLength(1);
		expect(result[0].source).toBe("A");
		expect(result[0].target).toBe("B");
	});

	it("returns empty for no matching edges", () => {
		const edges: Edge[] = [{ source: "A", target: "B", type: "dependency" }];
		const result = filterEdgesByScope(edges, new Set(["C"]));
		expect(result).toHaveLength(0);
	});
});

describe("resolveFocusScope fuzzy matching", () => {
	it("matches by path prefix", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "Btn",
					filePath: "/src/lib/components/Btn.svelte",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "Btn", depth: 1 });
		expect(scope.has("Btn")).toBe(true);
	});

	it("matches by substring fallback", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "MyGreatWidget",
					filePath: "/src/MyGreatWidget.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "great", depth: 1 });
		expect(scope.has("MyGreatWidget")).toBe(true);
	});

	it("collects function names in scope", () => {
		const symbols = makeSymbols({
			functions: [
				{
					kind: "function" as const,
					name: "helperFn",
					filePath: "/src/helper.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "helperFn", depth: 1 });
		expect(scope.has("helperFn")).toBe(true);
	});

	it("collects store names in scope", () => {
		const symbols = makeSymbols({
			stores: [
				{
					kind: "store" as const,
					name: "userStore",
					filePath: "/src/stores/user.ts",
					storeType: "writable",
					valueType: "User",
					runeKind: undefined,
					isExported: true,
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "userStore", depth: 1 });
		expect(scope.has("userStore")).toBe(true);
	});

	it("collects export names in scope", () => {
		const symbols = makeSymbols({
			exports: [
				{
					kind: "export" as const,
					name: "API_URL",
					filePath: "/src/config.ts",
					exportType: "value" as const,
					typeAnnotation: "string",
				},
			],
		});
		const edgeSet = makeEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "API_URL", depth: 1 });
		expect(scope.has("API_URL")).toBe(true);
	});
});
