import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AliasMap, SvelteConfigResult } from "../types/index.js";

const SVELTE_CONFIG_CANDIDATES = ["svelte.config.js", "svelte.config.mjs", "svelte.config.ts"];

const DEFAULT_ALIASES: AliasMap = {
	$lib: "src/lib",
};

export async function loadSvelteConfig(projectRoot: string): Promise<SvelteConfigResult> {
	const absoluteRoot = resolve(projectRoot);

	for (const candidate of SVELTE_CONFIG_CANDIDATES) {
		const configPath = join(absoluteRoot, candidate);
		try {
			const content = await readFile(configPath, "utf-8");
			const aliases = extractAliases(content, absoluteRoot);
			return { aliases: { ...DEFAULT_ALIASES, ...aliases }, found: true, configPath };
		} catch {
			// intentional fallthrough
		}
	}

	return { aliases: { ...DEFAULT_ALIASES }, found: false };
}

/**
 * Extract a balanced-brace block starting at `fromIndex`.
 * Counts opening/closing braces and stops when depth reaches 0.
 * Returns the slice of content inside the outermost braces (not including them),
 * or null if no balanced block is found.
 */
function extractBalancedBlock(content: string, fromIndex: number): string | null {
	if (fromIndex === -1) return null;
	const openBrace = content.indexOf("{", fromIndex);
	if (openBrace === -1) return null;

	let depth = 0;
	let inString: string | null = null;
	let i = openBrace;

	while (i < content.length) {
		const ch = content[i];

		// Handle string literals (skip their contents for brace counting)
		if (inString) {
			if (ch === "\\" && i + 1 < content.length) {
				i += 2; // skip escaped char
				continue;
			}
			if (ch === inString) inString = null;
			i++;
			continue;
		}

		if (ch === '"' || ch === "'" || ch === "`") {
			inString = ch;
			i++;
			continue;
		}

		if (ch === "{") {
			depth++;
		} else if (ch === "}") {
			depth--;
			if (depth === 0) {
				return content.slice(openBrace + 1, i);
			}
		}
		i++;
	}

	return null; // unbalanced
}

function extractAliases(content: string, projectRoot: string): AliasMap {
	const aliases: AliasMap = {};

	const viteIndex = content.indexOf("vite");
	if (viteIndex !== -1) {
		const viteBlock = extractBalancedBlock(content, viteIndex);
		if (viteBlock) {
			const resolveIndex = viteBlock.indexOf("resolve");
			if (resolveIndex !== -1) {
				const resolveBlock = extractBalancedBlock(viteBlock, resolveIndex);
				if (resolveBlock) {
					const aliasIndex = resolveBlock.indexOf("alias");
					if (aliasIndex !== -1) {
						const aliasBlock = extractBalancedBlock(resolveBlock, aliasIndex);
						if (aliasBlock) {
							Object.assign(aliases, parseAliasObject(aliasBlock, projectRoot));
						}
					}
				}
			}
		}
	}

	const kitIndex = content.indexOf("kit");
	if (kitIndex !== -1) {
		const kitBlock = extractBalancedBlock(content, kitIndex);
		if (kitBlock) {
			const aliasIndex = kitBlock.indexOf("alias");
			if (aliasIndex !== -1) {
				const aliasBlock = extractBalancedBlock(kitBlock, aliasIndex);
				if (aliasBlock) {
					Object.assign(aliases, parseAliasObject(aliasBlock, projectRoot));
				}
			}
		}
	}

	return aliases;
}

function parseAliasObject(raw: string, projectRoot: string): AliasMap {
	const aliases: AliasMap = {};
	const pattern = /['"]?([\w$]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
	let match: RegExpExecArray | null = pattern.exec(raw);
	while (match !== null) {
		const [, alias, path] = match;
		if (alias && path) {
			aliases[alias] = path.startsWith("/") ? path : resolve(projectRoot, path);
		}
		match = pattern.exec(raw);
	}
	return aliases;
}
