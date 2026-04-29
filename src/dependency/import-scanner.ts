import type { SourceFile } from "ts-morph";
import type { ParsingProject } from "../parsing/ts-morph-project.js";
import type { AliasMap } from "../types/config.js";

export interface ResolvedImport {
	sourceFile: string;
	targetFile: string;
	importedNames: string[];
	isTypeOnly: boolean;
}

export interface ScanOptions {
	excludeExternals?: boolean;
}

export function scanImports(parsingProject: ParsingProject, aliases: AliasMap, options?: ScanOptions): ResolvedImport[] {
	const allFiles = parsingProject.getAllSourceFiles();
	const results: ResolvedImport[] = [];
	const knownFiles = new Set(allFiles.keys());

	for (const [originalPath, sourceFile] of allFiles) {
		if (originalPath.endsWith(".svelte.tsx")) continue;

		const imports = extractImportsFromFile(sourceFile, originalPath, aliases, knownFiles, options);
		results.push(...imports);
	}

	return results;
}

function extractImportsFromFile(
	sourceFile: SourceFile,
	originalPath: string,
	aliases: AliasMap,
	knownFiles: Set<string>,
	options?: ScanOptions,
): ResolvedImport[] {
	const results: ResolvedImport[] = [];

	for (const importDecl of sourceFile.getImportDeclarations()) {
		const specifier = importDecl.getModuleSpecifierValue();
		if (!specifier) continue;

		const resolvedTarget = resolveSpecifier(specifier, originalPath, aliases, knownFiles);
		const isTypeOnly = importDecl.isTypeOnly();

		const namedImports: string[] = [];
		for (const ni of importDecl.getNamedImports()) {
			namedImports.push(ni.getName());
		}

		const namespaceImport = importDecl.getNamespaceImport();
		if (namespaceImport) {
			const target = resolveTarget(resolvedTarget, specifier, options);
			if (!target) continue;
			results.push({
				sourceFile: originalPath,
				targetFile: target,
				importedNames: [],
				isTypeOnly,
			});
			continue;
		}

		const defaultImport = importDecl.getDefaultImport();
		const importedNames = defaultImport ? [defaultImport.getText(), ...namedImports] : namedImports;

		const target = resolveTarget(resolvedTarget, specifier, options);
		if (!target) continue;
		results.push({
			sourceFile: originalPath,
			targetFile: target,
			importedNames,
			isTypeOnly,
		});
	}

	return results;
}

function resolveTarget(
	resolvedTarget: string | undefined,
	specifier: string,
	options?: ScanOptions,
): string | undefined {
	if (resolvedTarget) {
		if (options?.excludeExternals && resolvedTarget.includes("node_modules")) {
			return `<<External>>/${extractPackageName(specifier)}`;
		}
		return resolvedTarget;
	}
	if (options?.excludeExternals && !specifier.startsWith(".")) {
		return `<<External>>/${extractPackageName(specifier)}`;
	}
	return undefined;
}

function extractPackageName(specifier: string): string {
	if (specifier.startsWith("@")) {
		const parts = specifier.split("/");
		return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
	}
	return specifier.split("/")[0] ?? specifier;
}

function resolveSpecifier(
	specifier: string,
	fromFile: string,
	aliases: AliasMap,
	knownFiles: Set<string>,
): string | undefined {
	const sortedAliases = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
	for (const [alias, resolved] of sortedAliases) {
		if (specifier === alias || specifier.startsWith(`${alias}/`)) {
			const relativePart = specifier.slice(alias.length);
			const candidate = `${resolved}${relativePart}`;
			const resolvedPath = tryResolve(candidate, knownFiles);
			if (resolvedPath) return resolvedPath;
		}
	}

	if (specifier.startsWith(".")) {
		const dir = fromFile.substring(0, fromFile.lastIndexOf("/"));
		const raw = `${dir}/${specifier}`;
		const normalized = normalizePath(raw);
		const resolvedPath = tryResolve(normalized, knownFiles);
		if (resolvedPath) return resolvedPath;
	}

	return undefined;
}

function tryResolve(basePath: string, knownFiles: Set<string>): string | undefined {
	const extensions = [".ts", ".tsx", ".js", ".jsx", ".svelte", ".svelte.ts", ".svelte.js"];
	for (const ext of extensions) {
		const candidate = stripExtension(basePath) + ext;
		if (knownFiles.has(candidate)) return candidate;
	}
	if (knownFiles.has(basePath)) return basePath;
	const indexPath = `${stripExtension(basePath)}/index.ts`;
	if (knownFiles.has(indexPath)) return indexPath;
	return undefined;
}

function stripExtension(path: string): string {
	const dotIndex = path.lastIndexOf(".");
	if (dotIndex === -1) return path;
	return path.substring(0, dotIndex);
}

function normalizePath(path: string): string {
	const parts = path.split("/");
	const result: string[] = [];
	for (const part of parts) {
		if (part === ".") continue;
		if (part === "..") {
			result.pop();
		} else {
			result.push(part);
		}
	}
	return result.join("/");
}
