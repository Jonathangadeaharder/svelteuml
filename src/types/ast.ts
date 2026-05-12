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
	group?: string;
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
	group?: string;
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
	group?: string;
}

/** Event dispatched by a Svelte component. */
export interface EventSymbol {
	kind: "event";
	name: string;
	filePath: string;
	componentName: string;
	eventName: string;
	type: string;
	group?: string;
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
	group?: string;
}

/** Module-level export. */
export interface ExportSymbol {
	kind: "export";
	name: string;
	filePath: string;
	exportType: "value" | "function" | "class" | "type" | "default";
	typeAnnotation?: string;
	group?: string;
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
	group?: string;
}

/** Svelte component discovered in the project. */
export interface ComponentSymbol {
	kind: "component";
	name: string;
	filePath: string;
	group?: string;
	tags?: import("../extraction/comment-tags.js").UmlTag[];
}

/** Union of all extractable symbols. */
export type SymbolInfo =
	| ClassSymbol
	| FunctionSymbol
	| StoreSymbol
	| PropSymbol
	| ExportSymbol
	| RouteSymbol
	| ComponentSymbol
	| EventSymbol;

/** Complete symbol table for a project. */
export interface SymbolTable {
	classes: ClassSymbol[];
	functions: FunctionSymbol[];
	stores: StoreSymbol[];
	props: PropSymbol[];
	events: EventSymbol[];
	exports: ExportSymbol[];
	routes: RouteSymbol[];
	components: ComponentSymbol[];
}
