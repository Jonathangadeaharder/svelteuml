import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Edge } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

const edgeTypes = [
	"extends",
	"implements",
	"composition",
	"aggregation",
	"dependency",
	"association",
	"state_dependency",
	"event",
	"component_usage",
] as const;

function arbEdgeType() {
	return fc.constantFrom(...edgeTypes);
}

function arbEdge(): fc.Arbitrary<Edge> {
	return fc.record({
		source: fc.string({ minLength: 1, maxLength: 30 }),
		target: fc.string({ minLength: 1, maxLength: 30 }),
		type: arbEdgeType(),
		label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
	});
}

function arbEdgeList(): fc.Arbitrary<Edge[]> {
	return fc.array(arbEdge(), { minLength: 0, maxLength: 50 });
}

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

describe("Edge property tests", () => {
	it("edge type is always one of the defined EdgeType values", () => {
		fc.assert(
			fc.property(arbEdge(), (edge) => {
				expect(edgeTypes).toContain(edge.type);
			}),
			{ numRuns },
		);
	});

	it("source and target are always non-empty strings", () => {
		fc.assert(
			fc.property(arbEdge(), (edge) => {
				expect(typeof edge.source).toBe("string");
				expect(edge.source.length).toBeGreaterThan(0);
				expect(typeof edge.target).toBe("string");
				expect(edge.target.length).toBeGreaterThan(0);
			}),
			{ numRuns },
		);
	});

	it("createEdgeSet preserves all input edges", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const edgeSet = createEdgeSet(edges);
				expect(edgeSet.edges.length).toBe(edges.length);
			}),
			{ numRuns },
		);
	});
});
