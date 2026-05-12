import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildEdges, detectCircularDependencies } from "../../src/dependency/edge-builder.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import type { PropFlowInfo } from "../../src/dependency/prop-flow-tracker.js";
import type { SlotFillRecord } from "../../src/extraction/slot-extractor.js";
import type { EventSymbol, SymbolTable } from "../../src/types/ast.js";
import type { Edge } from "../../src/types/edge.js";

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

const EDGE_TYPES = [
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

function arbNodeName(): fc.Arbitrary<string> {
	return fc
		.array(
			fc.constantFrom(
				"src",
				"lib",
				"routes",
				"components",
				"utils",
				"stores",
				"api",
				"types",
				"hooks",
				"styles",
			),
			{ minLength: 2, maxLength: 4 },
		)
		.map((parts) => `/${parts.join("/")}.ts`);
}

function arbFilePath(): fc.Arbitrary<string> {
	return fc
		.oneof(
			arbNodeName(),
			fc
				.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 3 })
				.map((parts) => `/${parts.join("/")}`),
		)
		.filter((s) => s.length > 0);
}

function arbEdgeType(): fc.Arbitrary<(typeof EDGE_TYPES)[number]> {
	return fc.constantFrom(...EDGE_TYPES);
}

function arbEdge(): fc.Arbitrary<Edge> {
	return fc.record({
		source: arbFilePath(),
		target: arbFilePath(),
		type: arbEdgeType(),
		label: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
	});
}

function arbEdgeList(): fc.Arbitrary<Edge[]> {
	return fc.array(arbEdge(), { minLength: 0, maxLength: 50 });
}

function arbDAG(minNodes: number, maxNodes: number): fc.Arbitrary<Edge[]> {
	return fc
		.uniqueArray(arbFilePath(), {
			minLength: minNodes,
			maxLength: maxNodes,
			selector: (s) => s,
		})
		.chain((nodes) => {
			const n = nodes.length;
			const possible: Edge[] = [];
			for (let i = 0; i < n; i++) {
				for (let j = i + 1; j < n; j++) {
					possible.push({
						source: nodes[i],
						target: nodes[j],
						type: "dependency",
					});
				}
			}
			return fc.subarray(possible, { minLength: 0 });
		});
}

function arbCyclicGraph(): fc.Arbitrary<Edge[]> {
	return fc
		.uniqueArray(arbFilePath(), {
			minLength: 3,
			maxLength: 8,
			selector: (s) => s,
		})
		.chain((nodes) => {
			const n = nodes.length;
			const k = 2 + (n % (n - 1));
			const cycleEdges: Edge[] = [];
			for (let i = 0; i < k; i++) {
				cycleEdges.push({
					source: nodes[i],
					target: nodes[(i + 1) % k],
					type: "dependency",
				});
			}
			const possible: Edge[] = [];
			for (let i = 0; i < n; i++) {
				for (let j = i + 1; j < n; j++) {
					possible.push({
						source: nodes[i],
						target: nodes[j],
						type: "dependency",
					});
				}
			}
			return fc.subarray(possible, { minLength: 0 }).map((extra) => [...cycleEdges, ...extra]);
		});
}

// Kahn's algorithm
function hasTopologicalSort(edges: Edge[]): boolean {
	const inDegree = new Map<string, number>();
	const adj = new Map<string, string[]>();
	const nodes = new Set<string>();

	for (const e of edges) {
		nodes.add(e.source);
		nodes.add(e.target);
		let list = adj.get(e.source);
		if (!list) {
			list = [];
			adj.set(e.source, list);
		}
		list.push(e.target);
		inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
		if (!inDegree.has(e.source)) inDegree.set(e.source, 0);
	}

	if (nodes.size === 0) return true;

	const queue: string[] = [];
	for (const n of nodes) {
		if ((inDegree.get(n) ?? 0) === 0) queue.push(n);
	}

	let count = 0;
	while (queue.length > 0) {
		const node = queue.shift() as string;
		count++;
		for (const neighbor of adj.get(node) ?? []) {
			const deg = (inDegree.get(neighbor) ?? 0) - 1;
			inDegree.set(neighbor, deg);
			if (deg === 0) queue.push(neighbor);
		}
	}

	return count === nodes.size;
}

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

