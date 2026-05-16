import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { detectCircularDependencies } from "../../src/dependency/edge-builder.js";
import type { Edge } from "../../src/types/edge.js";

const edgeTypes = [
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
] as const;

function arbNodeId(): fc.Arbitrary<string> {
	return fc.string({ minLength: 1, maxLength: 4 });
}

function arbEdge(): fc.Arbitrary<Edge> {
	return fc
		.record({
			source: arbNodeId(),
			target: arbNodeId(),
			type: fc.constantFrom(...edgeTypes),
		})
		.filter((e) => e.source !== e.target);
}

function arbEdgeList(): fc.Arbitrary<Edge[]> {
	return fc.array(arbEdge(), { minLength: 0, maxLength: 30 });
}

function arbDagEdgeList(): fc.Arbitrary<Edge[]> {
	return fc
		.array(
			fc
				.record({
					source: arbNodeId(),
					target: arbNodeId(),
					type: fc.constantFrom(...edgeTypes),
				})
				.filter((e) => e.source !== e.target)
				.map((e) => {
					const [source, target] =
						e.source < e.target ? [e.source, e.target] : [e.target, e.source];
					return { ...e, source, target };
				}),
			{ minLength: 0, maxLength: 30 },
		)
		.filter((edges) => {
			const seen = new Set<string>();
			for (const e of edges) {
				const key = `${e.source}|${e.target}|${e.type}`;
				if (seen.has(key)) return false;
				seen.add(key);
			}
			return true;
		});
}

function topologicalSort(edges: Edge[]): string[] | null {
	const adj = new Map<string, string[]>();
	const inDegree = new Map<string, number>();
	const nodes = new Set<string>();

	for (const e of edges) {
		nodes.add(e.source);
		nodes.add(e.target);
		if (!adj.has(e.source)) adj.set(e.source, []);
		adj.get(e.source)?.push(e.target);
		inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
		if (!inDegree.has(e.source)) inDegree.set(e.source, 0);
	}

	const queue: string[] = [];
	for (const n of nodes) {
		if ((inDegree.get(n) ?? 0) === 0) queue.push(n);
	}

	const result: string[] = [];
	while (queue.length > 0) {
		const n = queue.shift()!;
		result.push(n);
		for (const neighbor of adj.get(n) ?? []) {
			const deg = inDegree.get(neighbor)! - 1;
			inDegree.set(neighbor, deg);
			if (deg === 0) queue.push(neighbor);
		}
	}

	return result.length === nodes.size ? result : null;
}

function transitiveClosure(edges: Edge[]): Map<string, Set<string>> {
	const closure = initClosure(edges);

	for (const k of closure.keys()) {
		for (const i of closure.keys()) {
			propagateNode(closure, k, i);
		}
	}

	return closure;
}

function initClosure(edges: Edge[]): Map<string, Set<string>> {
	const closure = new Map<string, Set<string>>();
	for (const e of edges) {
		if (!closure.has(e.source)) closure.set(e.source, new Set());
		if (!closure.has(e.target)) closure.set(e.target, new Set());
		closure.get(e.source)?.add(e.target);
	}
	return closure;
}

function propagateNode(closure: Map<string, Set<string>>, k: string, i: string): void {
	const iSet = closure.get(i);
	if (!iSet?.has(k)) return;
	const kSet = closure.get(k);
	if (!kSet) return;
	for (const t of kSet) {
		iSet.add(t);
	}
}

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

describe("dependency graph property tests", () => {
	it("no self-loops: every edge has distinct source and target", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				for (const e of edges) {
					expect(e.source).not.toBe(e.target);
				}
			}),
			{ numRuns },
		);
	});

	it("transitive closure: if A->B and B->C then A->C is in the closure", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const closure = transitiveClosure(edges);
				const direct = new Map<string, Set<string>>();
				for (const e of edges) {
					if (!direct.has(e.source)) direct.set(e.source, new Set());
					direct.get(e.source)?.add(e.target);
				}
				for (const e of edges) {
					const directB = direct.get(e.target);
					if (!directB) continue;
					for (const c of directB) {
						const sourceSet = closure.get(e.source);
						expect(sourceSet?.has(c)).toBe(true);
					}
				}
			}),
			{ numRuns },
		);
	});

	it("topological sort exists iff no cycles are detected", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const { cycles } = detectCircularDependencies(edges);
				const hasCycles = cycles.length > 0;
				const sorted = topologicalSort(edges);
				if (hasCycles) {
					expect(sorted).toBeNull();
				} else {
					expect(sorted).not.toBeNull();
					if (sorted) {
						const pos = new Map(sorted.map((n, i) => [n, i]));
						for (const e of edges) {
							expect(pos.get(e.source)!).toBeLessThan(pos.get(e.target)!);
						}
					}
				}
			}),
			{ numRuns },
		);
	});

	it("acyclic graphs (DAG) always produce valid topological sort", () => {
		fc.assert(
			fc.property(arbDagEdgeList(), (edges) => {
				const sorted = topologicalSort(edges);
				expect(sorted).not.toBeNull();
				if (sorted) {
					const pos = new Map(sorted.map((n, i) => [n, i]));
					for (const e of edges) {
						expect(pos.get(e.source)!).toBeLessThan(pos.get(e.target)!);
					}
				}
			}),
			{ numRuns },
		);
	});

	it("detectCircularDependencies preserves input edges in cycle results", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const inputSet = new Set(edges.map((e) => `${e.source}|${e.target}|${e.type}`));
				const { cycles } = detectCircularDependencies(edges);
				for (const cycle of cycles) {
					for (const ce of cycle.edges) {
						const key = `${ce.source}|${ce.target}|${ce.type}`;
						expect(inputSet.has(key)).toBe(true);
					}
				}
			}),
			{ numRuns },
		);
	});
});
