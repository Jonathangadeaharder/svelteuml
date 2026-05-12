import { describe, expect, it } from "vitest";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import { trackPropFlows } from "../../src/dependency/prop-flow-tracker.js";
import type { PropSymbol, SymbolTable } from "../../src/types/ast.js";

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

function makeProp(overrides: Partial<PropSymbol>): PropSymbol {
	return {
		kind: "prop",
		name: "label",
		filePath: "/src/lib/Button.svelte",
		componentName: "Button",
		type: "string",
		isRequired: true,
		...overrides,
	};
}

describe("trackPropFlows", () => {
	it("returns empty for no tsx contents", () => {
		const result = trackPropFlows(new Map(), [], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("returns empty when no component usage in tsx", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { svelteHTML.createElement("h1", {}); }
  { svelteHTML.createElement("p", {}); }
}
				`,
			],
		]);
		const result = trackPropFlows(tsxContents, [], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("detects prop flow from parent to child component", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
import Button from "$lib/components/Button.svelte";
function $$render() {
  { const $$_nottuB0C = __sveltets_2_ensureComponent(Button); new $$_nottuB0C({ target: __sveltets_2_any(), props: {    "label":"Click me","onClick":increment,}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			props: [
				makeProp({
					name: "label",
					filePath: "/src/lib/Button.svelte",
					componentName: "Button",
					type: "string",
					isRequired: true,
				}),
				makeProp({
					name: "onClick",
					filePath: "/src/lib/Button.svelte",
					componentName: "Button",
					type: "() => void",
					isRequired: true,
				}),
			],
		});

		const result = trackPropFlows(tsxContents, imports, symbols);

		expect(result).toHaveLength(2);
		expect(result[0]?.sourceFile).toBe("/src/routes/+page.svelte");
		expect(result[0]?.targetFile).toBe("/src/lib/Button.svelte");
		expect(result[0]?.propName).toBe("label");
		expect(result[0]?.propType).toBe("string");
		expect(result[0]?.isRequired).toBe(true);

		expect(result[1]?.propName).toBe("onClick");
		expect(result[1]?.propType).toBe("() => void");
	});

	it("marks optional props correctly", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_card0 = __sveltets_2_ensureComponent(Card); new $$_card0({ target: __sveltets_2_any(), props: {    "title":"Hello","subtitle":"World",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Card.svelte",
				importedNames: ["Card"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			props: [
				makeProp({
					name: "title",
					filePath: "/src/lib/Card.svelte",
					componentName: "Card",
					type: "string",
					isRequired: true,
				}),
				makeProp({
					name: "subtitle",
					filePath: "/src/lib/Card.svelte",
					componentName: "Card",
					type: "string | undefined",
					isRequired: false,
				}),
			],
		});

		const result = trackPropFlows(tsxContents, imports, symbols);

		const title = result.find((f) => f.propName === "title");
		const subtitle = result.find((f) => f.propName === "subtitle");

		expect(title?.isRequired).toBe(true);
		expect(subtitle?.isRequired).toBe(false);
	});

	it("uses unknown type when prop not in symbol table", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "unknownProp":42,}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(1);
		expect(result[0]?.propType).toBe("unknown");
		expect(result[0]?.isRequired).toBe(false);
	});

	it("skips component usage when import not found", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_unknown = __sveltets_2_ensureComponent(UnknownComponent); new $$_unknown({ target: __sveltets_2_any(), props: {    "foo":"bar",}});}
}
				`,
			],
		]);

		const result = trackPropFlows(tsxContents, [], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("deduplicates same prop passed multiple times", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "label":"A",}});}
  { const $$_btn1 = __sveltets_2_ensureComponent(Button); new $$_btn1({ target: __sveltets_2_any(), props: {    "label":"B",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(1);
	});

	it("handles multiple components in same file", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "label":"A",}});}
  { const $$_card0 = __sveltets_2_ensureComponent(Card); new $$_card0({ target: __sveltets_2_any(), props: {    "title":"Hi",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Card.svelte",
				importedNames: ["Card"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(2);
		expect(result[0]?.targetFile).toBe("/src/lib/Button.svelte");
		expect(result[1]?.targetFile).toBe("/src/lib/Card.svelte");
	});

	it("handles non-svelte parent files gracefully", () => {
		const tsxContents = new Map([
			[
				"/src/lib/helper.ts",
				`
export function format() { return ""; }
				`,
			],
		]);

		const result = trackPropFlows(tsxContents, [], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("handles tsx with no ensureComponent calls", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { svelteHTML.createElement("div", {}); }
  { svelteHTML.createElement("span", {}); }
}
				`,
			],
		]);

		const result = trackPropFlows(tsxContents, [], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("skips props without matching declared prop in child", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "label":"Click","extra":"ignored",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			props: [
				makeProp({
					name: "label",
					filePath: "/src/lib/Button.svelte",
				}),
			],
		});

		const result = trackPropFlows(tsxContents, imports, symbols);
		expect(result).toHaveLength(2); // both props are tracked, extra just shows as unknown
	});

	it("processes multiple source files independently", () => {
		const tsxContents = new Map([
			[
				"/src/routes/page1.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "label":"One",}});}
}
				`,
			],
			[
				"/src/routes/page2.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), props: {    "label":"Two",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/page1.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
			{
				sourceFile: "/src/routes/page2.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(2);
		expect(result.filter((f) => f.sourceFile === "/src/routes/page1.svelte")).toHaveLength(1);
		expect(result.filter((f) => f.sourceFile === "/src/routes/page2.svelte")).toHaveLength(1);
	});

	it("skips new call with unbalanced outer braces", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				"function $$render() {\n  const $$_btn0 = __sveltets_2_ensureComponent(Button);\n  new $$_btn0({ { { never-closed\n}\n",
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("skips new call with no props key", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_btn0 = __sveltets_2_ensureComponent(Button); new $$_btn0({ target: __sveltets_2_any(), other: {    "label":"A",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("skips new call with unbalanced props braces", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				"function $$render() {\n  const $$_btn0 = __sveltets_2_ensureComponent(Button);\n  new $$_btn0({ target: __sveltets_2_any(), props: { { unbalanced  , other: 1 })\n}\n",
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("skips duplicate import names gracefully", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Button.svelte",
				importedNames: ["Button", "Button"],
				isTypeOnly: false,
			},
		];
		const result = trackPropFlows(new Map(), imports, makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("handles nested object props like style={{ color: 'red' }}", () => {
		const tsxContents = new Map([
			[
				"/src/routes/+page.svelte",
				`
function $$render() {
  { const $$_box0 = __sveltets_2_ensureComponent(Box); new $$_box0({ target: __sveltets_2_any(), props: {    "style":{ color: 'red' },"label":"Box",}});}
}
				`,
			],
		]);
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/Box.svelte",
				importedNames: ["Box"],
				isTypeOnly: false,
			},
		];

		const result = trackPropFlows(tsxContents, imports, makeSymbolTable());
		expect(result).toHaveLength(2);
		expect(result.find((f) => f.propName === "style")).toBeDefined();
		expect(result.find((f) => f.propName === "label")).toBeDefined();
	});
});
