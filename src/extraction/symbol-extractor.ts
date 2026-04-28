import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { ClassSymbol, ExportSymbol, FunctionSymbol, PropSymbol, StoreSymbol, SymbolTable } from "../types/ast.js";
import { extractComponentProps, componentNameFromPath } from "./component-extractor.js";
import { extractLibClasses, extractLibFunctions } from "./lib-extractor.js";
import { classifyRouteFile, extractRouteExports } from "./route-extractor.js";
import { extractServerExports } from "./server-extractor.js";
import { extractStoreSymbols } from "./store-extractor.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2 — Symbol Extraction orchestrator.
 *
 * Walks every SourceFile in the shared ParsingProject and dispatches to the
 * appropriate sub-extractor based on the file type / naming convention.
 * Returns a fully populated SymbolTable.
 *
 * Dispatch rules (applied in order):
 *  1. Skip files matching shouldSkipFile()
 *  2. `.svelte` / `.svelte.tsx` (virtual) → component-extractor (props)
 *  3. Route file (name starts with `+`) → route-extractor + server-extractor
 *  4. Any TS/JS file → store-extractor + lib-extractor
 *
 * Results are deterministically sorted so diagram output is diff-stable.
 */
export class SymbolExtractor {
	private readonly project: ParsingProject;

	constructor(project: ParsingProject) {
		this.project = project;
	}

	/**
	 * Run the full extraction pass and return a populated SymbolTable.
	 */
	extract(): SymbolTable {
		const classes: ClassSymbol[] = [];
		const functions: FunctionSymbol[] = [];
		const stores: StoreSymbol[] = [];
		const props: PropSymbol[] = [];
		const exports: ExportSymbol[] = [];

		for (const [originalPath, sourceFile] of this.project.getAllSourceFiles()) {
			// E2.6 — skip generated / external files
			if (shouldSkipFile(originalPath)) continue;

			const isSvelte =
				originalPath.endsWith(".svelte") ||
				// svelte2tsx virtual path
				originalPath.endsWith(".svelte.tsx");

			if (isSvelte) {
				// E2.1 — component props
				const componentName = componentNameFromPath(
					originalPath.replace(/\.tsx$/, ""),
				);
				const componentProps = extractComponentProps(
					sourceFile,
					componentName,
					originalPath.replace(/\.tsx$/, ""),
				);
				props.push(...componentProps);
				continue;
			}

			const routeClass = classifyRouteFile(originalPath);

			if (routeClass) {
				// E2.2 / E2.3 — route + server exports
				const routeFns = extractRouteExports(sourceFile, originalPath);
				functions.push(...routeFns);

				if (routeClass.isServer) {
					const serverExports = extractServerExports(sourceFile, originalPath);
					// Merge: serverExports may overlap with routeFns (same logic); dedupe by name
					const existingNames = new Set(routeFns.map((f) => f.name));
					for (const se of serverExports) {
						if (!existingNames.has(se.name)) {
							functions.push(se);
						}
					}
				}
				continue;
			}

			// E2.4 — stores
			const storeSymbols = extractStoreSymbols(sourceFile, originalPath);
			stores.push(...storeSymbols);

			// E2.5 — lib helpers (functions + classes)
			const libFns = extractLibFunctions(sourceFile, originalPath);
			functions.push(...libFns);

			const libClasses = extractLibClasses(sourceFile, originalPath);
			classes.push(...libClasses);
		}

		return {
			classes: sortBy(classes, (c) => `${c.filePath}::${c.name}`),
			functions: sortBy(functions, (f) => `${f.filePath}::${f.name}`),
			stores: sortBy(stores, (s) => `${s.filePath}::${s.name}`),
			props: sortBy(props, (p) => `${p.filePath}::${p.componentName}::${p.name}`),
			exports,
		};
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortBy<T>(arr: T[], key: (item: T) => string): T[] {
	return [...arr].sort((a, b) => key(a).localeCompare(key(b)));
}
