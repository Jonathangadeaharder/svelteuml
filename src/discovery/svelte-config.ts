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
			const aliases = await extractAliases(content, absoluteRoot);
			return { aliases: { ...DEFAULT_ALIASES, ...aliases }, found: true, configPath };
		} catch {
			continue;
		}
	}

	return { aliases: { ...DEFAULT_ALIASES }, found: false };
}

async function extractAliases(content: string, projectRoot: string): Promise<AliasMap> {
	const aliases: AliasMap = {};

	const viteAliasMatch = content.match(
		/vite\s*:\s*\{[^}]*resolve\s*:\s*\{[^}]*alias\s*:\s*(\{[^}]*\})/s,
	);
	if (viteAliasMatch?.[1]) {
		Object.assign(aliases, parseAliasObject(viteAliasMatch[1], projectRoot));
	}

	const kitAliasMatch = content.match(/kit\s*:\s*\{[^}]*alias\s*:\s*(\{[^}]*\})/s);
	if (kitAliasMatch?.[1]) {
		Object.assign(aliases, parseAliasObject(kitAliasMatch[1], projectRoot));
	}

	return aliases;
}

function parseAliasObject(raw: string, projectRoot: string): AliasMap {
	const aliases: AliasMap = {};
	const pattern = /['"]?(\$[\w$]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(raw)) !== null) {
		const [, alias, path] = match;
		if (alias && path) {
			aliases[alias] = path.startsWith("/") ? path : resolve(projectRoot, path);
		}
	}
	return aliases;
}
