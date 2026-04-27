import fg from "fast-glob";
import { resolve, extname } from "node:path";
import type { DiscoveredFiles } from "../types/index.js";

const DEFAULT_INCLUDE_PATTERNS = [
	"**/*.svelte",
	"**/*.ts",
	"**/*.tsx",
	"**/*.js",
	"**/*.jsx",
	"**/*.svelte.ts",
	"**/*.svelte.js",
];

const DEFAULT_EXCLUDE_PATTERNS = [
	"**/node_modules/**",
	"**/.svelte-kit/**",
	"**/dist/**",
	"**/.git/**",
	"**/*.spec.ts",
	"**/*.test.ts",
	"**/*.spec.js",
	"**/*.test.js",
	"**/*.spec.svelte",
	"**/*.test.svelte",
];

export interface DiscoveryOptions {
	include?: string[];
	exclude?: string[];
}

export async function discoverFiles(
	projectRoot: string,
	options: DiscoveryOptions = {},
): Promise<DiscoveredFiles> {
	const absoluteRoot = resolve(projectRoot);
	const include = [...DEFAULT_INCLUDE_PATTERNS, ...(options.include ?? [])];
	const exclude = [...DEFAULT_EXCLUDE_PATTERNS, ...(options.exclude ?? [])];

	const entries = await fg(include, {
		cwd: absoluteRoot,
		absolute: true,
		ignore: exclude,
		onlyFiles: true,
		dot: false,
	});

	return categorizeFiles(entries);
}

function categorizeFiles(files: string[]): DiscoveredFiles {
	const svelte: string[] = [];
	const typescript: string[] = [];
	const javascript: string[] = [];
	const svelteModules: string[] = [];

	for (const file of files) {
		const ext = extname(file);
		if (file.endsWith(".svelte.ts") || file.endsWith(".svelte.js")) {
			svelteModules.push(file);
		} else if (ext === ".svelte") {
			svelte.push(file);
		} else if (ext === ".ts") {
			typescript.push(file);
		} else if (ext === ".js" || ext === ".jsx") {
			javascript.push(file);
		} else if (ext === ".tsx") {
			typescript.push(file);
		}
	}

	return { svelte, typescript, javascript, svelteModules };
}
