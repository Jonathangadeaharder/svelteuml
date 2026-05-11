import { SyntaxKind } from "ts-morph";
import type { StoreSymbol } from "../types/ast.js";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { StateDependency } from "./reactive-tracker.js";

/**
 * E3.6 — Store-subscription edges: detect `$storeName` usage in .svelte files.
 *
 * Svelte's `$` prefix auto-subscribes to stores in component templates and
 * script blocks. After svelte2tsx conversion these appear as `$storeName`
 * identifiers in the generated TSX code.
 *
 * This tracker scans all converted .svelte files and creates edges from the
 * component to the store file for each detected subscription.
 */

const SVELTE_RUNES = new Set(["$state", "$derived", "$effect", "$props", "$inspect"]);

function isSvelteComponentFile(filePath: string): boolean {
	return filePath.endsWith(".svelte");
}

function deduplicateDeps(deps: StateDependency[]): StateDependency[] {
	const seen = new Set<string>();
	return deps.filter((d) => {
		const key = `${d.sourceFile}|${d.targetFile}|${d.symbolName}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Track store-subscription references (`$storeName`) in .svelte component files.
 *
 * Scans the TSX output of all converted .svelte files for identifiers matching
 * the `$<storeName>` pattern, where `<storeName>` matches a known StoreSymbol.
 */
export function trackStoreSubscriptions(
	parsingProject: ParsingProject,
	storeSymbols: StoreSymbol[],
): StateDependency[] {
	const deps: StateDependency[] = [];

	const storeFileMap = new Map<string, string>();
	for (const s of storeSymbols) {
		storeFileMap.set(s.name, s.filePath);
	}

	if (storeFileMap.size === 0) return deps;

	for (const [originalPath, sourceFile] of parsingProject.getAllSourceFiles()) {
		if (!isSvelteComponentFile(originalPath)) continue;

		try {
			const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
			const seenInFile = new Set<string>();

			for (const id of identifiers) {
				const text = id.getText();

				if (!text.startsWith("$") || text.length < 2) continue;
				if (SVELTE_RUNES.has(text)) continue;

				const storeName = text.slice(1);
				const targetFile = storeFileMap.get(storeName);
				if (!targetFile) continue;

				if (seenInFile.has(storeName)) continue;
				seenInFile.add(storeName);

				deps.push({
					sourceFile: originalPath,
					targetFile,
					symbolName: `$${storeName}`,
					dependencyKind: "store-subscription",
				});
			}
		} catch {
			// Gracefully handle parse errors in individual files
		}
	}

	return deduplicateDeps(deps);
}
