import { describe, expect, it } from "vitest";
import { routeStereotype } from "../../src/emission/route-utils.js";
import type { RouteSymbol } from "../../src/types/ast.js";

function makeRoute(overrides: Partial<RouteSymbol> = {}): RouteSymbol {
	return {
		kind: "route",
		name: "+page",
		filePath: "/src/routes/+page.svelte",
		routeKind: "page",
		isServer: false,
		routeSegment: { raw: "/", params: [], groups: [] },
		...overrides,
	};
}

describe("routeStereotype", () => {
	it("returns 'page' for page route", () => {
		expect(routeStereotype(makeRoute({ routeKind: "page", isServer: false }))).toBe("page");
	});

	it("returns 'layout' for layout route", () => {
		expect(routeStereotype(makeRoute({ routeKind: "layout", isServer: false }))).toBe("layout");
	});

	it("returns 'server' for server route", () => {
		expect(routeStereotype(makeRoute({ routeKind: "server", isServer: true }))).toBe("endpoint");
	});

	it("returns 'error-page' for error route", () => {
		expect(routeStereotype(makeRoute({ routeKind: "error", isServer: false }))).toBe("error-page");
	});

	it("returns 'PageLoad' for page route with server flag", () => {
		expect(routeStereotype(makeRoute({ routeKind: "page", isServer: true }))).toBe("PageLoad");
	});

	it("returns 'LayoutLoad' for layout route with server flag", () => {
		expect(routeStereotype(makeRoute({ routeKind: "layout", isServer: true }))).toBe("LayoutLoad");
	});

	it("falls back to routeKind for unknown kinds", () => {
		expect(
			routeStereotype(makeRoute({ routeKind: "custom" as unknown as RouteSymbol["routeKind"] })),
		).toBe("custom");
	});
});
