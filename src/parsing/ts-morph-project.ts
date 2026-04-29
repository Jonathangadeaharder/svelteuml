import { Project, type SourceFile, type ts } from "ts-morph";
import type { AliasMap, SvelteUMLConfig } from "../types/index.js";
import type { ScriptContextMap } from "./script-context.js";
import type { SvelteToTsxResult } from "./svelte-to-tsx.js";

/**
 * E1.3 — Shared ts-morph Project for cross-file resolution.
 *
 * All converted source files are added to a single in-memory Project so that
 * ts-morph's type checker can resolve imports, inheritance, and interfaces
 * across the entire SvelteKit codebase in one pass.
 */
export class ParsingProject {
	private project: Project;
	private sourceFileMap = new Map<string, SourceFile>();
	private reverseMap = new Map<string, string>();
	private scriptContexts = new Map<string, ScriptContextMap>();

	constructor(config?: SvelteUMLConfig, aliases?: AliasMap) {
		const compilerOptions: ts.CompilerOptions = {
			strict: true,
			target: 99 satisfies ts.ScriptTarget.ESNext as ts.ScriptTarget,
			module: 99 satisfies ts.ModuleKind.ESNext as ts.ModuleKind,
			moduleResolution: 99 as ts.ModuleResolutionKind,
			esModuleInterop: true,
			skipLibCheck: true,
			forConsistentTypeChecking: true,
			jsx: 4 satisfies ts.JsxEmit.ReactJSX as ts.JsxEmit,
			baseUrl: config?.targetDir ?? ".",
		};

		if (aliases && Object.keys(aliases).length > 0) {
			const paths: Record<string, string[]> = {};
			for (const [alias, resolved] of Object.entries(aliases)) {
				paths[`${alias}/*`] = [`${resolved}/*`];
				paths[alias] = [resolved];
			}
			compilerOptions.paths = paths;
		}

		this.project = new Project({
			useInMemoryFileSystem: true,
			compilerOptions,
		});
	}

	/** Add a converted svelte2tsx result as a SourceFile in the shared project. */
	addConvertedFile(result: SvelteToTsxResult): SourceFile {
		if (!result.success) {
			throw new Error(
				`Cannot add failed conversion for ${result.sourcePath}: ${result.error?.message}`,
			);
		}

		const sf = this.project.createSourceFile(result.virtualPath, result.tsxCode, {
			overwrite: true,
		});

		this.sourceFileMap.set(result.sourcePath, sf);
		this.reverseMap.set(result.virtualPath, result.sourcePath);

		return sf;
	}

	/** Add a plain TS/JS file (already valid TypeScript) to the shared project. */
	addPlainSourceFile(filePath: string, content: string): SourceFile {
		const sf = this.project.createSourceFile(filePath, content, {
			overwrite: true,
		});

		this.sourceFileMap.set(filePath, sf);
		this.reverseMap.set(filePath, filePath);

		return sf;
	}

	/** Get the ts-morph SourceFile for an original file path. */
	addScriptContext(sourcePath: string, context: ScriptContextMap): void {
		this.scriptContexts.set(sourcePath, context);
	}

	getScriptContext(sourcePath: string): ScriptContextMap | undefined {
		return this.scriptContexts.get(sourcePath);
	}

	getSourceFile(originalPath: string): SourceFile | undefined {
		return this.sourceFileMap.get(originalPath);
	}

	/** Get the original file path from a virtual (tsx) path. */
	getOriginalPath(virtualPath: string): string | undefined {
		return this.reverseMap.get(virtualPath);
	}

	/** Get all SourceFiles in the project. */
	getAllSourceFiles(): ReadonlyMap<string, SourceFile> {
		return this.sourceFileMap;
	}

	/** Get the underlying ts-morph Project (for advanced queries). */
	getProject(): Project {
		return this.project;
	}

	/**
	 * Resolve the original source file for a given symbol reference.
	 * If the reference points to a file in our project, returns its original path.
	 * Otherwise returns undefined (external dependency).
	 */
	resolveOriginalFile(filePath: string): string | undefined {
		return this.reverseMap.get(filePath);
	}
}

/**
 * Build a shared ParsingProject from a batch of converted results.
 * Adds all successful conversions and plain source files to the project.
 */
export function buildParsingProject(
	svelteResults: SvelteToTsxResult[],
	plainFiles: Array<{ path: string; content: string }>,
	config?: SvelteUMLConfig,
	aliases?: AliasMap,
): ParsingProject {
	const parsingProject = new ParsingProject(config, aliases);

	for (const result of svelteResults) {
		if (result.success) {
			parsingProject.addConvertedFile(result);
			if (result.scriptContext) {
				parsingProject.addScriptContext(result.sourcePath, result.scriptContext);
			}
		}
	}

	for (const { path, content } of plainFiles) {
		parsingProject.addPlainSourceFile(path, content);
	}

	return parsingProject;
}
