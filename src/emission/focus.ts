import type { SymbolTable } from "../types/ast.js";
import { createEdgeSet, type Edge, type EdgeSet } from "../types/edge.js";

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
		events: (symbols.events ?? []).filter((e) => scope.has(e.componentName)),
	};
}

export function filterEdgesByScope(edges: ReadonlyArray<Edge>, scope: Set<string>): Edge[] {
	return edges.filter((e) => scope.has(e.source) && scope.has(e.target));
}

export function resolveGlobalScope(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	maxDepth: number,
): Set<string> {
	const allNames = collectAllNames(symbols);
	if (maxDepth <= 0) return allNames;

	const roots = findRootSymbols(symbols, edgeSet);
	const maxHops = maxDepth;
	const visited = new Set<string>();
	const queue: Array<{ name: string; hop: number }> = [...roots.map((n) => ({ name: n, hop: 0 }))];
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

function findRootSymbols(symbols: SymbolTable, edgeSet: EdgeSet): string[] {
	const allNames = collectAllNames(symbols);
	const hasIncoming = new Set<string>();
	for (const edge of edgeSet.edges) {
		if (allNames.has(edge.target)) {
			hasIncoming.add(edge.target);
		}
	}
	return [...allNames].filter((name) => !hasIncoming.has(name));
}

export function filterByExcludePatterns(
	symbols: SymbolTable,
	edgeSet: EdgeSet,
	patterns: string[],
): { symbols: SymbolTable; edges: EdgeSet } {
	if (patterns.length === 0) return { symbols, edges: edgeSet };

	const shouldExclude = (filePath: string): boolean => {
		return patterns.some((p) => {
			const glob = new RegExp(
				`^${p.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".")}$`,
			);
			return glob.test(filePath);
		});
	};

	const excludedNames = new Set<string>();

	const checkSymbol = (filePath: string, name: string) => {
		if (shouldExclude(filePath)) excludedNames.add(name);
	};

	for (const cls of symbols.classes) checkSymbol(cls.filePath, cls.name);
	for (const fn of symbols.functions) checkSymbol(fn.filePath, fn.name);
	for (const store of symbols.stores) checkSymbol(store.filePath, store.name);
	for (const comp of symbols.components) checkSymbol(comp.filePath, comp.name);
	for (const route of symbols.routes ?? []) checkSymbol(route.filePath, route.name);
	for (const evt of symbols.events ?? []) checkSymbol(evt.filePath, evt.name);

	const filteredSymbols: SymbolTable = {
		classes: symbols.classes.filter((c) => !excludedNames.has(c.name)),
		functions: symbols.functions.filter((f) => !excludedNames.has(f.name)),
		stores: symbols.stores.filter((s) => !excludedNames.has(s.name)),
		props: symbols.props.filter((p) => !excludedNames.has(p.componentName)),
		events: (symbols.events ?? []).filter((e) => !excludedNames.has(e.name)),
		exports: symbols.exports.filter((e) => !excludedNames.has(e.name)),
		routes: (symbols.routes ?? []).filter((r) => !excludedNames.has(r.name)),
		components: (symbols.components ?? []).filter((c) => !excludedNames.has(c.name)),
	};

	const remainingNames = new Set(collectAllNames(filteredSymbols));
	const filteredEdges = edgeSet.edges.filter(
		(e) => remainingNames.has(e.source) && remainingNames.has(e.target),
	);

	return { symbols: filteredSymbols, edges: createEdgeSet(filteredEdges) };
}
