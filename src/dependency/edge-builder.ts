import type { SymbolTable } from "../types/ast.js";
import type { Edge } from "../types/edge.js";
import type { ResolvedImport } from "./import-scanner.js";
import type { StateDependency } from "./reactive-tracker.js";

export function buildEdges(
	imports: ResolvedImport[],
	symbols: SymbolTable,
	stateDeps: StateDependency[] = [],
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
	const componentFiles = new Set(
		[
			...symbols.props.map((p) => p.filePath),
			...(symbols.components ?? []).map((c) => c.filePath),
		],
	);

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

const MINIFIED_RE = /^[a-z](?:[A-Z0-9])?$/;

function isMinifiedName(name: string): boolean {
	return MINIFIED_RE.test(name);
}
