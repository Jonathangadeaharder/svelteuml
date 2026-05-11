import { readFileSync } from "node:fs";
import type { ResolvedImport } from "../dependency/import-scanner.js";

export interface SlotFillRecord {
	sourceFile: string;
	targetFile: string;
	slotName: string;
}

const SCRIPT_RE = /<script[\s\S]*?<\/script>/g;
const STYLE_RE = /<style[\s\S]*?<\/style>/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const COMPONENT_WITH_CHILDREN_RE = /<([A-Z][a-zA-Z0-9_]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
const SLOT_ATTR_RE = /slot\s*=\s*"([^"]*)"/g;
const SELF_CLOSING_RE = /<([A-Z][a-zA-Z0-9_]*)\b[^>]*\/\s*>/g;

function extractTemplate(content: string): string {
	return content.replace(SCRIPT_RE, "").replace(STYLE_RE, "").replace(HTML_COMMENT_RE, "");
}

function hasMeaningfulContent(inner: string): boolean {
	return inner.trim().length > 0;
}

function extractFilledSlotNames(innerHtml: string): Set<string> {
	const names = new Set<string>();
	const slotMatches = innerHtml.matchAll(SLOT_ATTR_RE);
	for (const m of slotMatches) {
		const slotName = m[1];
		if (slotName) names.add(slotName);
	}

	const cleanInner = innerHtml.replace(SLOT_ATTR_RE, "").trim();
	if (cleanInner.length > 0 && !names.has("default")) {
		names.add("default");
	}

	return names;
}

function findComponentsWithChildren(
	template: string,
): Array<{ name: string; slotNames: Set<string> }> {
	const results: Array<{ name: string; slotNames: Set<string> }> = [];
	const selfClosing = new Set<string>();

	const selfClosingMatches = template.matchAll(SELF_CLOSING_RE);
	for (const m of selfClosingMatches) {
		const name = m[1];
		if (name) selfClosing.add(name);
	}

	const compMatches = template.matchAll(COMPONENT_WITH_CHILDREN_RE);
	for (const m of compMatches) {
		const name = m[1];
		const inner = m[2];
		if (!name || inner === undefined) continue;

		if (!hasMeaningfulContent(inner)) continue;
		if (selfClosing.has(name)) continue;

		const slotNames = extractFilledSlotNames(inner);
		if (slotNames.size > 0) {
			results.push({ name, slotNames });
		}
	}

	return results;
}

export function extractSlotFills(
	svelteFiles: ReadonlyArray<string>,
	imports: ReadonlyArray<ResolvedImport>,
): SlotFillRecord[] {
	const fills: SlotFillRecord[] = [];
	const fileToImports = new Map<string, ResolvedImport[]>();

	for (const imp of imports) {
		let list = fileToImports.get(imp.sourceFile);
		if (!list) {
			list = [];
			fileToImports.set(imp.sourceFile, list);
		}
		list.push(imp);
	}

	const svelteSet = new Set(svelteFiles);

	for (const filePath of svelteFiles) {
		let content: string;
		try {
			content = readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}

		const template = extractTemplate(content);
		const components = findComponentsWithChildren(template);
		if (components.length === 0) continue;

		const fileImports = fileToImports.get(filePath) ?? [];

		for (const comp of components) {
			const matchingImport = fileImports.find(
				(imp) => imp.importedNames.includes(comp.name) && svelteSet.has(imp.targetFile),
			);
			if (!matchingImport) continue;

			for (const slotName of comp.slotNames) {
				fills.push({
					sourceFile: filePath,
					targetFile: matchingImport.targetFile,
					slotName,
				});
			}
		}
	}

	return fills;
}
