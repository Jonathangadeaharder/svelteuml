import fc from "fast-check";
import { parse } from "svelte/compiler";
import { describe, expect } from "vitest";

const htmlTags = [
	"div",
	"span",
	"p",
	"h1",
	"h2",
	"section",
	"header",
	"main",
	"footer",
	"ul",
	"li",
	"nav",
	"article",
	"aside",
];

const svelteBlockTemplates: string[] = [
	"{#if cond}<p>yes</p>{/if}",
	"{#if cond}<p>yes</p>{:else}<p>no</p>{/if}",
	"{#each items as item}<p>{item}</p>{/each}",
	"{#if a}<div>{#if b}<span>nested</span>{/if}</div>{/if}",
];

const attrNames = ["id", "class", "title", "name", "role", "alt", "dir"] as const;

function arbAttrValue(): fc.Arbitrary<string> {
	return fc
		.string({ minLength: 1, maxLength: 6 })
		.map((s) => s.replace(/["'<>&{}]/g, "").trim())
		.filter((s) => s.length > 0);
}

function arbAttributes(): fc.Arbitrary<string> {
	return fc
		.shuffledSubarray([...attrNames], { minLength: 0, maxLength: 3 })
		.chain((names) => {
			const pairArbs = names.map((name) => arbAttrValue().map((value) => ` ${name}="${value}"`));
			return fc.tuple(...pairArbs);
		})
		.map((attrs) => attrs.join(""));
}

function arbTextContent(): fc.Arbitrary<string> {
	return fc
		.string({ minLength: 1, maxLength: 15 })
		.map((s) => s.replace(/[{}<>]/g, " ").trim())
		.filter((s) => s.length > 0);
}

function arbSimpleElement(): fc.Arbitrary<string> {
	return fc
		.tuple(fc.constantFrom(...htmlTags), arbAttributes())
		.map(([tag, attrs]) => `<${tag}${attrs}></${tag}>`);
}

function arbElementWithText(): fc.Arbitrary<string> {
	return fc
		.tuple(fc.constantFrom(...htmlTags), arbAttributes(), arbTextContent())
		.map(([tag, attrs, text]) => `<${tag}${attrs}>${text}</${tag}>`);
}

function arbHtmlContent(): fc.Arbitrary<string> {
	return fc.oneof(arbSimpleElement(), arbElementWithText());
}

function arbScriptBody(): fc.Arbitrary<string> {
	return fc.constantFrom(
		"",
		"let x = 0;",
		"let count = 0;",
		"let name = 'test';",
		"let items = [1, 2, 3];",
		"function greet() { return 'hello'; }",
		"import { onMount } from 'svelte'; let x = 0;",
		"let { prop1, prop2 } = $props();",
	);
}

function arbScriptContent(): fc.Arbitrary<string> {
	return arbScriptBody().chain((body) =>
		fc.constantFrom(`<script>${body}</script>`, `<script lang="ts">${body}</script>`),
	);
}

function arbModuleScript(): fc.Arbitrary<string> {
	return fc.constant(
		`<script context="module">let count = 0; export function reset() { count = 0; }</script>`,
	);
}

function arbStyleBlock(): fc.Arbitrary<string> {
	return fc.constantFrom(
		`<style>p { color: red; }</style>`,
		`<style>.main { margin: 0; }</style>`,
		`<style>div { padding: 1rem; }</style>`,
	);
}

function arbSvelteBlock(): fc.Arbitrary<string> {
	return fc.constantFrom(...svelteBlockTemplates);
}

function arbSvelteSource(): fc.Arbitrary<string> {
	const arbEmpty = fc.constant("");

	const arbHtmlOnly = fc
		.array(arbHtmlContent(), { minLength: 1, maxLength: 3 })
		.map((els) => els.join("\n"));

	const arbScriptOnly = arbScriptContent();

	const arbScriptWithHtml = fc
		.tuple(arbScriptContent(), fc.array(arbHtmlContent(), { minLength: 1, maxLength: 2 }))
		.map(([script, html]) => `${script}\n\n${html.join("\n")}`);

	const arbScriptWithModuleAndStyle = fc
		.tuple(
			arbScriptContent(),
			fc.option(arbModuleScript(), { nil: undefined }),
			fc.array(arbHtmlContent(), { minLength: 0, maxLength: 2 }),
			fc.option(arbStyleBlock(), { nil: undefined }),
		)
		.map(([script, moduleScript, html, style]) => {
			const parts: string[] = [];
			if (moduleScript) parts.push(moduleScript);
			parts.push(script);
			if (html.length > 0) parts.push(html.join("\n"));
			if (style) parts.push(style);
			return parts.join("\n\n");
		});

	const arbWithSvelteBlocks = fc
		.tuple(arbScriptContent(), fc.array(arbSvelteBlock(), { minLength: 1, maxLength: 2 }))
		.map(([script, blocks]) => `${script}\n\n${blocks.join("\n")}`);

	return fc.oneof(
		{ maxDepth: 1 },
		arbEmpty,
		arbHtmlOnly,
		arbScriptOnly,
		arbScriptWithHtml,
		arbScriptWithModuleAndStyle,
		arbWithSvelteBlocks,
	);
}

describe("parsing property-based tests", () => {
	it("parse→reparse identity: JSON round-trip preserves AST", () => {
		fc.assert(
			fc.property(arbSvelteSource(), (source) => {
				const ast1 = parse(source);
				const json = JSON.stringify(ast1);
				const ast2 = JSON.parse(json);
				expect(ast2).toEqual(ast1);
			}),
			{ numRuns: 1000 },
		);
	});

	it("valid Svelte always parses without throwing", () => {
		fc.assert(
			fc.property(arbSvelteSource(), (source) => {
				expect(() => parse(source)).not.toThrow();
			}),
			{ numRuns: 1000 },
		);
	});

	it("AST node count ≥ 1 for non-empty source", () => {
		fc.assert(
			fc.property(arbSvelteSource(), (source) => {
				const ast = parse(source);
				const nodeCount =
					ast.html.children.length +
					(ast.instance != null ? 1 : 0) +
					(ast.module != null ? 1 : 0) +
					(ast.css != null ? 1 : 0);
				if (source.length === 0) {
					expect(nodeCount).toBe(0);
				} else {
					expect(nodeCount).toBeGreaterThanOrEqual(1);
				}
			}),
			{ numRuns: 1000 },
		);
	});
});
