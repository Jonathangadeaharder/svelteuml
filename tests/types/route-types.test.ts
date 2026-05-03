import { describe, expect, it } from "vitest";
import type { RouteParam, RouteSegment, RouteSymbol, SymbolTable } from "../../src/types/ast.js";

describe("route types", () => {
	it("RouteParam has required fields", () => {
		const param: RouteParam = {
			name: "id",
			kind: "dynamic",
		};
		expect(param.name).toBe("id");
		expect(param.kind).toBe("dynamic");
	});

	it("RouteParam with matcher", () => {
		const param: RouteParam = {
			name: "id",
			kind: "dynamic",
			matcher: "integer",
		};
		expect(param.matcher).toBe("integer");
	});

	it("RouteSegment has required fields", () => {
		const seg: RouteSegment = {
			raw: "/game/[code]",
			params: [{ name: "code", kind: "dynamic" }],
			groups: [],
		};
		expect(seg.raw).toBe("/game/[code]");
		expect(seg.params).toHaveLength(1);
	});

	it("RouteSymbol has required fields", () => {
		const route: RouteSymbol = {
			kind: "route",
			name: "+page",
			filePath: "/src/routes/+page.svelte",
			routeKind: "page",
			isServer: false,
			routeSegment: {
				raw: "/",
				params: [],
				groups: [],
			},
		};
		expect(route.routeKind).toBe("page");
		expect(route.kind).toBe("route");
	});

	it("SymbolTable has routes field", () => {
		const table: SymbolTable = {
			classes: [],
			functions: [],
			stores: [],
			props: [],
			exports: [],
			routes: [],
			components: [],
		};
		expect(table.routes).toEqual([]);
	});
});
