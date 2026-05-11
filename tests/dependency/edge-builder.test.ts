import { describe, expect, it } from "vitest";
import { buildEdges, detectCircularDependencies } from "../../src/dependency/edge-builder.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import type { EventSymbol, SymbolTable } from "../../src/types/ast.js";
import type { PropFlowInfo } from "../../src/dependency/prop-flow-tracker.js";
import type { SlotFillRecord } from "../../src/extraction/slot-extractor.js";

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

describe("buildEdges", () => {
	it("returns empty array for no imports and no symbols", () => {
		const result = buildEdges([], makeSymbolTable());
		expect(result).toHaveLength(0);
	});

	it("creates dependency edge for function import", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/api.ts",
				targetFile: "/src/lib/utils.ts",
				importedNames: ["formatDate"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			functions: [
				{
					kind: "function",
					name: "formatDate",
					filePath: "/src/lib/utils.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "string",
					typeParams: [],
				},
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
		expect(result[0]?.source).toBe("/src/lib/api.ts");
		expect(result[0]?.target).toBe("/src/lib/utils.ts");
		expect(result[0]?.label).toBe("formatDate");
	});

	it("creates extends edge from class hierarchy", () => {
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "class",
					name: "BaseService",
					filePath: "/src/lib/base.ts",
					extends: undefined,
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
				{
					kind: "class",
					name: "ApiService",
					filePath: "/src/lib/api.ts",
					extends: "BaseService",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		const extendsEdge = result.find((e) => e.type === "extends");
		expect(extendsEdge).toBeDefined();
		expect(extendsEdge?.source).toBe("/src/lib/api.ts");
		expect(extendsEdge?.target).toBe("/src/lib/base.ts");
		expect(extendsEdge?.label).toBe("BaseService");
	});

	it("creates implements edge from class interface", () => {
		const symbols = makeSymbolTable({
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
				{
					kind: "class",
					name: "Repo",
					filePath: "/src/lib/repo.ts",
					extends: undefined,
					implements: ["IRepo"],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		const implEdge = result.find((e) => e.type === "implements");
		expect(implEdge).toBeDefined();
		expect(implEdge?.source).toBe("/src/lib/repo.ts");
		expect(implEdge?.target).toBe("/src/lib/types.ts");
		expect(implEdge?.label).toBe("IRepo");
	});

	it("creates composition edge for store import", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/routes/+page.svelte",
				targetFile: "/src/lib/stores.ts",
				importedNames: ["user"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			stores: [
				{
					kind: "store",
					name: "user",
					filePath: "/src/lib/stores.ts",
					storeType: "writable",
					valueType: "User",
				},
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("composition");
		expect(result[0]?.label).toBe("user");
	});

	it("creates association edge for route importing component", () => {
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
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("association");
		expect(result[0]?.label).toBe("Button");
	});

	it("deduplicates edges between same source and target", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["x", "y"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable({
			functions: [
				{
					kind: "function",
					name: "x",
					filePath: "/src/lib/b.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
				{
					kind: "function",
					name: "y",
					filePath: "/src/lib/b.ts",
					isExported: true,
					isAsync: false,
					parameters: [],
					returnType: "void",
					typeParams: [],
				},
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
	});

	it("handles type-only imports as dependency edges", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/api.ts",
				targetFile: "/src/lib/types.ts",
				importedNames: ["User"],
				isTypeOnly: true,
			},
		];
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "interface",
					name: "User",
					filePath: "/src/lib/types.ts",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
	});

	it("defaults to dependency when imported symbol kind is unknown", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["default"],
				isTypeOnly: false,
			},
		];
		const result = buildEdges(imports, makeSymbolTable());
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
	});

	it("creates edge without label when importedNames is empty", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: [],
				isTypeOnly: false,
			},
		];
		const result = buildEdges(imports, makeSymbolTable());
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
		expect(result[0]?.label).toBeUndefined();
	});

	it("skips extends edge when parent class is not in symbol table", () => {
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "class",
					name: "Orphan",
					filePath: "/src/lib/orphan.ts",
					extends: "UnknownParent",
					implements: [],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		expect(result).toHaveLength(0);
	});

	it("skips implements edge when interface is not in symbol table", () => {
		const symbols = makeSymbolTable({
			classes: [
				{
					kind: "class",
					name: "MyClass",
					filePath: "/src/lib/my.ts",
					extends: undefined,
					implements: ["MissingInterface"],
					members: [],
					isGeneric: false,
					typeParams: [],
				},
			],
		});
		const result = buildEdges([], symbols);
		expect(result).toHaveLength(0);
	});

	it("filters single-character (minified) import names from edge labels", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["a", "b", "formatDate", "c"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable();
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.label).toBe("formatDate");
	});

	it("filters two-character minified import names (e.g. a7, aG) from edge labels", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["a7", "aG", "formatDate", "b3"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable();
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.label).toBe("formatDate");
	});

	it("preserves meaningful short names like db, ui, id in edge labels", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["db", "ui", "id"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable();
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.label).toBe("db, ui, id");
	});

	it("omits label entirely when all import names are single-character", () => {
		const imports: ResolvedImport[] = [
			{
				sourceFile: "/src/lib/a.ts",
				targetFile: "/src/lib/b.ts",
				importedNames: ["x", "y", "z"],
				isTypeOnly: false,
			},
		];
		const symbols = makeSymbolTable();
		const result = buildEdges(imports, symbols);
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("dependency");
		expect(result[0]?.label).toBeUndefined();
	});

	it("creates prop_flow edge with required prop", () => {
		const propFlows: PropFlowInfo[] = [
			{ sourceFile: "/src/lib/Parent.svelte", targetFile: "/src/lib/Child.svelte", propName: "label", propType: "string", isRequired: true },
		];
		const result = buildEdges([], makeSymbolTable(), [], propFlows);
		const flowEdges = result.filter((e) => e.type === "prop_flow");
		expect(flowEdges).toHaveLength(1);
		expect(flowEdges[0]?.label).toBe("label: string !");
	});

	it("creates prop_flow edge with optional prop", () => {
		const propFlows: PropFlowInfo[] = [
			{ sourceFile: "/src/lib/Parent.svelte", targetFile: "/src/lib/Child.svelte", propName: "size", propType: "number", isRequired: false },
		];
		const result = buildEdges([], makeSymbolTable(), [], propFlows);
		const flowEdges = result.filter((e) => e.type === "prop_flow");
		expect(flowEdges).toHaveLength(1);
		expect(flowEdges[0]?.label).toBe("size: number ?");
	});

	describe("event edges", () => {
		function makeEvent(overrides: Partial<EventSymbol> = {}): EventSymbol {
			return {
				kind: "event",
				name: "submit",
				filePath: "/src/lib/Button.svelte",
				componentName: "Button",
				eventName: "submit",
				type: "FormData",
				...overrides,
			};
		}

		it("creates event edge when parent imports child with events", () => {
			const imports: ResolvedImport[] = [
				{
					sourceFile: "/src/routes/+page.svelte",
					targetFile: "/src/lib/Button.svelte",
					importedNames: ["Button"],
					isTypeOnly: false,
				},
			];
			const symbols = makeSymbolTable({
				events: [makeEvent()],
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
			const result = buildEdges(imports, symbols);
			const eventEdges = result.filter((e) => e.type === "event");
			expect(eventEdges).toHaveLength(1);
			expect(eventEdges[0]?.source).toBe("/src/lib/Button.svelte");
			expect(eventEdges[0]?.target).toBe("/src/routes/+page.svelte");
			expect(eventEdges[0]?.label).toBe("submit");
		});

		it("creates multiple event edges for multiple events on same component", () => {
			const imports: ResolvedImport[] = [
				{
					sourceFile: "/src/routes/+page.svelte",
					targetFile: "/src/lib/Form.svelte",
					importedNames: ["Form"],
					isTypeOnly: false,
				},
			];
			const symbols = makeSymbolTable({
				events: [
					makeEvent({ eventName: "submit", type: "FormData", filePath: "/src/lib/Form.svelte" }),
					makeEvent({ eventName: "cancel", type: "void", name: "cancel", filePath: "/src/lib/Form.svelte" }),
				],
				props: [
					{
						kind: "prop",
						name: "label",
						filePath: "/src/lib/Form.svelte",
						componentName: "Form",
						type: "string",
						isRequired: true,
					},
				],
			});
			const result = buildEdges(imports, symbols);
			const eventEdges = result.filter((e) => e.type === "event");
			expect(eventEdges).toHaveLength(2);
			const labels = eventEdges.map((e) => e.label);
			expect(labels).toContain("submit");
			expect(labels).toContain("cancel");
		});

		it("does not create event edge when imported file has no events", () => {
			const imports: ResolvedImport[] = [
				{
					sourceFile: "/src/routes/+page.svelte",
					targetFile: "/src/lib/utils.ts",
					importedNames: ["formatDate"],
					isTypeOnly: false,
				},
			];
			const symbols = makeSymbolTable({
				functions: [
					{
						kind: "function",
						name: "formatDate",
						filePath: "/src/lib/utils.ts",
						isExported: true,
						isAsync: false,
						parameters: [],
						returnType: "string",
						typeParams: [],
					},
				],
			});
			const result = buildEdges(imports, symbols);
			const eventEdges = result.filter((e) => e.type === "event");
			expect(eventEdges).toHaveLength(0);
		});

		it("does not create event edge for non-component imports with events", () => {
			const imports: ResolvedImport[] = [
				{
					sourceFile: "/src/routes/+page.svelte",
					targetFile: "/src/lib/stores.ts",
					importedNames: ["userStore"],
					isTypeOnly: false,
				},
			];
			const symbols = makeSymbolTable({
				events: [
					makeEvent({ filePath: "/src/lib/stores.ts", eventName: "change" }),
				],
			});
			const result = buildEdges(imports, symbols);
			const eventEdges = result.filter((e) => e.type === "event");
			expect(eventEdges).toHaveLength(0);
		});
	});

	describe("slot edges", () => {
		it.each([
			{ slotFills: [{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Card.svelte", slotName: "default" }], expectLen: 1, type: "slot", src: "/src/routes/+page.svelte", tgt: "/src/lib/Card.svelte", label: "slot:default" },
			{ slotFills: [{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Layout.svelte", slotName: "header" }], expectLen: 1, label: "slot:header" },
		])("creates slot edge: $label", ({ slotFills, expectLen, type, src, tgt, label }) => {
			const result = buildEdges([], makeSymbolTable(), [], [], slotFills);
			expect(result).toHaveLength(expectLen);
			if (type) expect(result[0]?.type).toBe(type);
			if (src) expect(result[0]?.source).toBe(src);
			if (tgt) expect(result[0]?.target).toBe(tgt);
			expect(result[0]?.label).toBe(label);
		});

		it("creates multiple slot edges for multiple fills", () => {
			const slotFills: SlotFillRecord[] = [
				{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Card.svelte", slotName: "default" },
				{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Button.svelte", slotName: "default" },
			];
			const result = buildEdges([], makeSymbolTable(), [], [], slotFills);
			expect(result).toHaveLength(2);
			expect(result.every((e) => e.type === "slot")).toBe(true);
		});

		it("deduplicates identical slot edges", () => {
			const slotFills: SlotFillRecord[] = [
				{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Card.svelte", slotName: "default" },
				{ sourceFile: "/src/routes/+page.svelte", targetFile: "/src/lib/Card.svelte", slotName: "default" },
			];
			const result = buildEdges([], makeSymbolTable(), [], [], slotFills);
			expect(result).toHaveLength(1);
		});

		it("returns empty edges when no slot fills provided", () => {
			const result = buildEdges([], makeSymbolTable(), []);
			expect(result).toHaveLength(0);
		});
	});
		});
	});
});
