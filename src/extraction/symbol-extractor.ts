import { basename } from "node:path";
import type { SourceFile } from "ts-morph";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { PipelineErrorHandler } from "../pipeline/error-handler.js";
import type {
	ClassSymbol,
	ComponentSymbol,
	ExportSymbol,
	FunctionSymbol,
	PropSymbol,
	RouteSymbol,
	StoreSymbol,
	SymbolTable,
} from "../types/ast.js";
import { componentNameFromPath, extractComponentProps } from "./component-extractor.js";
import { extractLibClasses, extractLibFunctions } from "./lib-extractor.js";
import {
	classifyRouteFile,
	extractRouteExports,
	parseRouteSegment,
	routeSegmentFromPath,
} from "./route-extractor.js";
import { extractServerExports } from "./server-extractor.js";
import { shouldSkipFile } from "./skip-rules.js";
import { extractStoreSymbols } from "./store-extractor.js";

export class SymbolExtractor {
	private readonly project: ParsingProject;
	private readonly errorHandler: PipelineErrorHandler;
	private readonly exportedFiles: Set<string>;

	constructor(
		project: ParsingProject,
		errorHandler: PipelineErrorHandler,
		exportedFiles?: Set<string>,
	) {
		this.project = project;
		this.errorHandler = errorHandler;
		this.exportedFiles = exportedFiles ?? new Set();
	}

	extract(): SymbolTable {
		const classes: ClassSymbol[] = [];
		const functions: FunctionSymbol[] = [];
		const stores: StoreSymbol[] = [];
		const props: PropSymbol[] = [];
		const exports: ExportSymbol[] = [];
		const routes: RouteSymbol[] = [];
		const components: ComponentSymbol[] = [];

		for (const [originalPath, sourceFile] of this.project.getAllSourceFiles()) {
			if (shouldSkipFile(originalPath)) continue;

			try {
				const extracted = this.extractFile(originalPath, sourceFile);
			classes.push(...extracted.classes);
			functions.push(...extracted.functions);
			stores.push(...extracted.stores);
			props.push(...extracted.props);
			routes.push(...extracted.routes);
			components.push(...extracted.components);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				const error: import("../pipeline/error-handler.js").PipelineError = {
					file: originalPath,
					phase: "extraction",
					message,
				};
				if (err instanceof Error && err.stack) error.stack = err.stack;
				this.errorHandler.addError(error);
			}
		}

		return {
			classes: sortBy(classes, (c) => `${c.filePath}::${c.name}`),
			functions: sortBy(functions, (f) => `${f.filePath}::${f.name}`),
			stores: sortBy(stores, (s) => `${s.filePath}::${s.name}`),
			props: sortBy(props, (p) => `${p.filePath}::${p.componentName}::${p.name}`),
			exports,
			routes: deduplicateRoutes(routes),
			components: sortBy(components, (c) => `${c.filePath}::${c.name}`),
		};
	}

	private extractFile(
		originalPath: string,
		sourceFile: SourceFile,
	): {
		classes: ClassSymbol[];
		functions: FunctionSymbol[];
		stores: StoreSymbol[];
		props: PropSymbol[];
		routes: RouteSymbol[];
		components: ComponentSymbol[];
	} {
		const classes: ClassSymbol[] = [];
		const functions: FunctionSymbol[] = [];
		const stores: StoreSymbol[] = [];
		const props: PropSymbol[] = [];
		const routes: RouteSymbol[] = [];
		const components: ComponentSymbol[] = [];

		const isSvelte = originalPath.endsWith(".svelte") || originalPath.endsWith(".svelte.tsx");

		if (isSvelte) {
			const componentName = componentNameFromPath(originalPath.replace(/\.tsx$/, ""));
			const originalSveltePath = originalPath.replace(/\.tsx$/, "");
			const scriptContext = this.project.getScriptContext(originalSveltePath);
			const componentProps = extractComponentProps(
				sourceFile,
				componentName,
				originalSveltePath,
				scriptContext,
			);
			props.push(...componentProps);

			components.push({
				kind: "component",
				name: componentName,
				filePath: originalSveltePath,
			});

			const svelteRouteClass = classifyRouteFile(originalSveltePath);
			if (svelteRouteClass) {
				const routeSegment = routeSegmentFromPath(originalSveltePath);
				const parsedSegment = parseRouteSegment(routeSegment);
				const routeName = basename(originalSveltePath).replace(/\.svelte$/, "");
				routes.push({
					kind: "route",
					name: routeName,
					filePath: originalSveltePath,
					routeKind: svelteRouteClass.kind,
					isServer: svelteRouteClass.isServer,
					routeSegment: parsedSegment,
				});
			}

			return { classes, functions, stores, props, routes, components };
		}

		const routeClass = classifyRouteFile(originalPath);

		if (routeClass) {
			const routeSegment = routeSegmentFromPath(originalPath);
			const parsedSegment = parseRouteSegment(routeSegment);
			const routeName = basename(originalPath).replace(/\.(ts|js)$/, "");
			routes.push({
				kind: "route",
				name: routeName,
				filePath: originalPath,
				routeKind: routeClass.kind,
				isServer: routeClass.isServer,
				routeSegment: parsedSegment,
			});

			const routeFns = extractRouteExports(sourceFile, originalPath);
			functions.push(...routeFns);

			if (routeClass.isServer) {
				const serverExports = extractServerExports(sourceFile, originalPath);
				const existingNames = new Set(routeFns.map((f) => f.name));
				for (const se of serverExports) {
					if (!existingNames.has(se.name)) {
						functions.push(se);
					}
				}
			}
			return { classes, functions, stores, props, routes, components };
		}

		const storeSymbols = extractStoreSymbols(sourceFile, originalPath);
		stores.push(...storeSymbols);

		const libFns = extractLibFunctions(sourceFile, originalPath);
		functions.push(...libFns);

		const libClasses = extractLibClasses(sourceFile, originalPath);
		classes.push(...libClasses);

		if (this.exportedFiles.has(originalPath)) {
			for (const cls of classes) cls.isExported = true;
			for (const store of stores) store.isExported = true;
		}

		return { classes, functions, stores, props, routes, components };
	}
}

function sortBy<T>(arr: T[], key: (item: T) => string): T[] {
	return [...arr].sort((a, b) => key(a).localeCompare(key(b)));
}

/**
 * Deduplicate routes where both `.svelte` and `.ts/.js` files exist for the
 * same route segment (e.g. `+page.svelte` and `+page.ts`).
 * Keeps the `.svelte` variant (which carries component props) and drops the
 * plain `.ts/.js` variant.
 */
function deduplicateRoutes(routes: RouteSymbol[]): RouteSymbol[] {
	const deduped: RouteSymbol[] = [];
	const svelteKeys = new Set<string>();

	for (const route of routes) {
		if (route.filePath.endsWith(".svelte")) {
			svelteKeys.add(`${route.routeSegment.raw}::${route.name}`);
		}
	}
	for (const route of routes) {
		const key = `${route.routeSegment.raw}::${route.name}`;
		if (!route.filePath.endsWith(".svelte") && svelteKeys.has(key)) {
			continue;
		}
		deduped.push(route);
	}
	return sortBy(deduped, (r) => `${r.filePath}::${r.name}`);
}
