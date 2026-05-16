import type { ComponentSymbol, SymbolTable } from "../types/ast.js";
import type { EdgeSet } from "../types/edge.js";

export function filterHiddenComponents(components: ComponentSymbol[]): ComponentSymbol[] {
	return components.filter((c) => !c.tags?.some((t) => t.kind === "hide"));
}

export function groupComponentsByTag(components: ComponentSymbol[]): {
	grouped: Map<string, ComponentSymbol[]>;
	ungrouped: ComponentSymbol[];
} {
	const grouped = new Map<string, ComponentSymbol[]>();
	const ungrouped: ComponentSymbol[] = [];

	for (const comp of components) {
		const groupTag = comp.tags?.find((t) => t.kind === "group");
		if (groupTag?.kind === "group") {
			let list = grouped.get(groupTag.name);
			if (!list) {
				list = [];
				grouped.set(groupTag.name, list);
			}
			list.push(comp);
		} else {
			ungrouped.push(comp);
		}
	}
	return { grouped, ungrouped };
}

export function applyFocusFilter(components: ComponentSymbol[]): ComponentSymbol[] {
	const focusNames = new Set(
		components.filter((c) => c.tags?.some((t) => t.kind === "focus")).map((c) => c.name),
	);
	if (focusNames.size === 0) return components;
	return components.filter((c) => focusNames.has(c.name));
}

export function getComponentColor(comp: ComponentSymbol): string | undefined {
	const colorTag = comp.tags?.find((t) => t.kind === "color");
	if (colorTag?.kind === "color") {
		return colorTag.color;
	}
	return undefined;
}

export function removeHiddenComponents(
	symbols: SymbolTable,
	edges: EdgeSet,
): { symbols: SymbolTable; edges: EdgeSet } {
	const hidden = new Set(
		symbols.components.filter((c) => c.tags?.some((t) => t.kind === "hide")).map((c) => c.name),
	);
	if (hidden.size === 0) return { symbols, edges };

	const remaining = new Set(
		symbols.components.filter((c) => !hidden.has(c.name)).map((c) => c.name),
	);

	const filteredSymbols: SymbolTable = {
		...symbols,
		props: symbols.props.filter((p) => !hidden.has(p.componentName)),
		events: (symbols.events ?? []).filter((e) => !hidden.has(e.componentName)),
	};
	filteredSymbols.components = symbols.components.filter((c) => !hidden.has(c.name));

	const filteredEdges = edges.edges.filter(
		(e) => remaining.has(e.source) || remaining.has(e.target),
	);

	return {
		symbols: filteredSymbols,
		edges: { edges: filteredEdges, bySource: new Map(), byTarget: new Map() },
	};
}

export { applyFocusFilter as getFocusedComponents };
