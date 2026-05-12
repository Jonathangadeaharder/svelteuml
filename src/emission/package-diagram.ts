import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import type { EdgeSet, EdgeType } from "../types/edge.js";
import { normalizeFilePath } from "../utils/path.js";
import { getGroupForFile } from "./groups.js";
import { routeStereotype } from "./route-utils.js";

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

	const sortedPackageKeys = [...packages.keys()].sort((a, b) => a.localeCompare(b));
	const sortedPackages = sortedPackageKeys.map(
		(pkg) => [pkg, [...(packages.get(pkg) ?? [])].sort((a, b) => a.localeCompare(b))] as const,
	);
	for (const [pkg, sortedEntries] of sortedPackages) {
		lines.push(`package "${pkg}" as ${sanitizeId(pkg)} {`);
		for (const entry of sortedEntries) {
			lines.push(`  ${entry}`);
		}
		lines.push("}");
		lines.push("");
	}

	const edgeWeights = new Map<string, { source: string; target: string; weight: number }>();
	const groups = options.groups ?? [];
	for (const edge of edgeSet.edges) {
		const normalizedSource = normalizeFilePath(edge.source, options.targetDir);
		const normalizedTarget = normalizeFilePath(edge.target, options.targetDir);
		const sourcePkg = getGroupForFile(normalizedSource, groups) ?? extractPackage(normalizedSource);
		const targetPkg = getGroupForFile(normalizedTarget, groups) ?? extractPackage(normalizedTarget);
		if (!(sourcePkg && targetPkg) || sourcePkg === targetPkg) continue;
		const key = `${sourcePkg}|${targetPkg}`;
		const existing = edgeWeights.get(key);
		if (existing) {
			existing.weight++;
		} else {
			edgeWeights.set(key, { source: sourcePkg, target: targetPkg, weight: 1 });
		}
	}

	for (const { source, target, weight } of edgeWeights.values()) {
		lines.push(`${sanitizeId(source)} ..> ${sanitizeId(target)} : ${weight}`);
	}

	if (edgeWeights.size > 0) lines.push("");
	lines.push("@enduml");
	return lines.join("\n");
}

function buildPackages(symbols: SymbolTable, options: DiagramOptions): Map<string, string[]> {
	const packages = new Map<string, string[]>();
	const groups = options.groups ?? [];

	const addEntry = (filePath: string, line: string) => {
		const normalized = normalizeFilePath(filePath, options.targetDir);
		const pkg = getGroupForFile(normalized, groups) ?? extractPackage(normalized);
		if (!pkg) return;
		let entries = packages.get(pkg);
		if (!entries) {
			entries = [];
			packages.set(pkg, entries);
		}
		entries.push(line);
	};

	const sortedClasses = [...symbols.classes].sort((a, b) => a.name.localeCompare(b.name));
	for (const cls of sortedClasses) {
		const exported = cls.isExported ? " <<Exported>>" : "";
		addEntry(
			cls.filePath,
			`${cls.kind === "interface" ? "interface" : "class"} ${cls.name}${exported}`,
		);
	}

	if (options.showStores) {
		const sortedStores = [...symbols.stores].sort((a, b) => a.name.localeCompare(b.name));
		for (const store of sortedStores) {
			const stereotype =
				store.runeKind === "state" ? "state" : store.runeKind === "derived" ? "derived" : "store";
			const exported = store.isExported ? " <<Exported>>" : "";
			addEntry(store.filePath, `class "${store.name}" <<${stereotype}>>${exported}`);
		}
	}

	if (options.showProps) {
		const seen = new Set<string>();
		for (const prop of symbols.props) {
			const key = `${prop.filePath}::${prop.componentName}`;
			if (!seen.has(key)) {
				seen.add(key);
				addEntry(prop.filePath, `class "${prop.componentName}" <<component>>`);
			}
		}
		const sortedComponents = [...symbols.components].sort((a, b) => a.name.localeCompare(b.name));
		for (const comp of sortedComponents) {
			const key = `${comp.filePath}::${comp.name}`;
			if (!seen.has(key)) {
				seen.add(key);
				addEntry(comp.filePath, `class "${comp.name}" <<component>>`);
			}
		}
	}

	const sortedFunctions = [...symbols.functions].sort((a, b) => a.name.localeCompare(b.name));
	for (const fn of sortedFunctions) {
		const exported = fn.isExported ? " <<Exported>>" : "";
		addEntry(fn.filePath, `class "${fn.name}" <<function>>${exported}`);
	}

	const sortedRoutes = [...(symbols.routes ?? [])].sort((a, b) => a.name.localeCompare(b.name));
	for (const route of sortedRoutes) {
		const stereotype = routeStereotype(route);
		addEntry(route.filePath, `class "${route.name}" <<${stereotype}>>`);
	}

	return packages;
}

function extractPackage(filePath: string): string | undefined {
	const normalized = filePath.replace(/\\/g, "/");
	const srcIndex = normalized.indexOf("src/");
	if (srcIndex === -1) {
		const parts = normalized.split("/");
		if (parts.length < 2) return undefined;
		return parts[parts.length - 2];
	}
	const afterSrc = normalized.slice(srcIndex + 4);
	const parts = afterSrc.split("/");
	if (parts.length >= 2 && parts[0]) {
		return parts[0];
	}
	return undefined;
}

function sanitizeId(path: string): string {
	return path.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}
