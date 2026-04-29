import type { SourceFile } from "ts-morph";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { PipelineErrorHandler } from "../pipeline/error-handler.js";
import type {
	ClassSymbol,
	ExportSymbol,
	FunctionSymbol,
	PropSymbol,
	StoreSymbol,
	SymbolTable,
} from "../types/ast.js";
import { componentNameFromPath, extractComponentProps } from "./component-extractor.js";
import { extractLibClasses, extractLibFunctions } from "./lib-extractor.js";
import { classifyRouteFile, extractRouteExports } from "./route-extractor.js";
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

		for (const [originalPath, sourceFile] of this.project.getAllSourceFiles()) {
			if (shouldSkipFile(originalPath)) continue;

			try {
				const extracted = this.extractFile(originalPath, sourceFile);
				classes.push(...extracted.classes);
				functions.push(...extracted.functions);
				stores.push(...extracted.stores);
				props.push(...extracted.props);
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
	} {
		const classes: ClassSymbol[] = [];
		const functions: FunctionSymbol[] = [];
		const stores: StoreSymbol[] = [];
		const props: PropSymbol[] = [];

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
			return { classes, functions, stores, props };
		}

		const routeClass = classifyRouteFile(originalPath);

		if (routeClass) {
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
			return { classes, functions, stores, props };
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

		return { classes, functions, stores, props };
	}
}

function sortBy<T>(arr: T[], key: (item: T) => string): T[] {
	return [...arr].sort((a, b) => key(a).localeCompare(key(b)));
}
