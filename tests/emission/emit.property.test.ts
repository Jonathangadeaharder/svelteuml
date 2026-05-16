import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { emitPlantUML } from "../../src/emission/plantuml-emitter.js";
import type { ComponentSymbol, SymbolTable } from "../../src/types/ast.js";
import type { Edge, EdgeType } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

const ALL_EDGE_TYPES: EdgeType[] = [
	"extends",
	"implements",
	"composition",
	"aggregation",
	"dependency",
	"association",
	"state_dependency",
	"prop_flow",
	"event",
	"slot",
	"server_load",
	"component_usage",
];

const SAFE_NAMES: string[] = [
	"Button",
	"Card",
	"Header",
	"Footer",
	"Sidebar",
	"Modal",
	"Form",
	"Input",
	"Avatar",
	"Badge",
	"Tabs",
	"Table",
	"List",
	"Navbar",
	"Dropdown",
	"Tooltip",
	"Popover",
	"Alert",
	"Spinner",
	"Progress",
];

function arbComponentGraph(): fc.Arbitrary<{
	symbols: SymbolTable;
	edges: Edge[];
}> {
	return fc.shuffledSubarray(SAFE_NAMES, { minLength: 1, maxLength: 15 }).chain((names) => {
		const components = names.map(
			(name): ComponentSymbol => ({
				kind: "component",
				name,
				filePath: `src/lib/${name}.svelte`,
			}),
		);
		const edgeArb = fc.array(
			fc.record({
				source: fc.constantFrom(...names),
				target: fc.constantFrom(...names),
				type: fc.constantFrom(...ALL_EDGE_TYPES),
				label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
					nil: undefined,
				}),
			}),
			{ maxLength: 25 },
		);
		return edgeArb.map((edges) => ({
			symbols: {
				classes: [],
				functions: [],
				stores: [],
				props: [],
				events: [],
				exports: [],
				routes: [],
				components,
			},
			edges,
		}));
	});
}

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 1000;

describe("PlantUML emission property tests", () => {
	it("output always starts with @startuml and ends with @enduml", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const result = emitPlantUML(symbols, createEdgeSet(edges));
				const content = result.content.trim();
				expect(content.startsWith("@startuml")).toBe(true);
				expect(content.endsWith("@enduml")).toBe(true);
			}),
			{ numRuns },
		);
	});

	it("no duplicate declarations for any symbol", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const result = emitPlantUML(symbols, createEdgeSet(edges));
				const lines = result.content.split("\n");
				const seen = new Set<string>();
				for (const raw of lines) {
					const line = raw.trim();
					const match = /^(?:class|interface|abstract\s+class)\s+"([^"]+)"/.exec(line);
					if (match) {
						const name = match[1];
						expect(seen.has(name)).toBe(false);
						seen.add(name);
					}
				}
			}),
			{ numRuns },
		);
	});

	it("all components appear in output", () => {
		fc.assert(
			fc.property(arbComponentGraph(), ({ symbols, edges }) => {
				const result = emitPlantUML(symbols, createEdgeSet(edges));
				const content = result.content;
				for (const comp of symbols.components) {
					expect(content).toContain(`class "${comp.name}" <<component>>`);
				}
			}),
			{ numRuns },
		);
	});
});
