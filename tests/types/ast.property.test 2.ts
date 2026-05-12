import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { RouteFileKind, RouteParamKind, Visibility } from "../../src/types/ast.js";
import {
	arbClassSymbol,
	arbComponentSymbol,
	arbExportSymbol,
	arbFunctionSymbol,
	arbMemberSymbol,
	arbParameterSymbol,
	arbPropSymbol,
	arbRouteSymbol,
	arbStoreSymbol,
	arbSymbolInfo,
	arbSymbolTable,
	arbVisibility,
} from "../arbitraries/svelte-ast.js";

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

const visibilityValues: Visibility[] = ["public", "private", "protected"];
const routeParamKindValues: RouteParamKind[] = ["dynamic", "rest", "optional"];
const routeFileKindValues: RouteFileKind[] = ["page", "layout", "error", "server"];

describe("Svelte AST property-based smoke test", () => {
	it("visibility generates only valid values", () => {
		fc.assert(
			fc.property(arbVisibility(), (v) => {
				expect(visibilityValues).toContain(v);
			}),
			{ numRuns },
		);
	});

	it("ParameterSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbParameterSymbol(), (p) => {
				expect(typeof p.name).toBe("string");
				expect(p.name.length).toBeGreaterThan(0);
				expect(typeof p.type).toBe("string");
				expect(p.type.length).toBeGreaterThan(0);
				expect(typeof p.isOptional).toBe("boolean");
			}),
			{ numRuns },
		);
	});

	it("MemberSymbol generates both property and method variants", () => {
		let sawProperty = false;
		let sawMethod = false;
		fc.assert(
			fc.property(arbMemberSymbol(), (m) => {
				expect(["property", "method"]).toContain(m.kind);
				expect(typeof m.name).toBe("string");
				expect(m.name.length).toBeGreaterThan(0);
				expect(typeof m.type).toBe("string");
				expect(m.type.length).toBeGreaterThan(0);
				expect(typeof m.isStatic).toBe("boolean");
				expect(typeof m.isAbstract).toBe("boolean");
				expect(typeof m.isReadonly).toBe("boolean");
				expect(visibilityValues).toContain(m.visibility);
				if (m.kind === "method") {
					sawMethod = true;
					expect(Array.isArray(m.parameters)).toBe(true);
				} else {
					sawProperty = true;
				}
			}),
			{ numRuns: 200 },
		);
		expect(sawProperty).toBe(true);
		expect(sawMethod).toBe(true);
	});

	it("ClassSymbol generates all three kinds", () => {
		let sawClass = false;
		let sawInterface = false;
		let sawAbstract = false;
		fc.assert(
			fc.property(arbClassSymbol(), (c) => {
				expect(["class", "interface", "abstract-class"]).toContain(c.kind);
				expect(typeof c.name).toBe("string");
				expect(c.name.length).toBeGreaterThan(0);
				expect(typeof c.filePath).toBe("string");
				expect(c.filePath.length).toBeGreaterThan(0);
				expect(Array.isArray(c.implements)).toBe(true);
				expect(Array.isArray(c.members)).toBe(true);
				expect(typeof c.isGeneric).toBe("boolean");
				expect(Array.isArray(c.typeParams)).toBe(true);
				if (c.kind === "class") sawClass = true;
				if (c.kind === "interface") sawInterface = true;
				if (c.kind === "abstract-class") sawAbstract = true;
			}),
			{ numRuns: 200 },
		);
		expect(sawClass).toBe(true);
		expect(sawInterface).toBe(true);
		expect(sawAbstract).toBe(true);
	});

	it("FunctionSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbFunctionSymbol(), (fn) => {
				expect(fn.kind).toBe("function");
				expect(typeof fn.name).toBe("string");
				expect(fn.name.length).toBeGreaterThan(0);
				expect(typeof fn.filePath).toBe("string");
				expect(fn.filePath.length).toBeGreaterThan(0);
				expect(typeof fn.isExported).toBe("boolean");
				expect(typeof fn.isAsync).toBe("boolean");
				expect(Array.isArray(fn.parameters)).toBe(true);
				expect(Array.isArray(fn.typeParams)).toBe(true);
			}),
			{ numRuns },
		);
	});

	it("StoreSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbStoreSymbol(), (s) => {
				expect(s.kind).toBe("store");
				expect(typeof s.name).toBe("string");
				expect(s.name.length).toBeGreaterThan(0);
				expect(typeof s.filePath).toBe("string");
				expect(s.filePath.length).toBeGreaterThan(0);
				expect(["writable", "readable", "derived"]).toContain(s.storeType);
				expect(typeof s.valueType).toBe("string");
				expect(s.valueType.length).toBeGreaterThan(0);
			}),
			{ numRuns },
		);
	});

	it("PropSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbPropSymbol(), (p) => {
				expect(p.kind).toBe("prop");
				expect(typeof p.name).toBe("string");
				expect(p.name.length).toBeGreaterThan(0);
				expect(typeof p.filePath).toBe("string");
				expect(p.filePath.length).toBeGreaterThan(0);
				expect(typeof p.componentName).toBe("string");
				expect(p.componentName.length).toBeGreaterThan(0);
				expect(typeof p.type).toBe("string");
				expect(p.type.length).toBeGreaterThan(0);
				expect(typeof p.isRequired).toBe("boolean");
			}),
			{ numRuns },
		);
	});

	it("ExportSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbExportSymbol(), (e) => {
				expect(e.kind).toBe("export");
				expect(typeof e.name).toBe("string");
				expect(e.name.length).toBeGreaterThan(0);
				expect(typeof e.filePath).toBe("string");
				expect(e.filePath.length).toBeGreaterThan(0);
				expect(["value", "function", "class", "type", "default"]).toContain(e.exportType);
			}),
			{ numRuns },
		);
	});

	it("RouteSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbRouteSymbol(), (r) => {
				expect(r.kind).toBe("route");
				expect(typeof r.name).toBe("string");
				expect(r.name.length).toBeGreaterThan(0);
				expect(typeof r.filePath).toBe("string");
				expect(r.filePath.length).toBeGreaterThan(0);
				expect(routeFileKindValues).toContain(r.routeKind);
				expect(typeof r.isServer).toBe("boolean");
				expect(typeof r.routeSegment.raw).toBe("string");
				expect(Array.isArray(r.routeSegment.params)).toBe(true);
				expect(Array.isArray(r.routeSegment.groups)).toBe(true);
				for (const param of r.routeSegment.params) {
					expect(routeParamKindValues).toContain(param.kind);
					expect(typeof param.name).toBe("string");
					expect(param.name.length).toBeGreaterThan(0);
				}
			}),
			{ numRuns },
		);
	});

	it("ComponentSymbol has valid structure", () => {
		fc.assert(
			fc.property(arbComponentSymbol(), (c) => {
				expect(c.kind).toBe("component");
				expect(typeof c.name).toBe("string");
				expect(c.name.length).toBeGreaterThan(0);
				expect(typeof c.filePath).toBe("string");
				expect(c.filePath.length).toBeGreaterThan(0);
			}),
			{ numRuns },
		);
	});

	it("SymbolInfo generates each variant over 200 runs", () => {
		const seen = new Set<string>();
		fc.assert(
			fc.property(arbSymbolInfo(), (s) => {
				seen.add(s.kind);
				const validKinds = [
					"class",
					"interface",
					"abstract-class",
					"function",
					"store",
					"prop",
					"export",
					"route",
					"component",
				];
				expect(validKinds).toContain(s.kind);
			}),
			{ numRuns: 500 },
		);
		expect(seen.has("class") || seen.has("interface") || seen.has("abstract-class")).toBe(true);
		expect(seen.has("function")).toBe(true);
		expect(seen.has("store")).toBe(true);
		expect(seen.has("prop")).toBe(true);
		expect(seen.has("export")).toBe(true);
		expect(seen.has("route")).toBe(true);
		expect(seen.has("component")).toBe(true);
	});

	it("SymbolTable can hold all symbol types", () => {
		fc.assert(
			fc.property(arbSymbolTable(), (t) => {
				expect(Array.isArray(t.classes)).toBe(true);
				expect(Array.isArray(t.functions)).toBe(true);
				expect(Array.isArray(t.stores)).toBe(true);
				expect(Array.isArray(t.props)).toBe(true);
				expect(Array.isArray(t.exports)).toBe(true);
				expect(Array.isArray(t.routes)).toBe(true);
				expect(Array.isArray(t.components)).toBe(true);
			}),
			{ numRuns },
		);
	});
});
