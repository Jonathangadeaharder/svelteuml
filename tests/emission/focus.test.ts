import { describe, expect, it } from "vitest";
import {
	filterByExcludePatterns,
	filterEdgesByScope,
	filterSymbolsByScope,
	resolveFocusScope,
	resolveGlobalScope,
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
		components: [],
		events: [],
		...overrides,
	};
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
		const edgeSet = createEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "Missing", depth: 1 });
		expect(scope.size).toBe(2);
		expect(scope.has("Foo")).toBe(true);
		expect(scope.has("Bar")).toBe(true);
	});

	it("returns focus node and its direct neighbours at depth 0", () => {
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
		const edgeSet = createEdgeSet([{ source: "Foo", target: "Bar", type: "dependency" as const }]);
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
		const edgeSet = createEdgeSet([
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
		const edgeSet = createEdgeSet([
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
		const edgeSet = createEdgeSet([
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
		const edgeSet = createEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "mycomponent", depth: 1 });
		expect(scope.has("MyComponent")).toBe(true);
	});

	it("fuzzy matches by path suffix", () => {
		const symbols = makeSymbols({
			classes: [
				{
					kind: "class",
					name: "AuthLayout",
					filePath: "/src/routes/(auth)/+layout.svelte",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edgeSet = createEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "+layout.svelte", depth: 1 });
		expect(scope.has("AuthLayout")).toBe(true);
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
		const edgeSet = createEdgeSet([{ source: "A", target: "B", type: "dependency" as const }]);
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
		const edgeSet = createEdgeSet([]);
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
		const edgeSet = createEdgeSet([]);
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
		const edgeSet = createEdgeSet([]);
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
		const edgeSet = createEdgeSet([]);
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
		const edgeSet = createEdgeSet([]);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "API_URL", depth: 1 });
		expect(scope.has("API_URL")).toBe(true);
	});
});

describe("resolveGlobalScope", () => {
	it("returns all names when maxDepth is 0", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "A", filePath: "/src/A.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "B", filePath: "/src/B.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([{ source: "A", target: "B", type: "dependency" as const }]);
		const scope = resolveGlobalScope(symbols, edgeSet, 0);
		expect(scope.size).toBe(2);
	});

	it("from root, includes direct deps at depth 1", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "Root", filePath: "/src/Root.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Util", filePath: "/src/Util.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Deep", filePath: "/src/Deep.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([
			{ source: "Root", target: "Util", type: "dependency" as const },
			{ source: "Util", target: "Deep", type: "dependency" as const },
		]);
		const scope = resolveGlobalScope(symbols, edgeSet, 1);
		expect(scope.has("Root")).toBe(true);
		expect(scope.has("Util")).toBe(true);
		expect(scope.has("Deep")).toBe(false);
	});

	it("single root at depth 2 includes both hops", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "A", filePath: "/src/A.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "B", filePath: "/src/B.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "C", filePath: "/src/C.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([
			{ source: "A", target: "B", type: "dependency" as const },
			{ source: "B", target: "C", type: "dependency" as const },
		]);
		const scope = resolveGlobalScope(symbols, edgeSet, 2);
		expect(scope.size).toBe(3);
	});

	it("starts BFS from symbols with no incoming edges", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "A", filePath: "/src/A.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "B", filePath: "/src/B.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "C", filePath: "/src/C.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([
			{ source: "A", target: "B", type: "dependency" as const },
			{ source: "B", target: "C", type: "dependency" as const },
		]);
		const scope = resolveGlobalScope(symbols, edgeSet, 1);
		expect(scope.has("A")).toBe(true);
		expect(scope.has("B")).toBe(true);
		expect(scope.has("C")).toBe(false);
	});

	it("includes component names derived from props with multiple props per component", () => {
		const symbols = makeSymbols({
			props: [
				{ kind: "prop", name: "name", filePath: "/src/Comp.svelte", componentName: "Comp", type: "string", isRequired: true },
				{ kind: "prop", name: "count", filePath: "/src/Comp.svelte", componentName: "Comp", type: "number", isRequired: false },
			],
		});
		const edgeSet = createEdgeSet([]);
		const scope = resolveGlobalScope(symbols, edgeSet, 0);
		expect(scope.has("Comp")).toBe(true);
		expect(scope.size).toBe(1);
	});

	it("handles disconnected symbols with depth limit", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "A", filePath: "/src/A.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "B", filePath: "/src/B.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([]);
		const scope = resolveGlobalScope(symbols, edgeSet, 1);
		expect(scope.size).toBe(2);
	});
});

describe("filterByExcludePatterns", () => {
	it("returns same symbols and edges when patterns empty", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "Foo", filePath: "/src/Foo.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([]);
		const result = filterByExcludePatterns(symbols, edgeSet, []);
		expect(result.symbols.classes).toHaveLength(1);
	});

	it("excludes symbols whose filePath matches a simple glob", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "Foo", filePath: "/src/Foo.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Bar", filePath: "/src/test/Bar.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([]);
		const result = filterByExcludePatterns(symbols, edgeSet, ["**/test/**"]);
		expect(result.symbols.classes).toHaveLength(1);
		expect(result.symbols.classes[0].name).toBe("Foo");
	});

	it("removes edges connected to excluded symbols", () => {
		const symbols = makeSymbols({
			classes: [
				{ kind: "class", name: "Keep", filePath: "/src/Keep.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
				{ kind: "class", name: "Remove", filePath: "/src/hidden/Remove.ts", extends: undefined, implements: [], members: [], isGeneric: false, typeParams: [] },
			],
		});
		const edgeSet = createEdgeSet([
			{ source: "Keep", target: "Remove", type: "dependency" as const },
		]);
		const result = filterByExcludePatterns(symbols, edgeSet, ["**/hidden/**"]);
		expect(result.symbols.classes).toHaveLength(1);
		expect(result.edges.edges).toHaveLength(0);
	});
});
