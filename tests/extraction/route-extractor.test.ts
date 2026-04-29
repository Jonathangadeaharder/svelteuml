import { describe, expect, it } from "vitest";
import { Project, SyntaxKind } from "ts-morph";
import {
	classifyRouteFile,
	extractRouteExports,
	extractRouteFileSymbol,
	isRouteFile,
	routeSegmentFromPath,
} from "../../src/extraction/route-extractor.js";

describe("isRouteFile", () => {
	it("detects +page.svelte", () => {
		expect(isRouteFile("/src/routes/+page.svelte")).toBe(true);
	});

	it("detects +page.ts", () => {
		expect(isRouteFile("/src/routes/+page.ts")).toBe(true);
	});

	it("detects +page.server.ts", () => {
		expect(isRouteFile("/src/routes/+page.server.ts")).toBe(true);
	});

	it("detects +layout.svelte", () => {
		expect(isRouteFile("/src/routes/+layout.svelte")).toBe(true);
	});

	it("detects +layout.server.ts", () => {
		expect(isRouteFile("/src/routes/+layout.server.ts")).toBe(true);
	});

	it("detects +error.svelte", () => {
		expect(isRouteFile("/src/routes/+error.svelte")).toBe(true);
	});

	it("detects +server.ts", () => {
		expect(isRouteFile("/src/routes/api/songs/+server.ts")).toBe(true);
	});

	it("detects +server.js", () => {
		expect(isRouteFile("/src/routes/api/+server.js")).toBe(true);
	});

	it("does NOT flag regular .svelte files", () => {
		expect(isRouteFile("/src/lib/Button.svelte")).toBe(false);
	});

	it("does NOT flag regular .ts files", () => {
		expect(isRouteFile("/src/lib/utils.ts")).toBe(false);
	});
});

describe("classifyRouteFile", () => {
	it("classifies +page.svelte as page (non-server)", () => {
		const r = classifyRouteFile("/src/routes/+page.svelte");
		expect(r?.kind).toBe("page");
		expect(r?.isServer).toBe(false);
	});

	it("classifies +page.server.ts as page (server)", () => {
		const r = classifyRouteFile("/src/routes/game/[code]/+page.server.ts");
		expect(r?.kind).toBe("page");
		expect(r?.isServer).toBe(true);
	});

	it("classifies +layout.server.ts as layout (server)", () => {
		const r = classifyRouteFile("/src/routes/+layout.server.ts");
		expect(r?.kind).toBe("layout");
		expect(r?.isServer).toBe(true);
	});

	it("classifies +error.svelte as error (non-server)", () => {
		const r = classifyRouteFile("/src/routes/+error.svelte");
		expect(r?.kind).toBe("error");
		expect(r?.isServer).toBe(false);
	});

	it("classifies +server.ts as server (server)", () => {
		const r = classifyRouteFile("/src/routes/api/+server.ts");
		expect(r?.kind).toBe("server");
		expect(r?.isServer).toBe(true);
	});

	it("returns null for non-route files", () => {
		expect(classifyRouteFile("/src/lib/utils.ts")).toBeNull();
	});
});

describe("routeSegmentFromPath", () => {
	it("returns / for root route", () => {
		expect(routeSegmentFromPath("/project/src/routes/+page.svelte")).toBe("/");
	});

	it("returns /game/[code] for nested route", () => {
		expect(routeSegmentFromPath("/project/src/routes/game/[code]/+page.svelte")).toBe(
			"/game/[code]",
		);
	});

	it("returns /auth/login for auth login route", () => {
		expect(routeSegmentFromPath("/project/src/routes/auth/login/+page.svelte")).toBe("/auth/login");
	});

	it("falls back to / when path does not contain src/routes", () => {
		expect(routeSegmentFromPath("/project/src/lib/utils.ts")).toBe("/");
	});

	it("handles single-segment routes", () => {
		expect(routeSegmentFromPath("/project/src/routes/about/+page.svelte")).toBe("/about");
	});
});

describe("extractRouteFileSymbol", () => {
	it("returns null for non-route files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile("/src/lib/utils.ts", "export function helper() {}");
		const result = extractRouteFileSymbol(sf, "/src/lib/utils.ts");
		expect(result).toBeNull();
	});

	it("returns null for skip files (.d.ts)", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/$types.d.ts",
			"export type PageData = {};",
		);
		const result = extractRouteFileSymbol(sf, "/src/routes/$types.d.ts");
		expect(result).toBeNull();
	});

	it("extracts .svelte route file with empty exportedFunctions", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.svelte",
			"export default {};",
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/+page.svelte");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("page");
		expect(result?.isServer).toBe(false);
		expect(result?.exportedFunctions).toEqual([]);
		expect(result?.routeSegment).toBe("/");
	});

	it("extracts .ts route file with load function", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			"export async function load() { return {}; }",
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/+page.ts");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("page");
		expect(result?.isServer).toBe(false);
		expect(result?.exportedFunctions.length).toBeGreaterThan(0);
	});

	it("classifies +layout.server.ts as layout server", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/admin/+layout.server.ts",
			"export async function load() { return {}; }",
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/admin/+layout.server.ts");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("layout");
		expect(result?.isServer).toBe(true);
		expect(result?.routeSegment).toBe("/admin");
	});
});

describe("extractRouteExports", () => {
	it("extracts arrow function load export", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/+page.ts",
			"export const load = async ({ params }) => { return {}; };",
		);
		const result = extractRouteExports(sf, "/src/routes/+page.ts");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]?.name).toBe("load");
	});

	it("extracts actions as object export", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/+page.server.ts",
			"export const actions = { default: async () => {} };",
		);
		const result = extractRouteExports(sf, "/src/routes/+page.server.ts");
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]?.name).toBe("actions");
	});

	it("ignores non-exported functions", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/+page.ts",
			"async function load() { return {}; }",
		);
		const result = extractRouteExports(sf, "/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});

	it("ignores unknown named exports", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/+page.ts",
			"export function somethingElse() {}",
		);
		const result = extractRouteExports(sf, "/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});

	it("skips .d.ts files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/src/routes/$types.d.ts",
			"export type PageData = {};",
		);
		const result = extractRouteExports(sf, "/src/routes/$types.d.ts");
		expect(result).toHaveLength(0);
	});
});
