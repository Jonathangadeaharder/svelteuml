import type { PropSymbol, SymbolTable } from "../types/ast.js";
import type { ResolvedImport } from "./import-scanner.js";

export interface PropFlowInfo {
	sourceFile: string;
	targetFile: string;
	propName: string;
	propType: string;
	isRequired: boolean;
}

export function trackPropFlows(
	tsxContents: Map<string, string>,
	imports: ResolvedImport[],
	symbols: SymbolTable,
): PropFlowInfo[] {
	const flows: PropFlowInfo[] = [];

	const importMap = buildImportSourceMap(imports);

	for (const [sourceFile, tsxCode] of tsxContents) {
		const sourceImports = importMap.get(sourceFile);
		if (!sourceImports || sourceImports.size === 0) continue;

		const varToComp = extractComponentVarMap(tsxCode);
		if (varToComp.size === 0) continue;

		const newCalls = extractNewExpressions(tsxCode);
		for (const { varName, propsBlock } of newCalls) {
			const componentName = varToComp.get(varName);
			if (!componentName) continue;

			const targetFile = sourceImports.get(componentName);
			if (!targetFile) continue;

			const propNames = extractPropKeys(propsBlock);
			for (const propName of propNames) {
				const declared = findDeclaredProp(symbols.props, targetFile, propName);
				flows.push({
					sourceFile,
					targetFile,
					propName,
					propType: declared?.type ?? "unknown",
					isRequired: declared?.isRequired ?? false,
				});
			}
		}
	}

	return deduplicateFlows(flows);
}

function buildImportSourceMap(imports: ResolvedImport[]): Map<string, Map<string, string>> {
	const map = new Map<string, Map<string, string>>();
	for (const imp of imports) {
		let compMap = map.get(imp.sourceFile);
		if (!compMap) {
			compMap = new Map();
			map.set(imp.sourceFile, compMap);
		}
		for (const name of imp.importedNames) {
			if (!compMap.has(name)) {
				compMap.set(name, imp.targetFile);
			}
		}
	}
	return map;
}

function extractComponentVarMap(tsxCode: string): Map<string, string> {
	const map = new Map<string, string>();
	const re = /const\s+(\$\$_\w+)\s*=\s*__sveltets_2_ensureComponent\((\w+)\)/g;
	for (;;) {
		const match = re.exec(tsxCode);
		if (match === null) break;
		const varName = match[1];
		const compName = match[2];
		if (varName && compName) {
			map.set(varName, compName);
		}
	}
	return map;
}

interface NewCall {
	varName: string;
	propsBlock: string;
}

function extractNewExpressions(tsxCode: string): NewCall[] {
	const results: NewCall[] = [];
	const re = /new\s+(\$\$_\w+)\s*\(\s*\{/g;
	for (;;) {
		const match = re.exec(tsxCode);
		if (match === null) break;
		const varName = match[1] as string;
		const objStart = match.index + match[0].length - 1;
		const objContent = extractBalancedBraces(tsxCode, objStart);
		if (objContent === null) continue;

		const propsMatch = objContent.match(/props\s*:\s*\{/);
		if (!propsMatch) continue;
		if (propsMatch.index === undefined) continue;

		const propsStart = propsMatch.index + propsMatch[0].length - 1;
		const propsContent = extractBalancedBraces(objContent, propsStart);
		if (propsContent === null) continue;

		results.push({ varName, propsBlock: propsContent });
	}
	return results;
}

function extractBalancedBraces(text: string, openIdx: number): string | null {
	if (text[openIdx] !== "{") return null;
	let depth = 1;
	let idx = openIdx + 1;
	while (depth > 0 && idx < text.length) {
		if (text[idx] === "{") depth++;
		else if (text[idx] === "}") depth--;
		idx++;
	}
	if (depth !== 0) return null;
	return text.slice(openIdx + 1, idx - 1);
}

function extractPropKeys(propsBlock: string): string[] {
	const keys: string[] = [];
	const re = /["'](\w+)["']\s*:/g;
	for (;;) {
		const match = re.exec(propsBlock);
		if (match === null) break;
		const key = match[1];
		if (key) keys.push(key);
	}
	return keys;
}

function findDeclaredProp(
	props: PropSymbol[],
	targetFile: string,
	propName: string,
): PropSymbol | undefined {
	return props.find((p) => p.filePath === targetFile && p.name === propName);
}

function deduplicateFlows(flows: PropFlowInfo[]): PropFlowInfo[] {
	const seen = new Set<string>();
	return flows.filter((f) => {
		const key = `${f.sourceFile}|${f.targetFile}|${f.propName}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
