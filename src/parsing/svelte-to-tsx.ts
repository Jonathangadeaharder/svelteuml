import { readFile } from "node:fs/promises";
import type { ParseError, ParseResult } from "../types/index.js";
import { parseScriptContexts, type ScriptContextMap } from "./script-context.js";

/** svelte2tsx is a dev/optional dependency — lazy-load to avoid crash at runtime if missing. */
type Svelte2TsxFn = (
	code: string,
	options: {
		filename?: string;
		isTsFile?: boolean;
		mode: "dts" | "ts";
		version?: string;
		emitOnTemplateError?: boolean;
	},
) => { code: string; map?: unknown; exportedNames?: unknown };

let _svelte2tsx: Svelte2TsxFn | undefined;

async function getSvelte2Tsx(): Promise<Svelte2TsxFn> {
	if (_svelte2tsx) return _svelte2tsx;
	const mod = await import("svelte2tsx");
	const fn: Svelte2TsxFn = mod.svelte2tsx;
	_svelte2tsx = fn;
	return fn;
}

/**
 * Detect whether a Svelte file uses TypeScript in its `<script>` block.
 * Falls back to file extension heuristic if the content is unavailable.
 */
export function isTypeScriptSvelte(content: string): boolean {
	return /<script[^>]*\blang\s*=\s*["'](?:ts|typescript)["']/.test(content);
}

/**
 * Result of converting a single .svelte file to TSX via svelte2tsx.
 * Includes the generated TSX code, source map, and metadata.
 */
export interface SvelteToTsxResult {
	/** The file path of the original .svelte file (absolute). */
	sourcePath: string;
	/** The virtual TSX file path used by ts-morph (absolute, .svelte.tsx suffix). */
	virtualPath: string;
	/** The converted TSX code. */
	tsxCode: string;
	/** Raw source map object from svelte2tsx (if available). */
	sourceMap: unknown;
	/** Whether the conversion succeeded. */
	success: boolean;
	scriptContext?: ScriptContextMap;
	error?: ParseError;
}

/**
 * Convert a single .svelte file to TSX using svelte2tsx.
 *
 * E1.2 — Per-file pipeline: .svelte → svelte2tsx → ts-morph SourceFile
 */
export async function convertSvelteToTsx(filePath: string): Promise<SvelteToTsxResult> {
	const virtualPath = `${filePath}.tsx`;

	try {
		const content = await readFile(filePath, "utf-8");
		const isTs = isTypeScriptSvelte(content);
		const scriptContext = parseScriptContexts(content);
		const svelte2tsx = await getSvelte2Tsx();

		const result = svelte2tsx(content, {
			filename: filePath,
			isTsFile: isTs,
			mode: "ts",
			emitOnTemplateError: true,
		});

		return {
			sourcePath: filePath,
			virtualPath,
			tsxCode: result.code,
			sourceMap: result.map,
			success: true,
			scriptContext: { ...scriptContext, sourcePath: filePath },
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			sourcePath: filePath,
			virtualPath,
			tsxCode: "",
			sourceMap: undefined,
			success: false,
			error: { message },
		};
	}
}

/**
 * Convert a TypeScript or JavaScript source file for ts-morph consumption.
 * Non-Svelte TS/JS files don't need svelte2tsx — they're passed through directly.
 */
export function convertPlainTsFile(
	filePath: string,
	content: string,
): { virtualPath: string; code: string; success: true; sourceMap: undefined } {
	return {
		virtualPath: filePath,
		code: content,
		success: true,
		sourceMap: undefined,
	};
}

/**
 * Batch-convert a list of discovered file paths into ParseResult + SvelteToTsxResult pairs.
 * Handles .svelte, .svelte.ts, .svelte.js, .ts, .tsx, .js, .jsx files.
 */
export async function convertFiles(
	svelteFiles: string[],
	plainFiles: string[],
): Promise<{
	results: SvelteToTsxResult[];
	parseResults: ParseResult[];
}> {
	const results: SvelteToTsxResult[] = [];
	const parseResults: ParseResult[] = [];

	for (const filePath of svelteFiles) {
		const result = await convertSvelteToTsx(filePath);
		results.push(result);
		parseResults.push({
			sourceFile: filePath,
			success: result.success,
			...(result.error && { error: result.error }),
		});
	}

	for (const filePath of plainFiles) {
		try {
			const content = await readFile(filePath, "utf-8");
			const result = convertPlainTsFile(filePath, content);
			results.push({
				sourcePath: filePath,
				virtualPath: result.virtualPath,
				tsxCode: result.code,
				sourceMap: result.sourceMap,
				success: true,
			});
			parseResults.push({
				sourceFile: filePath,
				success: true,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			results.push({
				sourcePath: filePath,
				virtualPath: filePath,
				tsxCode: "",
				sourceMap: undefined,
				success: false,
				error: { message },
			});
			parseResults.push({
				sourceFile: filePath,
				success: false,
				error: { message },
			});
		}
	}

	return { results, parseResults };
}
