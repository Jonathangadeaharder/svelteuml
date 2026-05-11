import type { SymbolTable } from "../types/ast.js";
import type { CircularDependencyResult, Edge } from "../types/edge.js";
import type { ResolvedImport } from "./import-scanner.js";
import type { PropFlowInfo } from "./prop-flow-tracker.js";
import type { StateDependency } from "./reactive-tracker.js";

export function buildEdges(
	imports: ResolvedImport[],
	symbols: SymbolTable,
	stateDeps: StateDependency[] = [],
	propFlows: PropFlowInfo[] = [],
): Edge[] {
	const edges: Edge[] = [];
	const seen = new Set<string>();

	const addEdge = (edge: Edge) => {
		const key = `${edge.source}|${edge.target}|${edge.type}|${edge.label ?? ""}`;
		if (!seen.has(key)) {
			seen.add(key);
			edges.push(edge);
		}
	};

	const classNamesByFile = new Map<string, Set<string>>();
	for (const cls of symbols.classes) {
		let names = classNamesByFile.get(cls.filePath);
		if (!names) {
			names = new Set();
			classNamesByFile.set(cls.filePath, names);
		}
		names.add(cls.name);
	}

	const storeFiles = new Set(symbols.stores.map((s) => s.filePath));
	const componentFiles = new Set([
		...symbols.props.map((p) => p.filePath),
		...symbols.components.map((c) => c.filePath),
	]);

	for (const imp of imports) {
		const isStoreImport = storeFiles.has(imp.targetFile);
		const isComponentImport = componentFiles.has(imp.targetFile);
		const routeSource =
			imp.sourceFile.includes("/routes/") || imp.sourceFile.includes("\\routes\\");

		let edgeType: Edge["type"];
		if (isStoreImport) {
			edgeType = "composition";
		} else if (isComponentImport && routeSource) {
			edgeType = "association";
		} else {
			edgeType = "dependency";
		}

		const meaningfulNames = imp.importedNames.filter((n) => !isMinifiedName(n));
		const edge: Edge =
			meaningfulNames.length > 0
				? {
						source: imp.sourceFile,
						target: imp.targetFile,
						type: edgeType,
						label: meaningfulNames.join(", "),
					}
				: { source: imp.sourceFile, target: imp.targetFile, type: edgeType };
		addEdge(edge);
	}

	for (const cls of symbols.classes) {
		if (cls.extends) {
			const targetFile = findClassFile(cls.extends, classNamesByFile);
			if (targetFile) {
				addEdge({
					source: cls.filePath,
					target: targetFile,
					type: "extends",
					label: cls.extends,
				});
			}
		}

		for (const iface of cls.implements) {
			const targetFile = findClassFile(iface, classNamesByFile);
			if (targetFile) {
				addEdge({
					source: cls.filePath,
					target: targetFile,
					type: "implements",
					label: iface,
				});
			}
		}
	}

	for (const dep of stateDeps) {
		addEdge({
			source: dep.sourceFile,
			target: dep.targetFile,
			type: "state_dependency",
			label: `${dep.symbolName} <<${dep.dependencyKind}>>`,
		});
	}

	for (const flow of propFlows) {
		const suffix = flow.isRequired ? "!" : "?";
		addEdge({
			source: flow.sourceFile,
			target: flow.targetFile,
			type: "prop_flow",
			label: `${flow.propName}: ${flow.propType} ${suffix}`,
		});
	}

	return edges;
}

function findClassFile(
	name: string,
	classNamesByFile: Map<string, Set<string>>,
): string | undefined {
	for (const [filePath, names] of classNamesByFile) {
		if (names.has(name)) return filePath;
	}
	return undefined;
}

export function detectCircularDependencies(edges: readonly Edge[]): CircularDependencyResult {
	const adjacency = new Map<string, string[]>();
	const edgeMap = new Map<string, Edge[]>();

	for (const edge of edges) {
		const list = adjacency.get(edge.source);
		if (list) {
			list.push(edge.target);
		} else {
			adjacency.set(edge.source, [edge.target]);
		}
		const key = `${edge.source}|${edge.target}`;
		const elist = edgeMap.get(key);
		if (elist) {
			elist.push(edge);
		} else {
			edgeMap.set(key, [edge]);
		}
	}

	const allNodes = new Set<string>();
	for (const edge of edges) {
		allNodes.add(edge.source);
		allNodes.add(edge.target);
	}

	const visited = new Set<string>();
	const inStack = new Set<string>();
	const cycles: CircularDependencyResult["cycles"] = [];

	function dfs(node: string, path: string[]): void {
		if (inStack.has(node)) {
			const cycleStart = path.indexOf(node);
			const cycleFiles = path.slice(cycleStart);
			const cycleEdges: Edge[] = [];
			const fullCycle = [...cycleFiles, node];
			for (let i = 0; i < fullCycle.length - 1; i++) {
				const key = `${fullCycle[i]}|${fullCycle[i + 1]}`;
				const matched = edgeMap.get(key);
				if (matched) cycleEdges.push(...matched);
			}
			const normalizedCycle = normalizeCycle(cycleFiles);
			const isDuplicate = cycles.some((c) => arraysEqual(c.files, normalizedCycle));
			if (!isDuplicate && cycleEdges.length > 0) {
				cycles.push({ edges: cycleEdges, files: normalizedCycle });
			}
			return;
		}
		if (visited.has(node)) return;
		visited.add(node);
		inStack.add(node);
		path.push(node);

		const neighbors = adjacency.get(node);
		if (neighbors) {
			for (const neighbor of neighbors) {
				if (allNodes.has(neighbor)) {
					dfs(neighbor, path);
				}
			}
		}

		path.pop();
		inStack.delete(node);
	}

	for (const node of allNodes) {
		if (!visited.has(node)) {
			dfs(node, []);
		}
	}

	return { cycles };
}

function normalizeCycle(files: string[]): string[] {
	const minIndex = files.indexOf(files.reduce((min, f) => (f < min ? f : min), files[0] ?? ""));
	return [...files.slice(minIndex), ...files.slice(0, minIndex)];
}

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((v, i) => v === b[i]);
}

const MINIFIED_RE = /^[a-z](?:[A-Z0-9])?$/;

function isMinifiedName(name: string): boolean {
	return MINIFIED_RE.test(name);
}
