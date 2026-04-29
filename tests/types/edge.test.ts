import { describe, expect, it } from "vitest";
import type { Edge, EdgeType } from "../../src/types/edge.js";
import { createEdgeSet } from "../../src/types/edge.js";

describe("src/types/edge.ts", () => {
	describe("EdgeType", () => {
		it("accepts all valid edge types", () => {
			const types: EdgeType[] = [
				"extends",
				"implements",
				"composition",
				"aggregation",
				"dependency",
				"association",
			];
			expect(types).toHaveLength(6);
		});
	});

	describe("Edge", () => {
		it("creates an edge with required fields", () => {
			const edge: Edge = { source: "A", target: "B", type: "dependency" };
			expect(edge.source).toBe("A");
			expect(edge.target).toBe("B");
			expect(edge.type).toBe("dependency");
		});

		it("creates an edge with optional label", () => {
			const edge: Edge = { source: "A", target: "B", type: "implements", label: "IFoo" };
			expect(edge.label).toBe("IFoo");
		});

		it("edge without label has undefined label", () => {
			const edge: Edge = { source: "X", target: "Y", type: "extends" };
			expect(edge.label).toBeUndefined();
		});
	});

	describe("createEdgeSet", () => {
		it("returns empty maps for empty input", () => {
			const set = createEdgeSet([]);
			expect(set.edges).toHaveLength(0);
			expect(set.bySource.size).toBe(0);
			expect(set.byTarget.size).toBe(0);
		});

		it("indexes a single edge by source and target", () => {
			const edge: Edge = { source: "A", target: "B", type: "dependency" };
			const set = createEdgeSet([edge]);

			expect(set.edges).toHaveLength(1);
			expect(set.bySource.get("A")).toEqual([edge]);
			expect(set.byTarget.get("B")).toEqual([edge]);
		});

		it("groups multiple edges from the same source", () => {
			const e1: Edge = { source: "A", target: "B", type: "dependency" };
			const e2: Edge = { source: "A", target: "C", type: "implements" };
			const set = createEdgeSet([e1, e2]);

			expect(set.bySource.get("A")).toHaveLength(2);
			expect(set.byTarget.get("B")).toHaveLength(1);
			expect(set.byTarget.get("C")).toHaveLength(1);
		});

		it("groups multiple edges to the same target", () => {
			const e1: Edge = { source: "A", target: "C", type: "composition" };
			const e2: Edge = { source: "B", target: "C", type: "aggregation" };
			const set = createEdgeSet([e1, e2]);

			expect(set.byTarget.get("C")).toHaveLength(2);
			expect(set.bySource.get("A")).toHaveLength(1);
			expect(set.bySource.get("B")).toHaveLength(1);
		});

		it("handles edges with labels", () => {
			const edge: Edge = { source: "X", target: "Y", type: "association", label: "uses" };
			const set = createEdgeSet([edge]);
			expect(set.edges[0]?.label).toBe("uses");
		});

		it("preserves edge order", () => {
			const e1: Edge = { source: "A", target: "B", type: "extends" };
			const e2: Edge = { source: "A", target: "C", type: "implements" };
			const e3: Edge = { source: "A", target: "D", type: "dependency" };
			const set = createEdgeSet([e1, e2, e3]);

			expect(set.edges).toEqual([e1, e2, e3]);
			expect(set.bySource.get("A")).toEqual([e1, e2, e3]);
		});

		it("does not mutate the input array", () => {
			const edge: Edge = { source: "A", target: "B", type: "association" };
			const input = [edge];
			const set = createEdgeSet(input);
			expect(set.edges).not.toBe(input);
		});

		it("returns ReadonlyArray edges", () => {
			const set = createEdgeSet([{ source: "A", target: "B", type: "dependency" }]);
			expect(set.edges).toHaveLength(1);
		});
	});
});
