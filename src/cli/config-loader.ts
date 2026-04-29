import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_FILENAMES = ["svelteuml.config.ts", ".svelteumlrc.json", ".svelteumlrc"];

const KNOWN_FIELDS = new Set([
	"targetDir",
	"outputPath",
	"aliasOverrides",
	"exclude",
	"include",
	"maxDepth",
	"excludeExternals",
]);

export async function searchConfigFile(searchDir: string): Promise<{ path: string } | undefined> {
	for (const filename of CONFIG_FILENAMES) {
		const fullPath = join(searchDir, filename);
		if (existsSync(fullPath)) return { path: fullPath };
	}
	return undefined;
}

function warnUnknownFields(config: Record<string, unknown>): void {
	for (const key of Object.keys(config)) {
		if (!KNOWN_FIELDS.has(key)) {
			console.warn(`Unknown config field: "${key}"`);
		}
	}
}

function loadJSONConfig(configPath: string): Record<string, unknown> {
	const raw = readFileSync(configPath, "utf-8");
	const parsed = JSON.parse(raw) as Record<string, unknown>;
	warnUnknownFields(parsed);
	return parsed;
}

async function loadTypeScriptConfig(configPath: string): Promise<Record<string, unknown>> {
	const module = await import(configPath);
	const config = (module.default ?? module) as Record<string, unknown>;
	warnUnknownFields(config);
	return config;
}

export async function loadConfigFile(configPath: string): Promise<Record<string, unknown>> {
	try {
		if (configPath.endsWith(".ts")) {
			return await loadTypeScriptConfig(configPath);
		}
		return loadJSONConfig(configPath);
	} catch {
		return {};
	}
}
