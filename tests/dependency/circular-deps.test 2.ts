import { describe, expect, it } from "vitest";
import { detectCircularDependencies } from "../../src/dependency/edge-builder.js";
import type { Edge } from "../../src/types/edge.js";

function edge(source: string, target: string, type: Edge["type"] = "dependency"): Edge {
	return { source, target, type };
}

describe("detectCircularDependencies", () => {
	it("returns empty cycles for graph with no edges", () => {
		const result = detectCircularDependencies([]);
		expect(result.cycles).toHaveLength(0);
	});

	it("returns empty cycles for acyclic graph", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
			edge("/src/b.ts", "/src/c.ts"),
			edge("/src/c.ts", "/src/d.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(0);
	});

	it("detects simple 2-node cycle", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
			edge("/src/b.ts", "/src/a.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(1);
		const cycle = result.cycles[0];
		expect(cycle?.files).toContain("/src/a.ts");
		expect(cycle?.files).toContain("/src/b.ts");
		expect(cycle?.edges).toHaveLength(2);
	});

	it("detects 3-node cycle", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
			edge("/src/b.ts", "/src/c.ts"),
			edge("/src/c.ts", "/src/a.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(1);
		expect(result.cycles[0]?.files).toHaveLength(3);
		expect(result.cycles[0]?.edges).toHaveLength(3);
	});

	it("detects multiple disjoint cycles", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
			edge("/src/b.ts", "/src/a.ts"),
			edge("/src/c.ts", "/src/d.ts"),
			edge("/src/d.ts", "/src/c.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(2);
	});

	it("detects cycle with mixed edge types", () => {
		const edges = [
			edge("/src/Component.svelte", "/src/utils.ts", "component_usage"),
			edge("/src/utils.ts", "/src/Component.svelte", "dependency"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(1);
		expect(result.cycles[0]?.edges[0]?.type).toBe("component_usage");
		expect(result.cycles[0]?.edges[1]?.type).toBe("dependency");
	});

	it("does not duplicate cycles", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
			edge("/src/b.ts", "/src/c.ts"),
			edge("/src/c.ts", "/src/a.ts"),
			edge("/src/a.ts", "/src/c.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles.length).toBeGreaterThanOrEqual(1);
	});

	it("ignores standalone nodes with no edges", () => {
		const edges = [
			edge("/src/a.ts", "/src/b.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(0);
	});

	it("handles self-loop edge", () => {
		const edges = [
			edge("/src/a.ts", "/src/a.ts"),
		];
		const result = detectCircularDependencies(edges);
		expect(result.cycles).toHaveLength(1);
		expect(result.cycles[0]?.files).toEqual(["/src/a.ts"]);
	});
});
