import { describe, expect, it } from "vitest";
import {
	filterEdgesByScope,
	filterSymbolsByScope,
	resolveFocusScope,
} from "../../src/emission/focus.js";
import { emitPlantUML } from "../../src/emission/plantuml-emitter.js";
import type { ClassSymbol, SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS, DEFAULT_STEREOTYPE_COLORS } from "../../src/types/diagram.js";
import type { Edge } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeClass(name: string, filePath?: string): ClassSymbol {
	return {
		kind: "class",
		name,
		filePath: filePath ?? `/src/${name}.ts`,
		extends: undefined,
		implements: [],
		members: [],
		isGeneric: false,
		typeParams: [],
	};
}

function makeSymbols(overrides?: Partial<SymbolTable>): SymbolTable {
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

describe("PlantUML snapshot: class diagram", () => {
	it("emits valid PlantUML with classes and edges", () => {
		const symbols = makeSymbols({
			classes: [makeClass("App"), makeClass("Router"), makeClass("Store")],
		});
		const edges: Edge[] = [
			{ source: "App", target: "Router", type: "dependency" },
			{ source: "App", target: "Store", type: "composition" },
		];
		const edgeSet = createEdgeSet(edges);
		const result = emitPlantUML(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});

	it("emits valid PlantUML with stores and functions", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Counter")],
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/stores/count.ts",
					storeType: "writable",
					valueType: "number",
					runeKind: "state",
					isExported: true,
				},
			],
			functions: [
				{
					kind: "function",
					name: "formatCount",
					filePath: "/src/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "string",
					typeParams: [],
				},
			],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitPlantUML(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});

	it("emits valid PlantUML with focus mode", () => {
		const symbols = makeSymbols({
			classes: [makeClass("App"), makeClass("Router"), makeClass("Store"), makeClass("Logger")],
		});
		const edges: Edge[] = [
			{ source: "App", target: "Router", type: "dependency" },
			{ source: "App", target: "Store", type: "composition" },
			{ source: "Store", target: "Logger", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);
		const scope = resolveFocusScope(symbols, edgeSet, { focusNode: "App", depth: 1 });
		const filteredSymbols = filterSymbolsByScope(symbols, scope);
		const filteredEdges = filterEdgesByScope(edgeSet.edges, scope);
		const filteredEdgeSet = createEdgeSet(filteredEdges);
		const result = emitPlantUML(filteredSymbols, filteredEdgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
		expect(result.content).not.toContain("Logger");
	});

	it("produces identical output on repeated calls (determinism)", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Zebra"), makeClass("Apple"), makeClass("Banana")],
			stores: [
				{
					kind: "store",
					name: "delta",
					filePath: "/src/stores/delta.ts",
					storeType: "writable",
					valueType: "number",
				},
				{
					kind: "store",
					name: "alpha",
					filePath: "/src/stores/alpha.ts",
					storeType: "readable",
					valueType: "string",
				},
			],
			functions: [
				{
					kind: "function",
					name: "zeta",
					filePath: "/src/zeta.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
				{
					kind: "function",
					name: "beta",
					filePath: "/src/beta.ts",
					isExported: false,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const edges: Edge[] = [
			{ source: "Zebra", target: "Apple", type: "dependency" },
			{ source: "Apple", target: "Banana", type: "composition" },
			{ source: "Apple", target: "Banana", type: "dependency" },
			{ source: "Banana", target: "Zebra", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);

		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, kind: "class" as const, stereotypeColors: {} };
		const first = emitPlantUML(symbols, edgeSet, opts).content;
		const second = emitPlantUML(symbols, edgeSet, opts).content;
		expect(first).toBe(second);

		const lines = first.split("\n");
		const bareClassLines = lines.filter(
			(l) => /^(?:class|interface) "\w+"/.test(l) && !l.includes("<<"),
		);
		const bareClassNames = bareClassLines.map((l) => l.match(/^class "(\w+)"/)?.[1] ?? "");
		expect(bareClassNames).toEqual([...bareClassNames].sort((a, b) => a.localeCompare(b)));

		const edgeLines = lines.filter((l) =>
			/^[A-Za-z_]\S* (\.\.\||\.\.>|\*--|o--|-->|<\|--)/.test(l),
		);
		const edgeTypeMap: Record<string, string> = {
			"<|--": "extends",
			"..|>": "implements",
			"*--": "composition",
			"o--": "aggregation",
			"..>": "dependency",
			"-->": "association",
		};
		const edgeSorted = [...edgeLines].sort((a, b) => {
			const [, srcA, symA, tgtA] = a.match(/^(\S+) (\S+) (\S+)/) ?? [];
			const [, srcB, symB, tgtB] = b.match(/^(\S+) (\S+) (\S+)/) ?? [];
			const bySrc = srcA.localeCompare(srcB);
			if (bySrc !== 0) return bySrc;
			const byTgt = tgtA.localeCompare(tgtB);
			if (byTgt !== 0) return byTgt;
			return (edgeTypeMap[symA] ?? symA).localeCompare(edgeTypeMap[symB] ?? symB);
		});
		expect(edgeLines).toEqual(edgeSorted);
	});
});

describe("PlantUML snapshot: package diagram", () => {
	it("emits valid PlantUML with packages", () => {
		const symbols = makeSymbols({
			classes: [
				{ ...makeClass("App"), filePath: "/src/routes/App.ts" },
				{ ...makeClass("Layout"), filePath: "/src/lib/Layout.ts" },
			],
		});
		const edges: Edge[] = [
			{ source: "/src/routes/App.ts", target: "/src/lib/Layout.ts", type: "dependency" },
		];
		const edgeSet = createEdgeSet(edges);
		const result = emitPlantUML(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
			stereotypeColors: {},
		});
		expect(result.content).toMatchSnapshot();
	});
});

describe("PlantUML snapshot: color theme and layout", () => {
	it("emits PlantUML with color theme", () => {
		const symbols = makeSymbols({
			classes: [makeClass("MyComponent")],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitPlantUML(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			stereotypeColors: DEFAULT_STEREOTYPE_COLORS,
		});
		expect(result.content).toContain("skinparam class<<component>>");
		expect(result.content).toContain("legend right");
	});

	it("emits PlantUML with layout direction", () => {
		const symbols = makeSymbols({
			classes: [makeClass("Widget")],
		});
		const edgeSet = createEdgeSet([]);
		const result = emitPlantUML(symbols, edgeSet, {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			layoutDirection: "left-to-right",
			stereotypeColors: {},
		});
		expect(result.content).toContain("left to right direction");
	});
});
