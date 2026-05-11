import { dirname } from "node:path";
import { SyntaxKind } from "ts-morph";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { SymbolTable } from "../types/ast.js";
import type { Edge } from "../types/edge.js";

/**
 * E3.7 — Server-load → page edges (typed $page prop).
 *
 * Builds edges from server load functions (+page.server.ts / +layout.server.ts)
 * to the corresponding page/layout .svelte components that consume the data
 * via the `$page` store from `$app/stores`.
 *
 * Detection strategy:
 *   1. Find server route entries (+page.server / +layout.server) in the symbol table.
 *   2. Match them to .svelte files in the same directory (same route segment).
 *   3. Check if the .svelte file's svelte2tsx output imports `page` from `$app/stores`
 *      and accesses properties on it (e.g. `page.data`, `page.url`).
 *   4. Emit a `server_load` edge from the server file to the .svelte file.
 */

interface ServerRouteMatch {
	serverFile: string;
	svelteFile: string;
	pageProps: string[];
}

export function buildServerLoadEdges(
	symbols: SymbolTable,
	parsingProject: ParsingProject,
): Edge[] {
	const matches = findServerPageMatches(symbols, parsingProject);
	const seen = new Set<string>();
	const edges: Edge[] = [];

	for (const match of matches) {
		if (match.pageProps.length === 0) continue;

		const key = `${match.serverFile}|${match.svelteFile}`;
		if (seen.has(key)) continue;
		seen.add(key);

		edges.push({
			source: match.serverFile,
			target: match.svelteFile,
			type: "server_load",
			label: match.pageProps.join(", "),
		});
	}

	return edges;
}

function findServerPageMatches(
	symbols: SymbolTable,
	parsingProject: ParsingProject,
): ServerRouteMatch[] {
	const serverRoutes = symbols.routes.filter((r) => r.isServer);
	const svelteByDir = groupSvelteRoutesByDir(symbols.components, symbols.routes);

	const matches: ServerRouteMatch[] = [];

	for (const server of serverRoutes) {
		const dir = dirname(server.filePath);
		const svelteFile = svelteByDir.get(dir);
		if (!svelteFile) continue;

		const tsxSource = resolveSourceFile(parsingProject, svelteFile);
		if (!tsxSource) continue;

		const pageProps = extractPageProps(tsxSource);
		matches.push({ serverFile: server.filePath, svelteFile, pageProps });
	}

	return matches;
}

function resolveSourceFile(
	parsingProject: ParsingProject,
	sveltePath: string,
): import("ts-morph").SourceFile | undefined {
	try {
		return parsingProject.getSourceFile(sveltePath);
	} catch {
		// Fallback to the ts-morph Project when getSourceFile throws
		// (e.g. in test mocks that don't implement getSourceFile)
		try {
			return parsingProject.getProject().getSourceFile(sveltePath) ?? undefined;
		} catch {
			return undefined;
		}
	}
}

function groupSvelteRoutesByDir(
	components: SymbolTable["components"],
	routes: SymbolTable["routes"],
): Map<string, string> {
	const map = new Map<string, string>();
	for (const comp of components) {
		const route = routes.find((r) => r.filePath === comp.filePath && !r.isServer);
		if (!route) continue;
		const dir = dirname(comp.filePath);
		map.set(dir, comp.filePath);
	}
	return map;
}

function extractPageProps(sourceFile: import("ts-morph").SourceFile): string[] {
	const pageImport = sourceFile
		.getImportDeclarations()
		.find(
			(imp) =>
				imp.getModuleSpecifierValue() === "$app/stores" &&
				imp.getNamedImports().some((ni) => ni.getName() === "page"),
		);

	if (!pageImport) return [];

	const props: string[] = [];
	const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);

	for (const access of propAccesses) {
		const expr = access.getExpression();
		if (expr.getKind() !== SyntaxKind.Identifier) continue;
		if (expr.getText() !== "page") continue;

		const propName = access.getName();
		if (!propName) continue;

		const label = `$page.${propName}`;
		if (!props.includes(label)) {
			props.push(label);
		}
	}

	return props.sort();
}