function arbImport(): fc.Arbitrary<ResolvedImport> {
	return fc
		.record({
			sourceFile: arbFilePath(),
			targetFile: arbFilePath(),
			importedNames: fc.uniqueArray(fc.string({ minLength: 2, maxLength: 15 }), {
				minLength: 1,
				maxLength: 5,
				selector: (s) => s,
			}),
			isTypeOnly: fc.boolean(),
		})
		.filter((imp) => imp.sourceFile !== imp.targetFile);
}

function arbStateDep(): fc.Arbitrary<{
	sourceFile: string;
	targetFile: string;
	symbolName: string;
	dependencyKind: string;
}> {
	return fc
		.record({
			sourceFile: arbFilePath(),
			targetFile: arbFilePath(),
			symbolName: fc.string({ minLength: 1, maxLength: 15 }),
			dependencyKind: fc.constantFrom("read", "write", "subscribe"),
		})
		.filter((d) => d.sourceFile !== d.targetFile);
}

function arbPropFlow(): fc.Arbitrary<PropFlowInfo> {
	return fc
		.record({
			sourceFile: arbFilePath(),
			targetFile: arbFilePath(),
			propName: fc.string({ minLength: 1, maxLength: 15 }),
			propType: fc.string({ minLength: 1, maxLength: 15 }),
			isRequired: fc.boolean(),
		})
		.filter((p) => p.sourceFile !== p.targetFile);
}

function arbSlotFill(): fc.Arbitrary<SlotFillRecord> {
	return fc
		.record({
			sourceFile: arbFilePath(),
			targetFile: arbFilePath(),
			slotName: fc.string({ minLength: 1, maxLength: 15 }),
		})
		.filter((s) => s.sourceFile !== s.targetFile);
}

function arbEventSymbol(): fc.Arbitrary<EventSymbol> {
	return fc.record({
		kind: fc.constant("event" as const),
		name: fc.string({ minLength: 1, maxLength: 15 }),
		filePath: arbFilePath(),
		componentName: fc.string({ minLength: 1, maxLength: 15 }),
		eventName: fc.string({ minLength: 1, maxLength: 15 }),
		type: fc.string({ minLength: 1, maxLength: 15 }),
	});
}

describe("Dependency graph PBT", () => {
	it("buildEdges never produces self-loop edges", () => {
		fc.assert(
			fc.property(
				fc.array(arbImport(), { minLength: 0, maxLength: 10 }),
				fc.array(arbStateDep(), { minLength: 0, maxLength: 5 }),
				fc.array(arbPropFlow(), { minLength: 0, maxLength: 5 }),
				fc.array(arbSlotFill(), { minLength: 0, maxLength: 5 }),
				fc.array(arbEventSymbol(), { minLength: 0, maxLength: 5 }),
				(imports, stateDeps, propFlows, slotFills, events) => {
					const symbols = makeSymbolTable({ events });
					const edges = buildEdges(imports, symbols, stateDeps, propFlows, slotFills);
					for (const e of edges) {
						expect(e.source).not.toBe(e.target);
					}
				},
			),
			{ numRuns: 200 },
		);
	});

	it("DAG edge sets always return zero cycles", () => {
		fc.assert(
			fc.property(arbDAG(1, 10), (edges) => {
				const result = detectCircularDependencies(edges);
				expect(result.cycles).toHaveLength(0);
			}),
			{ numRuns },
		);
	});

	it("topological sort exists iff detectCircularDependencies returns no cycles", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const result = detectCircularDependencies(edges);
				const hasCycle = result.cycles.length > 0;
				const canSort = hasTopologicalSort(edges);
				expect(canSort).toBe(!hasCycle);
			}),
			{ numRuns },
		);
	});

	it("cyclic graphs are detected as having cycles", () => {
		fc.assert(
			fc.property(arbCyclicGraph(), (edges) => {
				const result = detectCircularDependencies(edges);
				expect(result.cycles.length).toBeGreaterThan(0);
			}),
			{ numRuns },
		);
	});

	it("cycle file nodes are a subset of input edge nodes", () => {
		fc.assert(
			fc.property(arbEdgeList(), (edges) => {
				const allNodes = new Set<string>();
				for (const e of edges) {
					allNodes.add(e.source);
					allNodes.add(e.target);
				}
				const result = detectCircularDependencies(edges);
				for (const cycle of result.cycles) {
					for (const f of cycle.files) {
						expect(allNodes.has(f)).toBe(true);
					}
				}
			}),
			{ numRuns },
		);
	});
});
