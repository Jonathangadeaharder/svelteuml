import type { SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { StoreSymbol } from "../types/ast.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2.4 — Store symbols: writable / readable / derived / runes.
 *
 * Detects Svelte stores in TS/JS files:
 *   - `writable<T>(initial)` → StoreSymbol { storeType: "writable" }
 *   - `readable<T>(initial, set?)` → StoreSymbol { storeType: "readable" }
 *   - `derived(stores, fn)` → StoreSymbol { storeType: "derived" }
 *   - Svelte 5 rune `$state<T>(initial)` treated as an in-component reactive
 *     variable; when exported from a `.svelte.ts` module we classify it as a
 *     "writable" store for diagram purposes.
 *
 * Only exported store bindings are extracted (non-exported stores are internal
 * implementation details irrelevant for the diagram).
 */

/**
 * Determine the store type from the factory function name.
 */
function storeTypeFromFactory(factoryName: string): StoreSymbol["storeType"] {
	if (factoryName === "readable") return "readable";
	if (factoryName === "derived") return "derived";
	return "writable"; // default / $state rune
}

/**
 * Extract the value type from a call expression like `writable<User>(null)`.
 * Returns the first type argument text or "unknown".
 */
function extractValueType(callText: string): string {
	// Match `factoryName<Type>(`
	const match = /\w+<([^>]+)>/.exec(callText);
	if (match?.[1]) return match[1].trim();
	return "unknown";
}

/**
 * Extract all exported store symbols from a TS/JS source file.
 */
export function extractStoreSymbols(sourceFile: SourceFile, filePath: string): StoreSymbol[] {
	if (shouldSkipFile(filePath)) return [];

	const results: StoreSymbol[] = [];

	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const stmt = varDecl.getVariableStatement();
		if (!stmt?.isExported()) continue;

		const name = varDecl.getName();
		const init = varDecl.getInitializer();
		if (!init) continue;

		// Must be a CallExpression
		if (init.getKind() !== SyntaxKind.CallExpression) continue;

		const callText = init.getText();

		// --- Svelte 3/4 stores ---
		const factoryMatch = /^(writable|readable|derived)\s*[<(]/.exec(callText);
		if (factoryMatch?.[1]) {
			const factory = factoryMatch[1];
			results.push({
				kind: "store",
				name,
				filePath,
				storeType: storeTypeFromFactory(factory),
				valueType: extractValueType(callText),
			});
			continue;
		}

		// --- Svelte 5 $state rune (in .svelte.ts modules) ---
		if (callText.startsWith("$state") && filePath.endsWith(".svelte.ts")) {
			results.push({
				kind: "store",
				name,
				filePath,
				storeType: "writable",
				valueType: extractValueType(callText),
			});
		}
	}

	return results;
}
