import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import type { EdgeSet, EdgeType } from "../types/edge.js";

export function renderPackageDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Package Diagram";
	lines.push(`@startuml ${title}`);
	lines.push("");

	const packages = buildPackages(symbols, options);

	if (options.hideEmptyPackages) {
		for (const [pkg, entries] of packages) {
			if (entries.length === 0) {
				packages.delete(pkg);
			}
		}
	}

	for (const [pkg, entries] of packages) {
		lines.push(`package "${pkg}" as ${sanitizeId(pkg)} {`);
		for (const entry of entries) {
			lines.push(`  ${entry}`);
		}
		lines.push("}");
		lines.push("");
	}

	const renderedEdges = new Set<string>();
	for (const edge of edgeSet.edges) {
		const sourcePkg = extractPackage(edge.source);
		const targetPkg = extractPackage(edge.target);
		if (sourcePkg && targetPkg && sourcePkg !== targetPkg) {
			const key = `${sourcePkg}|${targetPkg}`;
			if (!renderedEdges.has(key)) {
				renderedEdges.add(key);
				const arrow = mapEdgeArrow(edge.type);
				lines.push(`${sanitizeId(sourcePkg)} ${arrow} ${sanitizeId(targetPkg)}`);
			}
		}
	}

	if (renderedEdges.size > 0) lines.push("");
	lines.push("@enduml");
	return lines.join("\n");
}

function buildPackages(symbols: SymbolTable, options: DiagramOptions): Map<string, string[]> {
	const packages = new Map<string, string[]>();

	const addEntry = (filePath: string, line: string) => {
		const pkg = extractPackage(filePath);
		if (!pkg) return;
		let entries = packages.get(pkg);
		if (!entries) {
			entries = [];
			packages.set(pkg, entries);
		}
		entries.push(line);
	};

	for (const cls of symbols.classes) {
		addEntry(cls.filePath, `${cls.kind === "interface" ? "interface" : "class"} ${cls.name}`);
	}

	if (options.showStores) {
		for (const store of symbols.stores) {
			addEntry(store.filePath, `class "${store.name}" <<store>>`);
		}
	}

	if (options.showProps) {
		const seen = new Set<string>();
		for (const prop of symbols.props) {
			if (!seen.has(prop.componentName)) {
				seen.add(prop.componentName);
				addEntry(prop.filePath, `class "${prop.componentName}" <<component>>`);
			}
		}
	}

	for (const fn of symbols.functions) {
		addEntry(fn.filePath, `class "${fn.name}" <<function>>`);
	}

	return packages;
}

function extractPackage(filePath: string): string | undefined {
	const parts = filePath.split("/");
	if (parts.length < 2) return undefined;
	parts.pop();
	return parts.join("/");
}

function sanitizeId(path: string): string {
	return path.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

function mapEdgeArrow(type: EdgeType): string {
	switch (type) {
		case "extends":
			return "<|--";
		case "implements":
			return "..|>";
		case "composition":
			return "*--";
		case "aggregation":
			return "o--";
		case "dependency":
			return "..>";
		case "association":
			return "-->";
	}
}
