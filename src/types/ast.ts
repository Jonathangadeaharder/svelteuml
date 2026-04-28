/** Visibility modifier for class members. */
export type Visibility = "public" | "private" | "protected";

/** Represents a class or interface extracted from source. */
export interface ClassSymbol {
	kind: "class" | "interface" | "abstract-class";
	name: string;
	filePath: string;
	extends?: string;
	implements: string[];
	members: MemberSymbol[];
	isGeneric: boolean;
	typeParams: string[];
}

/** Represents a class member (property or method). */
export interface MemberSymbol {
	kind: "property" | "method";
	name: string;
	visibility: Visibility;
	type: string;
	isStatic: boolean;
	isAbstract: boolean;
	isReadonly: boolean;
	parameters?: ParameterSymbol[];
	returnType?: string;
}

/** Function/method parameter. */
export interface ParameterSymbol {
	name: string;
	type: string;
	isOptional: boolean;
	defaultValue?: string;
}

/** Represents a standalone function or exported function. */
export interface FunctionSymbol {
	kind: "function";
	name: string;
	filePath: string;
	isExported: boolean;
	isAsync: boolean;
	parameters: ParameterSymbol[];
	returnType?: string;
	typeParams: string[];
}

/** Svelte store (writable, readable, derived). */
export interface StoreSymbol {
	kind: "store";
	name: string;
	filePath: string;
	storeType: "writable" | "readable" | "derived";
	valueType: string;
}

/** Svelte component prop. */
export interface PropSymbol {
	kind: "prop";
	name: string;
	filePath: string;
	componentName: string;
	type: string;
	isRequired: boolean;
	defaultValue?: string;
}

/** Module-level export. */
export interface ExportSymbol {
	kind: "export";
	name: string;
	filePath: string;
	exportType: "value" | "function" | "class" | "type" | "default";
	typeAnnotation?: string;
}

/** Union of all extractable symbols. */
export type SymbolInfo = ClassSymbol | FunctionSymbol | StoreSymbol | PropSymbol | ExportSymbol;

/** Complete symbol table for a project. */
export interface SymbolTable {
	classes: ClassSymbol[];
	functions: FunctionSymbol[];
	stores: StoreSymbol[];
	props: PropSymbol[];
	exports: ExportSymbol[];
}
