import { basename, dirname } from "node:path";
import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FunctionSymbol } from "../types/ast.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2.2 — Route file symbols: +page / +layout / +error / +server.
 *
 * SvelteKit route files follow strict naming conventions:
 *   +page.svelte, +page.ts, +page.server.ts
 *   +layout.svelte, +layout.ts, +layout.server.ts
 *   +error.svelte
 *   +server.ts
 *
 * For .svelte route files this module emits a lightweight FunctionSymbol that
 * represents the page/layout as a renderable unit (the actual prop extraction
 * is done by the component extractor).
 *
 * For .ts/.js route files it delegates to the server-module extractor.
 */

export type RouteKind = "page" | "layout" | "error" | "server";

export interface RouteFileSymbol {
	/** Resolved kind of the route file. */
	kind: RouteKind;
	/** Whether this is a server-only module (.server.ts). */
	isServer: boolean;
	/** Absolute file path. */
	filePath: string;
	/** SvelteKit route segment path, e.g. `/game/[code]`. */
	routeSegment: string;
	/** Exported functions found in the file (load, actions, etc.). */
	exportedFunctions: FunctionSymbol[];
}

/** Route-file basename patterns. */
const ROUTE_PATTERNS: Array<{ pattern: RegExp; kind: RouteKind; isServer: boolean }> = [
	{ pattern: /^\+page\.server\.(ts|js)$/, kind: "page", isServer: true },
	{ pattern: /^\+page\.(ts|js)$/, kind: "page", isServer: false },
	{ pattern: /^\+page\.svelte$/, kind: "page", isServer: false },
	{ pattern: /^\+layout\.server\.(ts|js)$/, kind: "layout", isServer: true },
	{ pattern: /^\+layout\.(ts|js)$/, kind: "layout", isServer: false },
	{ pattern: /^\+layout\.svelte$/, kind: "layout", isServer: false },
	{ pattern: /^\+error\.svelte$/, kind: "error", isServer: false },
	{ pattern: /^\+server\.(ts|js)$/, kind: "server", isServer: true },
];

/**
 * Detect whether a file path is a SvelteKit route file.
 */
export function isRouteFile(filePath: string): boolean {
	const name = basename(filePath);
	return ROUTE_PATTERNS.some(({ pattern }) => pattern.test(name));
}

/**
 * Classify a route file path.
 * Returns `null` if the file is not a recognised route file.
 */
export function classifyRouteFile(filePath: string): { kind: RouteKind; isServer: boolean } | null {
	const name = basename(filePath);
	for (const { pattern, kind, isServer } of ROUTE_PATTERNS) {
		if (pattern.test(name)) {
			return { kind, isServer };
		}
	}
	return null;
}

/**
 * Derive the SvelteKit route segment from a file's directory path.
 * Strips everything up to and including `src/routes`.
 *
 * `/project/src/routes/game/[code]/+page.svelte` → `/game/[code]`
 * `/project/src/routes/+page.svelte`              → `/`
 */
export function routeSegmentFromPath(filePath: string): string {
	const dir = dirname(filePath);
	const normalizedDir = dir.replace(/\\/g, "/");
	const match = /src\/routes(\/.*)?$/.exec(normalizedDir);
	if (!match) return "/";
	const segment = match[1] ?? "";
	return segment === "" ? "/" : segment;
}

/**
 * Extract exported function symbols from a route TS/JS source file.
 * Recognises: `load`, `actions`, HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
 */
export function extractRouteExports(sourceFile: SourceFile, filePath: string): FunctionSymbol[] {
	if (shouldSkipFile(filePath)) return [];

	const KNOWN_EXPORTS = new Set([
		"load",
		"actions",
		"GET",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"HEAD",
		"OPTIONS",
		"fallback",
	]);
	const results: FunctionSymbol[] = [];

	// Named function declarations: `export async function load(...)
	for (const fn of sourceFile.getFunctions()) {
		if (!fn.isExported()) continue;
		const name = fn.getName();
		if (!(name && KNOWN_EXPORTS.has(name))) continue;

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync: fn.isAsync(),
			parameters: fn.getParameters().map((p) => ({
				name: p.getName(),
				type: p.getType().getText() ?? "unknown",
				isOptional: p.isOptional(),
			})),
			returnType: fn.getReturnType().getText(),
			typeParams: fn.getTypeParameters().map((tp) => tp.getName()),
		});
	}

	// Arrow-function variable exports: `export const load = async ({ ... }) => ...`
	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const stmt = varDecl.getVariableStatement();
		if (!stmt?.isExported()) continue;

		const name = varDecl.getName();
		if (!KNOWN_EXPORTS.has(name)) continue;

		const init = varDecl.getInitializer();
		if (!init) continue;

		const initKind = init.getKind();
		const isFunctionLike =
			initKind === SyntaxKind.ArrowFunction ||
			initKind === SyntaxKind.FunctionExpression;
		const isActionsObject =
			name === "actions" && initKind === SyntaxKind.ObjectLiteralExpression;
		if (!isFunctionLike && !isActionsObject) continue;

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync: init.getText().trimStart().startsWith("async"),
			parameters: [],
			returnType: "unknown",
			typeParams: [],
		});
	}

	return results;
}

/**
 * Full route-file symbol extraction.
 */
export function extractRouteFileSymbol(
	sourceFile: SourceFile,
	filePath: string,
): RouteFileSymbol | null {
	if (shouldSkipFile(filePath)) return null;

	const classification = classifyRouteFile(filePath);
	if (!classification) return null;

	const routeSegment = routeSegmentFromPath(filePath);
	const isSvelte = filePath.endsWith(".svelte");

	const exportedFunctions = isSvelte
		? [] // component extraction handles .svelte files
		: extractRouteExports(sourceFile, filePath);

	return {
		kind: classification.kind,
		isServer: classification.isServer,
		filePath,
		routeSegment,
		exportedFunctions,
	};
}
