import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AliasMap, TsConfigResult } from "../types/index.js";

const TSCONFIG_CANDIDATES = [".svelte-kit/tsconfig.json", "tsconfig.json"];

export async function loadTsConfig(projectRoot: string): Promise<TsConfigResult> {
	const absoluteRoot = resolve(projectRoot);

	for (const candidate of TSCONFIG_CANDIDATES) {
		const configPath = join(absoluteRoot, candidate);
		try {
			const content = await readFile(configPath, "utf-8");
			const stripped = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
			const parsed = JSON.parse(stripped);
			return buildResult(parsed, configPath, absoluteRoot);
		} catch {
			// intentional fallthrough
		}
	}

	return { aliases: {}, baseUrl: absoluteRoot, found: false };
}

function buildResult(
	parsed: Record<string, unknown>,
	configPath: string,
	projectRoot: string,
): TsConfigResult {
	const compilerOptions = (parsed.compilerOptions ?? {}) as Record<string, unknown>;
	const baseUrl = typeof compilerOptions.baseUrl === "string" ? compilerOptions.baseUrl : ".";
	const absoluteBaseUrl = resolve(projectRoot, baseUrl);

	const paths = compilerOptions.paths as Record<string, string[]> | undefined;
	const aliases = resolvePaths(paths, absoluteBaseUrl);

	return { aliases, baseUrl: absoluteBaseUrl, found: true, configPath };
}

function resolvePaths(paths: Record<string, string[]> | undefined, baseUrl: string): AliasMap {
	if (!paths) return {};

	const aliases: AliasMap = {};
	for (const [alias, targets] of Object.entries(paths)) {
		const cleanAlias = alias.replace(/\/\*$/, "");
		if (targets.length === 0) continue;
		const cleanTarget = targets[0]?.replace(/\/\*$/, "") ?? "";
		aliases[cleanAlias] = cleanTarget.startsWith("/") ? cleanTarget : resolve(baseUrl, cleanTarget);
	}
	return aliases;
}
