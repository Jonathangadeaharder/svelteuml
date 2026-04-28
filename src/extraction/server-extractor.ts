import type { SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { FunctionSymbol } from "../types/ast.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2.3 — Server module symbols: load, actions, GET/POST/...
 *
 * Extracts all exported server-related functions from SvelteKit server modules:
 *   - Universal / server load functions
 *   - Form actions object (treated as a single exported symbol)
 *   - HTTP verb handlers for +server.ts files
 *
 * Works on the ts-morph SourceFile for a `.ts` / `.js` file.
 */

export type ServerExportKind =
	| "load"
	| "action"
	| "http-handler"
	| "other";

export interface ServerExportSymbol extends FunctionSymbol {
	/** More specific server-export classification. */
	serverKind: ServerExportKind;
}

/** HTTP verbs recognised in +server.ts files. */
export const HTTP_VERBS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "fallback"]);

function classifyServerExport(name: string): ServerExportKind {
	if (name === "load") return "load";
	if (name === "actions") return "action";
	if (HTTP_VERBS.has(name)) return "http-handler";
	return "other";
}

/**
 * Extract all exported server symbols from a TS/JS source file.
 *
 * Returns one `ServerExportSymbol` per recognised named export.
 */
export function extractServerExports(
	sourceFile: SourceFile,
	filePath: string,
): ServerExportSymbol[] {
	if (shouldSkipFile(filePath)) return [];

	const results: ServerExportSymbol[] = [];

	// 1. Named function declarations: `export async function load(...) { ... }`
	for (const fn of sourceFile.getFunctions()) {
		if (!fn.isExported()) continue;
		const name = fn.getName();
		if (!name) continue;

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync: fn.isAsync(),
			parameters: fn.getParameters().map((p) => ({
				name: p.getName(),
				type: p.getType().getText(),
				isOptional: p.isOptional(),
			})),
			returnType: fn.getReturnType().getText(),
			typeParams: fn.getTypeParameters().map((tp) => tp.getName()),
			serverKind: classifyServerExport(name),
		});
	}

	// 2. Exported const / let with function initialiser:
	//    `export const load = async ({ fetch }) => { ... }`
	//    `export const actions = { default: async ({ request }) => { ... } }`
	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const stmt = varDecl.getVariableStatement();
		if (!stmt?.isExported()) continue;

		const name = varDecl.getName();
		const init = varDecl.getInitializer();
		if (!init) continue;

		const initKind = init.getKind();
		const isFunction =
			initKind === SyntaxKind.ArrowFunction ||
			initKind === SyntaxKind.FunctionExpression;
		const isObject = initKind === SyntaxKind.ObjectLiteralExpression;

		// For the `actions` export, the value is an object literal — still emit it
		if (!isFunction && !(name === "actions" && isObject)) {
			continue;
		}

		const isAsync = init.getText().trimStart().startsWith("async");

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync,
			parameters: [],
			returnType: "unknown",
			typeParams: [],
			serverKind: classifyServerExport(name),
		});
	}

	// Deduplicate by name (a name can appear at most once)
	const seen = new Set<string>();
	return results.filter((r) => {
		if (seen.has(r.name)) return false;
		seen.add(r.name);
		return true;
	});
}
