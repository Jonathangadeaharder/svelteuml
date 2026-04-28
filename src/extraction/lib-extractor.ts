import type { SourceFile } from "ts-morph";
import type { ClassSymbol, FunctionSymbol, MemberSymbol, ParameterSymbol, Visibility } from "../types/ast.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2.5 — Lib helper symbols: functions, classes outside src/routes.
 *
 * Extracts top-level exported functions and classes from plain TS/JS files
 * (primarily `src/lib/**` but any non-route file qualifies).
 *
 * Route files are excluded — they are handled by the route/server extractors.
 */

const ROUTE_BASENAME_PATTERN = /^\+/;

function isRouteLike(filePath: string): boolean {
	const parts = filePath.split("/");
	const name = parts[parts.length - 1] ?? "";
	return ROUTE_BASENAME_PATTERN.test(name);
}

/** Map ts-morph Scope enum → our Visibility type. */
function mapVisibility(scope: string | undefined): Visibility {
	if (scope === "private") return "private";
	if (scope === "protected") return "protected";
	return "public";
}

/**
 * Extract exported functions from a non-route TS/JS source file.
 */
export function extractLibFunctions(
	sourceFile: SourceFile,
	filePath: string,
): FunctionSymbol[] {
	if (shouldSkipFile(filePath) || isRouteLike(filePath)) return [];

	const results: FunctionSymbol[] = [];

	// Named function declarations
	for (const fn of sourceFile.getFunctions()) {
		if (!fn.isExported()) continue;
		const name = fn.getName();
		if (!name) continue;

		const params: ParameterSymbol[] = fn.getParameters().map((p) => ({
			name: p.getName(),
			type: p.getType().getText(),
			isOptional: p.isOptional(),
			defaultValue: p.getInitializer()?.getText(),
		}));

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync: fn.isAsync(),
			parameters: params,
			returnType: fn.getReturnType().getText(),
			typeParams: fn.getTypeParameters().map((tp) => tp.getName()),
		});
	}

	// Exported arrow functions / function expressions
	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const stmt = varDecl.getVariableStatement();
		if (!stmt?.isExported()) continue;

		const name = varDecl.getName();
		const init = varDecl.getInitializer();
		if (!init) continue;

		const kindName = init.getKindName();
		if (kindName !== "ArrowFunction" && kindName !== "FunctionExpression") continue;

		const isAsync = init.getText().trimStart().startsWith("async");

		results.push({
			kind: "function",
			name,
			filePath,
			isExported: true,
			isAsync,
			parameters: [],
			returnType: "unknown",
			typeParams: [],
		});
	}

	return results;
}

/**
 * Extract exported classes from a non-route TS/JS source file.
 */
export function extractLibClasses(
	sourceFile: SourceFile,
	filePath: string,
): ClassSymbol[] {
	if (shouldSkipFile(filePath) || isRouteLike(filePath)) return [];

	const results: ClassSymbol[] = [];

	for (const cls of sourceFile.getClasses()) {
		if (!cls.isExported()) continue;
		const name = cls.getName();
		if (!name) continue;

		const members: MemberSymbol[] = [];

		for (const prop of cls.getProperties()) {
			members.push({
				kind: "property",
				name: prop.getName(),
				visibility: mapVisibility(prop.getScope()),
				type: prop.getType().getText(),
				isStatic: prop.isStatic(),
				isAbstract: prop.isAbstract(),
				isReadonly: prop.isReadonly(),
			});
		}

		for (const method of cls.getMethods()) {
			const params: ParameterSymbol[] = method.getParameters().map((p) => ({
				name: p.getName(),
				type: p.getType().getText(),
				isOptional: p.isOptional(),
				defaultValue: p.getInitializer()?.getText(),
			}));

			members.push({
				kind: "method",
				name: method.getName(),
				visibility: mapVisibility(method.getScope()),
				type: method.getReturnType().getText(),
				isStatic: method.isStatic(),
				isAbstract: method.isAbstract(),
				isReadonly: false,
				parameters: params,
				returnType: method.getReturnType().getText(),
			});
		}

		const extendsExpr = cls.getExtends();
		const implementsExprs = cls.getImplements();

		results.push({
			kind: cls.isAbstract() ? "abstract-class" : "class",
			name,
			filePath,
			extends: extendsExpr?.getExpression().getText(),
			implements: implementsExprs.map((i) => i.getExpression().getText()),
			members,
			isGeneric: cls.getTypeParameters().length > 0,
			typeParams: cls.getTypeParameters().map((tp) => tp.getName()),
		});
	}

	// Also extract interfaces
	for (const iface of sourceFile.getInterfaces()) {
		if (!iface.isExported()) continue;
		const name = iface.getName();

		const members: MemberSymbol[] = [];

		for (const prop of iface.getProperties()) {
			members.push({
				kind: "property",
				name: prop.getName(),
				visibility: "public",
				type: prop.getType().getText(),
				isStatic: false,
				isAbstract: false,
				isReadonly: prop.isReadonly(),
			});
		}

		for (const method of iface.getMethods()) {
			const params: ParameterSymbol[] = method.getParameters().map((p) => ({
				name: p.getName(),
				type: p.getType().getText(),
				isOptional: p.isOptional(),
			}));
			members.push({
				kind: "method",
				name: method.getName(),
				visibility: "public",
				type: method.getReturnType().getText(),
				isStatic: false,
				isAbstract: true, // interfaces are implicitly abstract
				isReadonly: false,
				parameters: params,
				returnType: method.getReturnType().getText(),
			});
		}

		const implementsExprs = iface.getExtends();

		results.push({
			kind: "interface",
			name,
			filePath,
			implements: implementsExprs.map((i) => i.getExpression().getText()),
			members,
			isGeneric: iface.getTypeParameters().length > 0,
			typeParams: iface.getTypeParameters().map((tp) => tp.getName()),
		});
	}

	return results;
}
