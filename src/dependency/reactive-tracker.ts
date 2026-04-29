import type { Project } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { StoreSymbol } from "../types/ast.js";

export interface StateDependency {
	sourceFile: string;
	targetFile: string;
	symbolName: string;
	dependencyKind: "state" | "derived";
}

export function trackReactiveDependencies(
	project: Project,
	reactiveSymbols: StoreSymbol[],
): StateDependency[] {
	const deps: StateDependency[] = [];

	for (const symbol of reactiveSymbols) {
		if (!symbol.runeKind) continue;

		const sf = project.getSourceFile(symbol.filePath);
		if (!sf) continue;

		try {
			const varDecl = sf.getVariableDeclaration(symbol.name);
			if (!varDecl) continue;

			const refs = varDecl.findReferencesAsNodes();
			for (const ref of refs) {
				const refFile = ref.getSourceFile().getFilePath();
				if (refFile === symbol.filePath) continue;

				if (isTypeOnlyReference(ref)) continue;

				deps.push({
					sourceFile: refFile,
					targetFile: symbol.filePath,
					symbolName: symbol.name,
					dependencyKind: symbol.runeKind,
				});
			}
		} catch {
			// findReferencesAsNodes can throw on complex projects
		}
	}

	return deduplicateDeps(deps);
}

function isTypeOnlyReference(ref: import("ts-morph").Node): boolean {
	const parent = ref.getParent();
	if (!parent) return false;

	if (parent.getKind() === SyntaxKind.ImportSpecifier) {
		const specifier = parent.asKind(SyntaxKind.ImportSpecifier);
		return specifier?.isTypeOnly() ?? false;
	}

	if (parent.getKind() === SyntaxKind.ImportClause) {
		const clause = parent.asKind(SyntaxKind.ImportClause);
		return clause?.isTypeOnly() ?? false;
	}

	return false;
}

function deduplicateDeps(deps: StateDependency[]): StateDependency[] {
	const seen = new Set<string>();
	return deps.filter((d) => {
		const key = `${d.sourceFile}|${d.targetFile}|${d.symbolName}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
