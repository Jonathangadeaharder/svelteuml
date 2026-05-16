import { describe, expect, it } from "vitest";
import { buildServerLoadEdges } from "../../src/dependency/server-load-builder.js";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import type { ComponentSymbol, RouteSymbol, SymbolTable } from "../../src/types/ast.js";

function makeRoute(
	overrides: Partial<RouteSymbol> & { name: string; filePath: string },
): RouteSymbol {
	return {
		kind: "route",
		routeKind: "page",
		isServer: false,
		routeSegment: { raw: "/", params: [], groups: [] },
		...overrides,
	};
}

function makeComponent(name: string, filePath: string): ComponentSymbol {
	return { kind: "component", name, filePath };
}

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

describe("buildServerLoadEdges", () => {
	it("returns empty array for empty symbols", () => {
		const pp = new ParsingProject();
		const result = buildServerLoadEdges(makeSymbolTable(), pp);
		expect(result).toHaveLength(0);
	});

	it("returns empty when no server routes exist", () => {
		const pp = new ParsingProject();
		const symbols = makeSymbolTable({
			routes: [makeRoute({ name: "+page", filePath: "/src/routes/+page.svelte", isServer: false })],
		});
		const result = buildServerLoadEdges(symbols, pp);
		expect(result).toHaveLength(0);
	});

	it("creates edge when svelte page uses $page.data from server load", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+page.svelte",
			`
				import { page } from '$app/stores';
				let data = page.data;
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
				}),
				makeRoute({
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
				}),
			],
			components: [makeComponent("+page", "/src/routes/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(1);
		expect(edges[0]?.type).toBe("server_load");
		expect(edges[0]?.source).toBe("/src/routes/+page.server.ts");
		expect(edges[0]?.target).toBe("/src/routes/+page.svelte");
		expect(edges[0]?.label).toBe("$page.data");
	});

	it("creates edge for layout server with $page.url usage", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+layout.svelte",
			`
				import { page } from '$app/stores';
				let currentUrl = page.url;
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+layout.server",
					filePath: "/src/routes/+layout.server.ts",
					routeKind: "layout",
					isServer: true,
				}),
				makeRoute({
					name: "+layout",
					filePath: "/src/routes/+layout.svelte",
					routeKind: "layout",
					isServer: false,
				}),
			],
			components: [makeComponent("+layout", "/src/routes/+layout.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(1);
		expect(edges[0]?.type).toBe("server_load");
		expect(edges[0]?.source).toBe("/src/routes/+layout.server.ts");
		expect(edges[0]?.target).toBe("/src/routes/+layout.svelte");
		expect(edges[0]?.label).toBe("$page.url");
	});

	it("includes multiple page props in label when multiple are accessed", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+page.svelte",
			`
				import { page } from '$app/stores';
				let data = page.data;
				let url = page.url;
				let params = page.params;
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
				}),
				makeRoute({
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
				}),
			],
			components: [makeComponent("+page", "/src/routes/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(1);
		expect(edges[0]?.type).toBe("server_load");
		// Should list all accessed page props sorted
		const parts = edges[0]?.label?.split(", ");
		expect(parts).toContain("$page.data");
		expect(parts).toContain("$page.url");
		expect(parts).toContain("$page.params");
	});

	it("skips edge when svelte file does not use $page store", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+page.svelte",
			`
				<script>
					let greeting = "hello";
				</script>
				<h1>{greeting}</h1>
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
				}),
				makeRoute({
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
				}),
			],
			components: [makeComponent("+page", "/src/routes/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(0);
	});

	it("skips edge when no matching svelte file exists for server route", () => {
		const pp = new ParsingProject();
		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
				}),
			],
			components: [],
		});
		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(0);
	});

	it("handles nested route segments correctly", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/game/[code]/+page.svelte",
			`
				import { page } from '$app/stores';
				let gameData = page.data;
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/game/[code]/+page.server.ts",
					routeKind: "page",
					isServer: true,
					routeSegment: {
						raw: "/game/[code]",
						params: [{ kind: "dynamic", name: "code" }],
						groups: [],
					},
				}),
				makeRoute({
					name: "+page",
					filePath: "/src/routes/game/[code]/+page.svelte",
					routeKind: "page",
					isServer: false,
					routeSegment: {
						raw: "/game/[code]",
						params: [{ kind: "dynamic", name: "code" }],
						groups: [],
					},
				}),
			],
			components: [makeComponent("+page", "/src/routes/game/[code]/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(1);
		expect(edges[0]?.source).toBe("/src/routes/game/[code]/+page.server.ts");
		expect(edges[0]?.target).toBe("/src/routes/game/[code]/+page.svelte");
	});

	it("deduplicates edges between same server and svelte file", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+page.svelte",
			`
				import { page } from '$app/stores';
				let data = page.data;
			`,
		);

		// Two server routes with same directory (shouldn't happen but test dedup)
		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page.server",
					filePath: "/src/routes/+page.server.ts",
					routeKind: "page",
					isServer: true,
				}),
				makeRoute({
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
				}),
			],
			components: [makeComponent("+page", "/src/routes/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(1);
	});

	it("handles no server routes with matching svelte file gracefully", () => {
		const pp = new ParsingProject();
		pp.addPlainSourceFile(
			"/src/routes/+page.svelte",
			`
				import { page } from '$app/stores';
				let data = page.data;
			`,
		);

		const symbols = makeSymbolTable({
			routes: [
				makeRoute({
					name: "+page",
					filePath: "/src/routes/+page.svelte",
					routeKind: "page",
					isServer: false,
				}),
			],
			components: [makeComponent("+page", "/src/routes/+page.svelte")],
		});

		const edges = buildServerLoadEdges(symbols, pp);
		expect(edges).toHaveLength(0);
	});
});
