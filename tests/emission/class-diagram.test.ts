import { describe, expect, it } from "vitest";
import { renderClassDiagram } from "../../src/emission/class-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		...overrides,
	};
}

describe("renderClassDiagram", () => {
	it("renders empty diagram with start/end tags", () => {
		const result = renderClassDiagram(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			DEFAULT_DIAGRAM_OPTIONS,
		);
		expect(result).toContain("@startuml");
		expect(result).toContain("@enduml");
	});

	it("renders a class with members", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "AudioPlayer",
					filePath: "/src/lib/audio.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "volume",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
						{
							kind: "method",
							name: "play",
							visibility: "public",
							type: "void",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
							parameters: [{ name: "url", type: "string", isOptional: false }],
							returnType: "void",
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("AudioPlayer");
		expect(result).toContain("- volume: number");
		expect(result).toContain("+ play(url: string): void");
	});

	it("renders an interface with stereotype", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepository",
					filePath: "/src/lib/types.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("interface");
	});

	it("renders an abstract class", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "abstract-class",
					name: "BaseService",
					filePath: "/src/lib/base.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("abstract");
	});

	it("renders extends edge", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Base",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Child",
					filePath: "/b.ts",
					extends: "Base",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edges = createEdgeSet([
			{ source: "/b.ts", target: "/a.ts", type: "extends", label: "Base" },
		]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("Base <|-- Child");
	});

	it("renders implements edge", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "interface",
					name: "IRepo",
					filePath: "/a.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "Repo",
					filePath: "/b.ts",
					extends: undefined,
					implements: ["IRepo"],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const edges = createEdgeSet([
			{ source: "/b.ts", target: "/a.ts", type: "implements", label: "IRepo" },
		]);
		const result = renderClassDiagram(symbols, edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("IRepo ..|> Repo");
	});

	it("renders dependency edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "dependency" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("..>");
	});

	it("renders composition edge for stores", () => {
		const symbols = makeEmptySymbolTable({
			stores: [
				{
					kind: "store",
					name: "userStore",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "User",
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<store>>");
		expect(result).toContain("userStore");
	});

	it("renders component with props when showProps is true", () => {
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("<<component>>");
		expect(result).toContain("Button");
		expect(result).toContain("label: string");
	});

	it("hides members when showMembers is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "x",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMembers: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("x: number");
	});

	it("hides methods when showMethods is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "method",
							name: "doWork",
							visibility: "public",
							type: "void",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
							parameters: [],
							returnType: "void",
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showMethods: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("doWork");
	});

	it("includes title when provided", () => {
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, title: "My App" };
		const result = renderClassDiagram(makeEmptySymbolTable(), createEdgeSet([]), opts);
		expect(result).toContain("@startuml My App");
	});

	it("renders aggregation edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "aggregation" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("o--");
	});

	it("renders association edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "association" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("-->");
	});

	it("renders composition edge", () => {
		const edges = createEdgeSet([{ source: "/a.ts", target: "/b.ts", type: "composition" }]);
		const result = renderClassDiagram(makeEmptySymbolTable(), edges, DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("*--");
	});

	it("renders class with protected member", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "data",
							visibility: "protected",
							type: "string",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("# data: string");
	});

	it("hides visibility when showVisibility is false", () => {
		const symbols = makeEmptySymbolTable({
			classes: [
				{
					kind: "class",
					name: "Svc",
					filePath: "/a.ts",
					extends: undefined,
					implements: [],
					members: [
						{
							kind: "property",
							name: "x",
							visibility: "private",
							type: "number",
							isStatic: false,
							isAbstract: false,
							isReadonly: false,
						},
					],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showVisibility: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("- ");
	});

	it("renders component with optional prop", () => {
		const symbols = makeEmptySymbolTable({
			props: [
				{
					kind: "prop",
					name: "size",
					filePath: "/src/lib/Card.svelte",
					componentName: "Card",
					type: "number",
					isRequired: false,
					defaultValue: "16",
				},
			],
		});
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: true };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).toContain("size?: number");
	});

	it("renders function stereotype", () => {
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
		expect(result).toContain("<<function>>");
		expect(result).toContain("helper");
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
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("<<store>>");
	});

	it("hides props when showProps is false", () => {
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
		const opts = { ...DEFAULT_DIAGRAM_OPTIONS, showProps: false };
		const result = renderClassDiagram(symbols, createEdgeSet([]), opts);
		expect(result).not.toContain("<<component>>");
	});
});
