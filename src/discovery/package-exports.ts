import { readFileSync } from "node:fs";
import * as path from "node:path";

export interface PackageExport {
	exportName: string;
	resolvedPath: string;
	conditions: string[];
}

export interface PackageExportMap {
	projectRoot: string;
	exports: PackageExport[];
}

const CONDITION_PRIORITY = ["svelte", "default", "import", "require"];

export function resolvePackageExports(projectRoot: string): PackageExportMap | null {
	const pkgPath = path.join(projectRoot, "package.json");
	let pkg: Record<string, unknown>;
	try {
		const raw = readFileSync(pkgPath, "utf-8");
		pkg = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}

	const exportsField = pkg.exports;
	if (!exportsField) return null;

	const exports: PackageExport[] = [];

	if (typeof exportsField === "string") {
		exports.push({
			exportName: ".",
			resolvedPath: resolvePath(projectRoot, exportsField),
			conditions: ["default"],
		});
	} else if (typeof exportsField === "object") {
		for (const [exportName, value] of Object.entries(exportsField as Record<string, unknown>)) {
			const resolved = resolveExportValue(projectRoot, value);
			if (resolved) {
				exports.push({ exportName, ...resolved });
			}
		}
	}

	return { projectRoot, exports };
}

function resolveExportValue(
	projectRoot: string,
	value: unknown,
): { resolvedPath: string; conditions: string[] } | null {
	if (typeof value === "string") {
		return {
			resolvedPath: resolvePath(projectRoot, value),
			conditions: ["default"],
		};
	}

	if (typeof value === "object" && value !== null) {
		const conditions = value as Record<string, unknown>;
		for (const condition of CONDITION_PRIORITY) {
			if (typeof conditions[condition] === "string") {
				return {
					resolvedPath: resolvePath(projectRoot, conditions[condition] as string),
					conditions: [condition],
				};
			}
		}
	}

	return null;
}

function resolvePath(projectRoot: string, relativePath: string): string {
	if (path.isAbsolute(relativePath)) return relativePath;
	return path.resolve(projectRoot, relativePath);
}
