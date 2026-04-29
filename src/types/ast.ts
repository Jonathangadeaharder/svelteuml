/** Visibility modifier for class members. */
export type Visibility = "public" | "private" | "protected";

/** Represents a class or interface extracted from source. */
export interface ClassSymbol {
	kind: "class" | "interface" | "abstract-class";
	name: string;
	filePath: string;
	extends?: string | undefined;
	implements: string[];
	members: MemberSymbol[];
	isGeneric: boolean;
	typeParams: string[];
	isExported?: boolean;
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
	defaultValue?: string | undefined;
}

/** Represents a standalone function or exported function. */
export interface FunctionSymbol {
	kind: "function";
	name: string;
	filePath: string;
	isExported: boolean;
	isAsync: boolean;
	parameters: ParameterSymbol[];
	returnType?: string | undefined;
	typeParams: string[];
}

/** Svelte store (writable, readable, derived). */
export interface StoreSymbol {
	kind: "store";
	name: string;
	filePath: string;
	storeType: "writable" | "readable" | "derived";
	valueType: string;
	runeKind?: "state" | "derived";
	isExported?: boolean;
}

/** Svelte component prop. */
export interface PropSymbol {
	kind: "prop";
	name: string;
	filePath: string;
	componentName: string;
	type: string;
	isRequired: boolean;
	defaultValue?: string | undefined;
	accessibility?: "public" | "internal";
}

/** Module-level export. */
export interface ExportSymbol {
	kind: "export";
	name: string;
	filePath: string;
	exportType: "value" | "function" | "class" | "type" | "default";
	typeAnnotation?: string;
}

export type RouteParamKind = "dynamic" | "rest" | "optional";

export interface RouteParam {
	kind: RouteParamKind;
	name: string;
	matcher?: string;
}

export interface RouteSegment {
	raw: string;
	params: RouteParam[];
	groups: string[];
}

export type RouteFileKind = "page" | "layout" | "error" | "server";

export interface RouteSymbol {
	kind: "route";
	name: string;
	filePath: string;
	routeKind: RouteFileKind;
	isServer: boolean;
	routeSegment: RouteSegment;
}

/** Union of all extractable symbols. */
export type SymbolInfo =
	| ClassSymbol
	| FunctionSymbol
	| StoreSymbol
	| PropSymbol
	| ExportSymbol
	| RouteSymbol;

/** Complete symbol table for a project. */
export interface SymbolTable {
	classes: ClassSymbol[];
	functions: FunctionSymbol[];
	stores: StoreSymbol[];
	props: PropSymbol[];
	exports: ExportSymbol[];
	routes: RouteSymbol[];
}
