import type { SymbolTable } from "../types/ast.js";
import type { GroupConfig } from "../types/diagram.js";

function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, "___GLOBSTAR___")
		.replace(/\*/g, "[^/]*")
		.replace(/___GLOBSTAR___/g, ".*");
	return new RegExp(`^${escaped}$`);
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

	for (const cls of symbols.classes) {
		const g = matchGroup(cls.filePath, groupsConfig);
		if (g) getGroup(g).classes.push(cls);
		else ungrouped.classes.push(cls);
	}

	for (const fn of symbols.functions) {
		const g = matchGroup(fn.filePath, groupsConfig);
		if (g) getGroup(g).functions.push(fn);
		else ungrouped.functions.push(fn);
	}

	for (const store of symbols.stores) {
		const g = matchGroup(store.filePath, groupsConfig);
		if (g) getGroup(g).stores.push(store);
		else ungrouped.stores.push(store);
	}

	for (const prop of symbols.props) {
		const g = matchGroup(prop.filePath, groupsConfig);
		if (g) getGroup(g).props.push(prop);
		else ungrouped.props.push(prop);
	}

	for (const evt of symbols.events) {
		const g = matchGroup(evt.filePath, groupsConfig);
		if (g) getGroup(g).events.push(evt);
		else ungrouped.events.push(evt);
	}

	for (const exp of symbols.exports) {
		const g = matchGroup(exp.filePath, groupsConfig);
		if (g) getGroup(g).exports.push(exp);
		else ungrouped.exports.push(exp);
	}

	for (const route of symbols.routes ?? []) {
		const g = matchGroup(route.filePath, groupsConfig);
		if (g) getGroup(g).routes.push(route);
		else ungrouped.routes?.push(route);
	}

	for (const comp of symbols.components ?? []) {
		const g = matchGroup(comp.filePath, groupsConfig);
		if (g) getGroup(g).components?.push(comp);
		else ungrouped.components?.push(comp);
	}

	return { groups: grouped, ungrouped };
}

export function getGroupForFile(filePath: string, groups: GroupConfig[]): string | undefined {
	return matchGroup(filePath, groups);
}
