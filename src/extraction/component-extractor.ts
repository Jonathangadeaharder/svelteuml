import { basename } from "node:path";
import type { SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { ScriptContextMap } from "../parsing/script-context.js";
import { getContextForLine } from "../parsing/script-context.js";
import type { EventSymbol, PropSymbol } from "../types/ast.js";
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
	//   svelte2tsx may wrap it inside `$$render()` so search all function bodies.
	for (const varDecl of getAllVariableDeclarations(sourceFile)) {
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

/**
 * Extract events from a svelte2tsx-converted SourceFile.
 *
 * Supports:
 *  1. Svelte 4 — `createEventDispatcher<{ eventName: Type }>()`
 *  2. Svelte 5 — callback props (on-prefixed function props in $props())
 */
export function extractComponentEvents(
	sourceFile: SourceFile,
	componentName: string,
	originalFilePath: string,
): EventSymbol[] {
	if (shouldSkipFile(originalFilePath)) {
		return [];
	}

	const events: EventSymbol[] = [];
	const seen = new Set<string>();

	// --- Strategy 1: createEventDispatcher ---
	const dispatcherCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
	for (const call of dispatcherCalls) {
		if (call.getExpressionIfKind(SyntaxKind.Identifier)?.getText() !== "createEventDispatcher") {
			continue;
		}
		const typeArgs = call.getTypeArguments();
		if (typeArgs.length === 0) continue;
		const typeArgText = typeArgs[0]?.getText() ?? "";
		if (!typeArgText) continue;

		// Type arg is like `{ submit: FormData; cancel: void }`
		const typeMembers = typeArgText.matchAll(/\b(\w+)\s*:\s*([^;},]+)/g);
		for (const match of typeMembers) {
			const eventName = match[1];
			const eventType = match[2]?.trim() ?? "unknown";
			if (eventName && !seen.has(eventName)) {
				seen.add(eventName);
				events.push({
					kind: "event",
					name: eventName,
					filePath: originalFilePath,
					componentName,
					eventName,
					type: eventType,
				});
			}
		}
	}

	// --- Strategy 2: callback props from $props() (on-prefixed function props) ---
	const propsDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
	for (const varDecl of propsDecls) {
		const initializer = varDecl.getInitializer();
		if (
			!initializer ||
			initializer.getKind() !== SyntaxKind.CallExpression ||
			!initializer.getText().startsWith("$props")
		) {
			continue;
		}

		const nameNode = varDecl.getNameNode();
		if (nameNode.getKind() !== SyntaxKind.ObjectBindingPattern) continue;

		const typeNode = varDecl.getTypeNode();
		const typeText = typeNode?.getText() ?? "";

		for (const element of nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern).getElements()) {
			const propName = element.getPropertyNameNode()?.getText() ?? element.getName();
			if (element.getDotDotDotToken()) continue;

			// Only consider props starting with "on" as event callbacks
			if (!propName.startsWith("on")) continue;

			if (seen.has(propName)) continue;
			seen.add(propName);

			// Extract callback signature from type annotation
			const propType = extractPropTypeFromObjectType(typeText, propName);

			events.push({
				kind: "event",
				name: propName,
				filePath: originalFilePath,
				componentName,
				eventName: propName,
				type: propType,
			});
		}
	}

	return events;
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

/**
 * Collect variable declarations from both top-level scope and all function bodies.
 * svelte2tsx wraps Svelte 5 component code inside `$$render()` function, so we
 * must search inside function bodies to find `$props()` runes.
 */
function getAllVariableDeclarations(
	sourceFile: import("ts-morph").SourceFile,
): import("ts-morph").VariableDeclaration[] {
	return sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
}
