import type { ClassSymbol, PropSymbol, StoreSymbol, SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import type { EdgeSet, EdgeType } from "../types/edge.js";

export function renderClassDiagram(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: DiagramOptions,
): string {
	const lines: string[] = [];
	const title = options.title ?? "Diagram";
	lines.push(`@startuml ${title}`);
	lines.push("skinparam classAttributeIconSize 0");
	lines.push("");

	const nameMap = buildNameMap(symbols);

	for (const cls of symbols.classes) {
		renderClass(lines, cls, options);
	}

	if (options.showStores) {
		for (const store of symbols.stores) {
			renderStore(lines, store);
		}
	}

	if (options.showProps) {
		const components = groupPropsByComponent(symbols.props);
		for (const [name, props] of components) {
			renderComponent(lines, name, props, options);
		}
	}

	for (const fn of symbols.functions) {
		lines.push(`class "${fn.name}" <<function>> {`);
		lines.push("}");
		lines.push("");
	}

	for (const edge of edgeSet.edges) {
		renderEdge(lines, edge, nameMap);
	}

	lines.push("@enduml");
	return lines.join("\n");
}

function buildNameMap(symbols: SymbolTable): Map<string, string> {
	const map = new Map<string, string>();
	for (const cls of symbols.classes) {
		map.set(cls.name, sanitizeId(cls.name));
		map.set(cls.filePath, sanitizeId(cls.name));
	}
	for (const store of symbols.stores) {
		map.set(store.name, sanitizeId(store.name));
		map.set(store.filePath, sanitizeId(store.name));
	}
	for (const fn of symbols.functions) {
		map.set(fn.name, sanitizeId(fn.name));
		map.set(fn.filePath, sanitizeId(fn.name));
	}
	const components = groupPropsByComponent(symbols.props);
	for (const [name, props] of components) {
		map.set(name, sanitizeId(name));
		if (props[0]) {
			map.set(props[0].filePath, sanitizeId(name));
		}
	}
	return map;
}

function renderClass(lines: string[], cls: ClassSymbol, options: DiagramOptions): void {
	const keyword =
		cls.kind === "interface"
			? "interface"
			: cls.kind === "abstract-class"
				? "abstract class"
				: "class";
	lines.push(`${keyword} "${cls.name}" as ${sanitizeId(cls.name)} {`);
	if (options.showMembers) {
		for (const member of cls.members) {
			if (member.kind === "method" && !options.showMethods) continue;
			const vis = mapVisibility(member.visibility, options.showVisibility);
			if (member.kind === "property") {
				lines.push(`  ${vis}${member.name}: ${member.type}`);
			} else {
				const params = member.parameters?.map((p) => `${p.name}: ${p.type}`).join(", ") ?? "";
				const ret = member.returnType ?? member.type;
				lines.push(`  ${vis}${member.name}(${params}): ${ret}`);
			}
		}
	}
	lines.push("}");
	lines.push("");
}

function renderStore(lines: string[], store: StoreSymbol): void {
	lines.push(`class "${store.name}" <<store>> {`);
	lines.push(`  storeType: ${store.storeType}`);
	lines.push(`  valueType: ${store.valueType}`);
	lines.push("}");
	lines.push("");
}

function renderComponent(
	lines: string[],
	name: string,
	props: PropSymbol[],
	options: DiagramOptions,
): void {
	lines.push(`class "${name}" <<component>> {`);
	if (options.showMembers) {
		for (const prop of props) {
			const suffix = prop.isRequired ? "" : "?";
			lines.push(`  + ${prop.name}${suffix}: ${prop.type}`);
		}
	}
	lines.push("}");
	lines.push("");
}

function renderEdge(
	lines: string[],
	edge: { source: string; target: string; type: EdgeType; label?: string },
	nameMap: Map<string, string>,
): void {
	const arrow = mapEdgeArrow(edge.type);
	const labelText = edge.label ? ` : ${edge.label}` : "";
	const sourceId = nameMap.get(edge.source) ?? sanitizeId(edge.source);
	const targetId = nameMap.get(edge.target) ?? sanitizeId(edge.target);
	lines.push(`${sourceId} ${arrow} ${targetId}${labelText}`);
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

function mapVisibility(vis: string, show: boolean): string {
	if (!show) return "";
	switch (vis) {
		case "private":
			return "- ";
		case "protected":
			return "# ";
		default:
			return "+ ";
	}
}

function sanitizeId(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

function groupPropsByComponent(props: PropSymbol[]): Map<string, PropSymbol[]> {
	const map = new Map<string, PropSymbol[]>();
	for (const prop of props) {
		let list = map.get(prop.componentName);
		if (!list) {
			list = [];
			map.set(prop.componentName, list);
		}
		list.push(prop);
	}
	return map;
}
