import { describe, expect, it } from "vitest";
import type {
	ClassSymbol,
	ExportSymbol,
	FunctionSymbol,
	MemberSymbol,
	ParameterSymbol,
	PropSymbol,
	StoreSymbol,
	SymbolTable,
	Visibility,
} from "../../src/types/ast.js";

describe("src/types/ast.ts", () => {
	describe("ClassSymbol", () => {
		it("creates a minimal class symbol", () => {
			const cls: ClassSymbol = {
				kind: "class",
				name: "MyClass",
				filePath: "/src/MyClass.ts",
				implements: [],
				members: [],
				isGeneric: false,
				typeParams: [],
			};
			expect(cls.kind).toBe("class");
			expect(cls.extends).toBeUndefined();
			expect(cls.implements).toHaveLength(0);
		});

		it("creates a full class symbol with inheritance and generics", () => {
			const member: MemberSymbol = {
				kind: "method",
				name: "doWork",
				visibility: "public",
				type: "void",
				isStatic: false,
				isAbstract: false,
				isReadonly: false,
				parameters: [{ name: "input", type: "string", isOptional: false }],
				returnType: "void",
			};
			const cls: ClassSymbol = {
				kind: "abstract-class",
				name: "BaseService",
				filePath: "/src/BaseService.ts",
				extends: "Service",
				implements: ["IInit", "IDispose"],
				members: [member],
				isGeneric: true,
				typeParams: ["T", "U"],
			};
			expect(cls.kind).toBe("abstract-class");
			expect(cls.extends).toBe("Service");
			expect(cls.implements).toHaveLength(2);
			expect(cls.members[0]?.name).toBe("doWork");
			expect(cls.typeParams).toEqual(["T", "U"]);
		});

		it("supports interface kind", () => {
			const iface: ClassSymbol = {
				kind: "interface",
				name: "IRepository",
				filePath: "/src/IRepository.ts",
				implements: [],
				members: [],
				isGeneric: false,
				typeParams: [],
			};
			expect(iface.kind).toBe("interface");
		});
	});

	describe("MemberSymbol", () => {
		it("creates a property member", () => {
			const prop: MemberSymbol = {
				kind: "property",
				name: "count",
				visibility: "private",
				type: "number",
				isStatic: false,
				isAbstract: false,
				isReadonly: true,
			};
			expect(prop.kind).toBe("property");
			expect(prop.isReadonly).toBe(true);
			expect(prop.parameters).toBeUndefined();
		});

		it("creates a method member with parameters", () => {
			const params: ParameterSymbol[] = [
				{ name: "x", type: "number", isOptional: false },
				{ name: "y", type: "number", isOptional: true, defaultValue: "0" },
			];
			const method: MemberSymbol = {
				kind: "method",
				name: "calculate",
				visibility: "protected",
				type: "number",
				isStatic: true,
				isAbstract: false,
				isReadonly: false,
				parameters: params,
				returnType: "number",
			};
			expect(method.kind).toBe("method");
			expect(method.parameters).toHaveLength(2);
			expect(method.parameters?.[1]?.defaultValue).toBe("0");
		});
	});

	describe("FunctionSymbol", () => {
		it("creates an exported async function", () => {
			const fn: FunctionSymbol = {
				kind: "function",
				name: "fetchData",
				filePath: "/src/api.ts",
				isExported: true,
				isAsync: true,
				parameters: [{ name: "url", type: "string", isOptional: false }],
				returnType: "Promise<Response>",
				typeParams: [],
			};
			expect(fn.isExported).toBe(true);
			expect(fn.isAsync).toBe(true);
			expect(fn.returnType).toBe("Promise<Response>");
		});

		it("creates a non-exported sync function", () => {
			const fn: FunctionSymbol = {
				kind: "function",
				name: "helper",
				filePath: "/src/utils.ts",
				isExported: false,
				isAsync: false,
				parameters: [],
				typeParams: [],
			};
			expect(fn.isExported).toBe(false);
			expect(fn.returnType).toBeUndefined();
		});
	});

	describe("StoreSymbol", () => {
		it("creates a writable store", () => {
			const store: StoreSymbol = {
				kind: "store",
				name: "count",
				filePath: "/src/stores.ts",
				storeType: "writable",
				valueType: "number",
			};
			expect(store.storeType).toBe("writable");
		});

		it("creates a derived store", () => {
			const store: StoreSymbol = {
				kind: "store",
				name: "doubled",
				filePath: "/src/stores.ts",
				storeType: "derived",
				valueType: "number",
			};
			expect(store.storeType).toBe("derived");
		});
	});

	describe("PropSymbol", () => {
		it("creates a required prop", () => {
			const prop: PropSymbol = {
				kind: "prop",
				name: "title",
				filePath: "/src/Heading.svelte",
				componentName: "Heading",
				type: "string",
				isRequired: true,
			};
			expect(prop.isRequired).toBe(true);
			expect(prop.defaultValue).toBeUndefined();
		});

		it("creates an optional prop with default", () => {
			const prop: PropSymbol = {
				kind: "prop",
				name: "size",
				filePath: "/src/Button.svelte",
				componentName: "Button",
				type: "number",
				isRequired: false,
				defaultValue: "16",
			};
			expect(prop.isRequired).toBe(false);
			expect(prop.defaultValue).toBe("16");
		});
	});

	describe("ExportSymbol", () => {
		it("creates a value export", () => {
			const exp: ExportSymbol = {
				kind: "export",
				name: "VERSION",
				filePath: "/src/version.ts",
				exportType: "value",
			};
			expect(exp.exportType).toBe("value");
			expect(exp.typeAnnotation).toBeUndefined();
		});

		it("creates a type export with annotation", () => {
			const exp: ExportSymbol = {
				kind: "export",
				name: "Config",
				filePath: "/src/types.ts",
				exportType: "type",
				typeAnnotation: "{ theme: string }",
			};
			expect(exp.exportType).toBe("type");
			expect(exp.typeAnnotation).toBe("{ theme: string }");
		});
	});

	describe("SymbolTable", () => {
		it("creates an empty symbol table", () => {
			const table: SymbolTable = {
				classes: [],
				functions: [],
				stores: [],
				props: [],
				exports: [],
			};
			expect(table.classes).toHaveLength(0);
			expect(table.functions).toHaveLength(0);
		});

		it("creates a populated symbol table", () => {
			const cls: ClassSymbol = {
				kind: "class",
				name: "App",
				filePath: "/src/App.ts",
				implements: [],
				members: [],
				isGeneric: false,
				typeParams: [],
			};
			const store: StoreSymbol = {
				kind: "store",
				name: "user",
				filePath: "/src/stores.ts",
				storeType: "writable",
				valueType: "User",
			};
			const table: SymbolTable = {
				classes: [cls],
				functions: [],
				stores: [store],
				props: [],
				exports: [],
			};
			expect(table.classes).toHaveLength(1);
			expect(table.stores).toHaveLength(1);
		});
	});

	describe("Visibility", () => {
		it("accepts all visibility modifiers", () => {
			const vis: Visibility[] = ["public", "private", "protected"];
			expect(vis).toHaveLength(3);
		});
	});
});
