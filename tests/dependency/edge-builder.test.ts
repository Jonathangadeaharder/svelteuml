import { describe, expect, it } from "vitest";
import { buildEdges } from "../../src/dependency/edge-builder.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import type { SymbolTable } from "../../src/types/ast.js";

function makeSymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
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
});
