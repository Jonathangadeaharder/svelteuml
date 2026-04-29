import { describe, expect, it } from "vitest";
import { renderPackageDiagram } from "../../src/emission/package-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return { classes: [], functions: [], stores: [], props: [], exports: [], ...overrides };
}

describe("renderPackageDiagram", () => {
	it("renders empty diagram with start/end tags", () => {
		const result = renderPackageDiagram(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			DEFAULT_DIAGRAM_OPTIONS,
		);
		expect(result).toContain("@startuml");
		expect(result).toContain("@enduml");
	});

	it("groups classes into packages by directory", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "AudioPlayer",
					filePath: "/src/lib/audio.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "VideoPlayer",
					filePath: "/src/lib/media/video.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("AudioPlayer");
		expect(result).toContain("VideoPlayer");
	});

	it("renders dependency between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("..>");
	});

	it("includes title when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "Packages" };
		const result = renderPackageDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("@startuml Packages");
	});

	it("renders stores in packages when showStores is true", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "number",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<store>>");
		expect(result).toContain("count");
	});

	it("hides stores when showStores is false", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "number",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: false };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("<<store>>");
	});

	it("renders components in packages when showProps is true", () => {
		const symbols = makeEmptySymbolTable({
			props: [
				{
					kind: "prop",
					name: "label",
					filePath: "/src/lib/Button.svelte",
					componentName: "Button",
					type: "string",
					isRequired: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<component>>");
		expect(result).toContain("Button");
	});

	it("renders functions in packages", () => {
		const symbols = makeEmptySymbolTable({
			functions: [
				{
					kind: "function",
					name: "helper",
					filePath: "/src/lib/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<function>>");
		expect(result).toContain("helper");
	});

	it("skips edges within same package", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/a.ts", target: "/src/lib/b.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("..>");
	});

	it("renders extends arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/a.ts", target: "/src/core/b.ts", type: "extends" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<|--");
	});

	it("renders composition arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/store.ts", type: "composition" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("*--");
	});

	it("deduplicates edges between same package pair", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "dependency" },
			{ source: "/src/routes/c.ts", target: "/src/lib/d.ts", type: "dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		const matchCount = (result.match(/\.\.>/g) ?? []).length;
		expect(matchCount).toBe(1);
	});

	it("skips edges where source or target has no package", () => {
		const edges = createEdgeSet([{ source: "a.ts", target: "/src/lib/b.ts", type: "dependency" }]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).not.toContain("..>");
	});

	it("renders state_dependency arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/store.ts", type: "state_dependency" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("..>");
	});

	it("renders aggregation arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "aggregation" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("o--");
	});

	it("renders association arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/+page.ts", target: "/src/lib/utils.ts", type: "association" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("-->");
	});

	it("removes empty packages when hideEmptyPackages is true", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/core/b.ts", type: "dependency" },
		]);
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, hideEmptyPackages: true };
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, opts);
		expect(result).not.toContain("package");
		expect(result).toContain("..>");
	});

	it("renders exported class stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/src/lib/svc.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
					isExported: true,
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<Exported>>");
	});

	it("renders exported store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "myStore",
					filePath: "/src/lib/store.ts",
					storeType: "writable",
					valueType: "number",
					isExported: true,
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<Exported>>");
	});

	it("renders exported function stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			functions: [
				{
					kind: "function",
					name: "helper",
					filePath: "/src/lib/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<Exported>>");
	});

	it("renders state runeKind store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "count",
					filePath: "/src/lib/state.ts",
					storeType: "writable",
					valueType: "number",
					runeKind: "state",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<state>>");
	});

	it("renders derived runeKind store stereotype in packages", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "doubled",
					filePath: "/src/lib/derived.ts",
					storeType: "derived",
					valueType: "number",
					runeKind: "derived",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showStores: true };
		const result = renderPackageDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<derived>>");
	});

	it("renders interface in packages", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepo",
					filePath: "/src/lib/types.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("interface IRepo");
	});

	it("renders implements arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/lib/repo.ts", target: "/src/core/types.ts", type: "implements" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("..|>");
	});

	it("renders aggregation arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "aggregation" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("o--");
	});

	it("renders association arrow between packages", () => {
		const edges = createEdgeSet([
			{ source: "/src/routes/a.ts", target: "/src/lib/b.ts", type: "association" },
		]);
		const result = renderPackageDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("-->");
	});
});
