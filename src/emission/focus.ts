import type { SymbolTable } from "../types/ast.js";
import type { Edge, EdgeSet } from "../types/edge.js";

export interface FocusOptions {
	focusNode: string;
	depth: number;
}

export function resolveFocusScope(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	options: FocusOptions,
): Set<string> {
	const allNames = collectAllNames(symbols);
	const normalizedFocus = findBestMatch(options.focusNode, allNames);
	if (!normalizedFocus) return new Set(allNames);

	const maxHops = options.depth <= 0 ? Infinity : options.depth;
	const visited = new Set<string>();
	const queue: Array<{ name: string; hop: number }> = [{ name: normalizedFocus, hop: 0 }];
	let head = 0;

	while (head < queue.length) {
		const current = queue[head];
		head++;
		if (!current) continue;
		if (visited.has(current.name)) continue;
		visited.add(current.name);
		if (current.hop >= maxHops) continue;

		const outgoing = edgeSet.bySource.get(current.name) ?? [];
		const incoming = edgeSet.byTarget.get(current.name) ?? [];
		const neighbours = [...outgoing.map((e) => e.target), ...incoming.map((e) => e.source)];
		for (const neighbour of neighbours) {
			if (!visited.has(neighbour) && allNames.has(neighbour)) {
				queue.push({ name: neighbour, hop: current.hop + 1 });
			}
		}
	}

	return visited;
}

function collectAllNames(symbols: SymbolTable): Set<string> {
	const names = new Set<string>();
	for (const cls of symbols.classes) names.add(cls.name);
	for (const fn of symbols.functions) names.add(fn.name);
	for (const store of symbols.stores) names.add(store.name);
	for (const exp of symbols.exports) names.add(exp.name);
	for (const route of symbols.routes ?? []) names.add(route.name);
	for (const comp of symbols.components ?? []) names.add(comp.name);
	const componentMap = new Map<string, string[]>();
	for (const prop of symbols.props) {
		let list = componentMap.get(prop.componentName);
		if (!list) {
			list = [];
			componentMap.set(prop.componentName, list);
		}
		list.push(prop.name);
	}
	for (const name of componentMap.keys()) names.add(name);
	return names;
}

function findBestMatch(query: string, names: Set<string>): string | undefined {
	if (names.has(query)) return query;
	const lower = query.toLowerCase();
	for (const name of names) {
		if (name.toLowerCase() === lower) return name;
	}
	const suffix = `/${query}`;
	const prefix = `${query}/`;
	for (const name of names) {
		if (name.endsWith(suffix)) return name;
		if (name.startsWith(prefix)) return name;
	}
	for (const name of names) {
		if (name.toLowerCase().includes(lower)) return name;
	}
	return undefined;
}

export function filterSymbolsByScope(symbols: SymbolTable, scope: Set<string>): SymbolTable {
	return {
		classes: symbols.classes.filter((c) => scope.has(c.name)),
		functions: symbols.functions.filter((f) => scope.has(f.name)),
		stores: symbols.stores.filter((s) => scope.has(s.name)),
		props: symbols.props.filter((p) => scope.has(p.componentName)),
		exports: symbols.exports.filter((e) => scope.has(e.name)),
		routes: (symbols.routes ?? []).filter((r) => scope.has(r.name)),
		components: (symbols.components ?? []).filter((c) => scope.has(c.name)),
	};
}

export function filterEdgesByScope(edges: ReadonlyArray<Edge>, scope: Set<string>): Edge[] {
	return edges.filter((e) => scope.has(e.source) && scope.has(e.target));
}
