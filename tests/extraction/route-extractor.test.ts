import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
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

describe("extractRouteExports", () => {
	it("extracts named export function load", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			`export async function load({ params }) { return { props: {} }; }`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/+page.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("load");
		expect(result[0]?.isAsync).toBe(true);
	});

	it("extracts arrow function export load", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			`export const load = async ({ params }) => ({ props: {} });`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/+page.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("load");
	});

	it("extracts actions as object literal", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.server.ts",
			`export const actions = { default: async () => {} };`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/+page.server.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("actions");
	});

	it("extracts GET and POST from server file", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/api/+server.ts",
			`export function GET() { return new Response(); }\nexport function POST() { return new Response(); }`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/api/+server.ts");
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.name)).toContain("GET");
		expect(result.map((r) => r.name)).toContain("POST");
	});

	it("skips unknown named exports", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			`export function helper() {}`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});

	it("skips non-function variable exports", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			`export const data = { foo: 1 };`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});

	it("skips files that should be skipped", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/.svelte-kit/types/+page.ts",
			`export function load() {}`,
			{ overwrite: true },
		);
		const result = extractRouteExports(sf, "/project/.svelte-kit/types/+page.ts");
		expect(result).toHaveLength(0);
	});
});

describe("extractRouteFileSymbol", () => {
	it("extracts route symbol for +page.ts with exports", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.ts",
			`export async function load() { return {}; }`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/+page.ts");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("page");
		expect(result?.isServer).toBe(false);
		expect(result?.routeSegment).toBe("/");
		expect(result?.exportedFunctions).toHaveLength(1);
	});

	it("returns null for non-route files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/lib/utils.ts",
			`export function helper() {}`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/src/lib/utils.ts");
		expect(result).toBeNull();
	});

	it("returns route symbol with empty functions for .svelte files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/+page.svelte",
			`<script>export let name;</script><p>{name}</p>`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/+page.svelte");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("page");
		expect(result?.exportedFunctions).toHaveLength(0);
	});

	it("returns null for skipped files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/.svelte-kit/routes/+page.ts",
			`export function load() {}`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/.svelte-kit/routes/+page.ts");
		expect(result).toBeNull();
	});

	it("extracts route segment for nested route", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/game/[code]/+page.server.ts",
			`export function load() {}`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/game/[code]/+page.server.ts");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("page");
		expect(result?.isServer).toBe(true);
		expect(result?.routeSegment).toBe("/game/[code]");
	});

	it("handles +layout.svelte route files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile("/project/src/routes/+layout.svelte", `<slot />`, {
			overwrite: true,
		});
		const result = extractRouteFileSymbol(sf, "/project/src/routes/+layout.svelte");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("layout");
		expect(result?.exportedFunctions).toHaveLength(0);
	});

	it("handles +server.ts route files", () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sf = project.createSourceFile(
			"/project/src/routes/api/songs/+server.ts",
			`export function GET() { return new Response(); }`,
			{ overwrite: true },
		);
		const result = extractRouteFileSymbol(sf, "/project/src/routes/api/songs/+server.ts");
		expect(result).not.toBeNull();
		expect(result?.kind).toBe("server");
		expect(result?.isServer).toBe(true);
		expect(result?.exportedFunctions).toHaveLength(1);
	});
});
