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
			pattern: arg.slice(0, colonIdx),
			name: arg.slice(colonIdx + 1),
		};
	});
}

export function validateGroups(groups: AliasGroup[]): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < groups.length; i++) {
		const g = groups[i];
		if (!g || !g.pattern) {
			errors.push(`Group at index ${i}: pattern is empty`);
		}
		if (!g || !g.name) {
			errors.push(`Group at index ${i}: name is empty`);
		}
		if (g && g.name && seen.has(g.name)) {
			errors.push(`Duplicate group name: "${g.name}"`);
		}
		if (g && g.name) {
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

	const allKinds: Array<{ kind: string; name: string; filePath: string }> = [
		...symbols.classes,
		...symbols.functions,
		...symbols.stores,
		...symbols.props,
		...symbols.events,
		...symbols.exports,
		...symbols.routes,
		...symbols.components,
	];

	for (const sym of allKinds) {
		for (const g of groups) {
			if (matchGlob(sym.filePath, g.pattern)) {
				grouped.set(symbolKey(sym.kind, sym.name, sym.filePath), g.name);
				break;
			}
		}
	}

	const assignGroup = <T extends { kind: string; name: string; filePath: string; group?: string }>(
		list: T[],
	): T[] =>
		list.map((s) => {
			const g = grouped.get(symbolKey(s.kind, s.name, s.filePath));
			return g !== undefined ? { ...s, group: g } : s;
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

function matchGlob(filePath: string, pattern: string): boolean {
	const regex = globToRegex(pattern);
	return regex.test(filePath);
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
		} else if (ch === "." || ch === "(" || ch === ")" || ch === "[" || ch === "]" || ch === "+" || ch === "^" || ch === "$" || ch === "{" || ch === "}" || ch === "|" || ch === "\\") {
			escaped += "\\" + ch;
		} else {
			escaped += ch;
		}
	}
	return new RegExp(`^${escaped}$`);
}
