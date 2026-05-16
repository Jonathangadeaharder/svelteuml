import type { SymbolTable } from "../types/ast.js";
import type { GroupConfig } from "../types/diagram.js";

const regexCache = new Map<string, RegExp>();

function globToRegex(pattern: string): RegExp {
	const normalized = pattern.replace(/\\/g, "/");
	const cached = regexCache.get(normalized);
	if (cached) return cached;
	const escaped = normalized
		.replaceAll(/[.+^${}()|[\]\\]/g, "\\$&")
		.replaceAll("**", "___GLOBSTAR___")
		.replace(/\*/g, "[^/]*")
		.replace(/___GLOBSTAR___/g, ".*");
	const regex = new RegExp(`^${escaped}$`);
	regexCache.set(normalized, regex);
	return regex;
}

export function matchGroup(filePath: string, groups: GroupConfig[]): string | undefined {
	const normalized = filePath.replace(/\\/g, "/");
	for (const group of groups) {
		const regex = globToRegex(group.pattern);
		if (regex.test(normalized)) {
			return group.name;
		}
	}
	return undefined;
}

export interface GroupedSymbols {
	groups: Map<string, SymbolTable>;
	ungrouped: SymbolTable;
}

export function groupSymbols(symbols: SymbolTable, groupsConfig: GroupConfig[]): GroupedSymbols {
	const grouped = new Map<string, SymbolTable>();
	const ungrouped: SymbolTable = {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
	};

	const getGroup = (name: string): SymbolTable => {
		let group = grouped.get(name);
		if (!group) {
			group = {
				classes: [],
				functions: [],
				stores: [],
				props: [],
				events: [],
				exports: [],
				routes: [],
				components: [],
			};
			grouped.set(name, group);
		}
		return group;
	};

	const pushByGroup = <T extends { filePath: string }>(
		items: T[] | undefined,
		toGroup: (t: SymbolTable) => T[],
		toUngrouped: (t: SymbolTable) => T[],
	) => {
		for (const item of items ?? []) {
			const g = matchGroup(item.filePath, groupsConfig);
			if (g) toGroup(getGroup(g)).push(item);
			else toUngrouped(ungrouped).push(item);
		}
	};

	pushByGroup(
		symbols.classes,
		(t) => t.classes,
		(t) => t.classes,
	);
	pushByGroup(
		symbols.functions,
		(t) => t.functions,
		(t) => t.functions,
	);
	pushByGroup(
		symbols.stores,
		(t) => t.stores,
		(t) => t.stores,
	);
	pushByGroup(
		symbols.props,
		(t) => t.props,
		(t) => t.props,
	);
	pushByGroup(
		symbols.events,
		(t) => t.events,
		(t) => t.events,
	);
	pushByGroup(
		symbols.exports,
		(t) => t.exports,
		(t) => t.exports,
	);
	pushByGroup(
		symbols.routes,
		(t) => t.routes,
		(t) => t.routes,
	);
	pushByGroup(
		symbols.components,
		(t) => t.components,
		(t) => t.components,
	);

	return { groups: grouped, ungrouped };
}

export function getGroupForFile(filePath: string, groups: GroupConfig[]): string | undefined {
	return matchGroup(filePath, groups);
}
