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
