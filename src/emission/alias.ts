import type { SymbolTable } from "../types/ast.js";

export interface AliasGroup {
	pattern: string;
	name: string;
}

export function parseAliasGroups(args?: string[]): AliasGroup[] {
	if (!args || args.length === 0) return [];
	return args.map((arg) => {
		const colonIdx = arg.lastIndexOf(":");
		if (colonIdx === -1 || colonIdx === 0 || colonIdx === arg.length - 1) {
			throw new Error(
				`Invalid alias-group format: "${arg}". Expected PATTERN:NAME (e.g. "src/**/*.ts:Library")`,
			);
		}
		return {
			pattern: arg.slice(0, colonIdx).trim(),
			name: arg.slice(colonIdx + 1).trim(),
		};
	});
}

export function validateGroups(groups: AliasGroup[]): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < groups.length; i++) {
		const g = groups[i];
		if (!g?.pattern) {
			errors.push(`Group at index ${i}: pattern is empty`);
		}
		if (!g?.name) {
			errors.push(`Group at index ${i}: name is empty`);
		}
		if (g?.name && seen.has(g.name)) {
			errors.push(`Duplicate group name: "${g.name}"`);
		}
		if (g?.name) {
			seen.add(g.name);
		}
	}

	return errors;
}

function symbolKey(kind: string, name: string, filePath: string): string {
	return `${kind}::${name}::${filePath}`;
}

export function assignGroups(symbols: SymbolTable, groups: AliasGroup[]): SymbolTable {
	if (groups.length === 0) return symbols;

	const grouped = new Map<string, string>();

	const compiledGroups = groups.map((g) => ({ ...g, regex: globToRegex(g.pattern) }));

	const processKind = <T extends { kind: string; name: string; filePath: string }>(
		kind: string,
		list: T[],
	) => {
		for (const sym of list) {
			for (const g of compiledGroups) {
				if (g.regex.test(sym.filePath)) {
					grouped.set(symbolKey(kind, sym.name, sym.filePath), g.name);
					break;
				}
			}
		}
	};

	processKind("class", symbols.classes);
	processKind("function", symbols.functions);
	processKind("store", symbols.stores);
	processKind("prop", symbols.props);
	processKind("event", symbols.events);
	processKind("export", symbols.exports);
	processKind("route", symbols.routes ?? []);
	processKind("component", symbols.components ?? []);

	const assignGroup = <T extends { kind: string; name: string; filePath: string; group?: string }>(
		list: T[],
	): T[] =>
		list.map((s) => {
			const g = grouped.get(symbolKey(s.kind, s.name, s.filePath));
			return g ? { ...s, group: g } : s;
		});

	return {
		classes: assignGroup(symbols.classes),
		functions: assignGroup(symbols.functions),
		stores: assignGroup(symbols.stores),
		props: assignGroup(symbols.props),
		events: assignGroup(symbols.events),
		exports: assignGroup(symbols.exports),
		routes: assignGroup(symbols.routes),
		components: assignGroup(symbols.components),
	};
}

function globToRegex(pattern: string): RegExp {
	let escaped = "";
	for (let i = 0; i < pattern.length; i++) {
		const ch = pattern[i];
		if (ch === "*" && pattern[i + 1] === "*" && pattern[i + 2] === "/") {
			escaped += "(?:.+/)?";
			i += 2;
		} else if (ch === "*" && pattern[i + 1] === "*" && i + 1 === pattern.length - 1) {
			escaped += ".*";
			i += 1;
		} else if (ch === "*") {
			escaped += "[^/]*";
		} else if (ch === "?") {
			escaped += "[^/]";
		} else if (
			ch === "." ||
			ch === "(" ||
			ch === ")" ||
			ch === "[" ||
			ch === "]" ||
			ch === "+" ||
			ch === "^" ||
			ch === "$" ||
			ch === "{" ||
			ch === "}" ||
			ch === "|" ||
			ch === "\\"
		) {
			escaped += `\\${ch}`;
		} else {
			escaped += ch;
		}
	}
	return new RegExp(`^${escaped}$`);
}
