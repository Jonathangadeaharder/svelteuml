import { basename } from "node:path";
import type { SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { ScriptContextMap } from "../parsing/script-context.js";
import { getContextForLine } from "../parsing/script-context.js";
import type { PropSymbol } from "../types/ast.js";
import { shouldSkipFile } from "./skip-rules.js";

/**
 * E2.1 — Component symbol extraction: name, props, events, slots.
 *
 * Works on the TSX output produced by svelte2tsx so we get a proper AST even
 * for `.svelte` files.  Handles both:
 *   - Svelte 4 pattern: `export let propName: Type = default;`
 *   - Svelte 5 `$props()` rune pattern: `let { a, b = 'x' }: { a: string; b?: string } = $props();`
 */

/**
 * Derive the component name from its file path.
 * `/src/lib/components/HitCard.svelte` → `HitCard`
 * `/src/routes/+page.svelte` → `+page`
 */
export function componentNameFromPath(filePath: string): string {
	const name = basename(filePath, ".svelte");
	return name;
}

/**
 * Extract props from a svelte2tsx-converted SourceFile.
 *
 * Supports:
 *  1. Svelte 4 — `export let propName[: Type][= default];`
 *  2. Svelte 5 — `let { a, b = 'x', ...rest }: PropsType = $props();`
 */
export function extractComponentProps(
	sourceFile: SourceFile,
	componentName: string,
	originalFilePath: string,
	scriptContext?: ScriptContextMap,
): PropSymbol[] {
	if (shouldSkipFile(originalFilePath)) {
		return [];
	}

	const props: PropSymbol[] = [];
	const propDecls = new Map<string, import("ts-morph").VariableDeclaration>();

	// --- Strategy 1: Svelte 4 `export let` declarations ---
	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const stmt = varDecl.getVariableStatement();
		if (!stmt) continue;
		const hasExport = stmt.getModifiers()?.some((m) => m.getKind() === SyntaxKind.ExportKeyword);
		if (!hasExport) continue;

		const name = varDecl.getName();
		// Skip re-exports of functions/classes — only simple bindings
		const initializer = varDecl.getInitializer();
		if (
			initializer &&
			(initializer.getKind() === SyntaxKind.ArrowFunction ||
				initializer.getKind() === SyntaxKind.FunctionExpression)
		) {
			continue;
		}

		const typeNode = varDecl.getTypeNode();
		const rawType = typeNode?.getText() ?? inferTypeFromInitializer(initializer?.getText());
		const isRequired =
			!typeNode?.getText().includes("undefined") &&
			initializer === undefined &&
			!rawType.endsWith(" | undefined");

		props.push({
			kind: "prop",
			name,
			filePath: originalFilePath,
			componentName,
			type: rawType,
			isRequired,
			defaultValue: initializer?.getText(),
		});
		propDecls.set(name, varDecl);
	}

	// --- Strategy 2: Svelte 5 $props() rune ---
	//   `let { a, b = 'x', ...rest }: PropsType = $props();`
	for (const varDecl of sourceFile.getVariableDeclarations()) {
		const initializer = varDecl.getInitializer();
		if (!initializer) continue;

		// Look for `$props()` call
		if (
			initializer.getKind() !== SyntaxKind.CallExpression ||
			!initializer.getText().startsWith("$props")
		) {
			continue;
		}

		// The binding pattern is the variable name node
		const nameNode = varDecl.getNameNode();
		if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) {
			continue;
		}

		const typeNode = varDecl.getTypeNode();
		const typeText = typeNode?.getText() ?? "unknown";

		// Parse individual binding elements from the destructure
		for (const element of nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern).getElements()) {
			// Use source property name for aliased destructuring (e.g., { foo: bar })
			const propName = element.getPropertyNameNode()?.getText() ?? element.getName();
			// Skip rest elements
			if (element.getDotDotDotToken()) continue;

			const defaultNode = element.getInitializer();
			const isRequired = !defaultNode;

			// Try to find the type of this specific prop from the type annotation
			const propType = extractPropTypeFromObjectType(typeText, propName);

			props.push({
				kind: "prop",
				name: propName,
				filePath: originalFilePath,
				componentName,
				type: propType,
				isRequired,
				defaultValue: defaultNode?.getText(),
			});
			propDecls.set(propName, varDecl);
		}

		// Only process the first $props() declaration
		break;
	}

	// Deduplicate: if a prop was found by both strategies, keep the Svelte 5 one
	const seen = new Set<string>();
	const deduped: PropSymbol[] = [];
	// Iterate in reverse so Svelte 5 entries (appended last) win
	for (let i = props.length - 1; i >= 0; i--) {
		const p = props[i];
		if (p && !seen.has(p.name)) {
			seen.add(p.name);
			deduped.unshift(p);
		}
	}

	if (scriptContext) {
		for (const prop of deduped) {
			const decl = propDecls.get(prop.name);
			if (decl) {
				const line = decl.getStartLineNumber();
				const ctx = getContextForLine(scriptContext, line);
				prop.accessibility = ctx === "module" ? "public" : "internal";
			} else {
				prop.accessibility = "internal";
			}
		}
	}

	return deduped;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferTypeFromInitializer(initText: string | undefined): string {
	if (initText === undefined) return "unknown";
	if (initText === "true" || initText === "false") return "boolean";
	if (!Number.isNaN(Number(initText))) return "number";
	if (initText.startsWith('"') || initText.startsWith("'") || initText.startsWith("`"))
		return "string";
	return "unknown";
}

/**
 * Given a type annotation like `{ title: string; count?: number }` and a
 * property name, attempt to extract the type string for that property.
 * Falls back to "unknown" if parsing is not possible.
 */
function extractPropTypeFromObjectType(typeText: string, propName: string): string {
	// Simple regex-based extraction — good enough for common patterns
	// Matches:  propName?: SomeType;  or  propName: SomeType;
	const re = new RegExp(`\\b${escapeRegex(propName)}\\??\\s*:\\s*([^;},]+)`);
	const match = re.exec(typeText);
	if (match?.[1]) {
		return match[1].trim();
	}
	return "unknown";
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
