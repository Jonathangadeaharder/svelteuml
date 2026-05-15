import fc from "fast-check";
import type {
	ClassSymbol,
	ComponentSymbol,
	EventSymbol,
	ExportSymbol,
	FunctionSymbol,
	MemberSymbol,
	ParameterSymbol,
	PropSymbol,
	RouteFileKind,
	RouteParam,
	RouteParamKind,
	RouteSegment,
	RouteSymbol,
	StoreSymbol,
	SymbolInfo,
	SymbolTable,
	Visibility,
} from "../../src/types/ast.js";

export function arbVisibility(): fc.Arbitrary<Visibility> {
	return fc.constantFrom("public" as const, "private" as const, "protected" as const);
}

const visibility: fc.Arbitrary<Visibility> = arbVisibility();

export function arbParameterSymbol(): fc.Arbitrary<ParameterSymbol> {
	return fc.record({
		name: fc.string({ minLength: 1, maxLength: 20 }),
		type: fc.string({ minLength: 1, maxLength: 30 }),
		isOptional: fc.boolean(),
		defaultValue: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
	});
}

const parameterSymbol: fc.Arbitrary<ParameterSymbol> = arbParameterSymbol();

function arbPropertyMember(): fc.Arbitrary<MemberSymbol> {
	return fc.record({
		kind: fc.constant("property" as const),
		name: fc.string({ minLength: 1, maxLength: 20 }),
		visibility,
		type: fc.string({ minLength: 1, maxLength: 30 }),
		isStatic: fc.boolean(),
		isAbstract: fc.boolean(),
		isReadonly: fc.boolean(),
	});
}

function arbMethodMember(): fc.Arbitrary<MemberSymbol> {
	return fc.record({
		kind: fc.constant("method" as const),
		name: fc.string({ minLength: 1, maxLength: 20 }),
		visibility,
		type: fc.string({ minLength: 1, maxLength: 30 }),
		isStatic: fc.boolean(),
		isAbstract: fc.boolean(),
		isReadonly: fc.boolean(),
		parameters: fc.array(parameterSymbol, { maxLength: 5 }),
		returnType: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
	});
}

export function arbMemberSymbol(): fc.Arbitrary<MemberSymbol> {
	return fc.oneof(arbPropertyMember(), arbMethodMember());
}

const memberSymbol: fc.Arbitrary<MemberSymbol> = arbMemberSymbol();

export function arbClassSymbol(): fc.Arbitrary<ClassSymbol> {
	return fc.record({
		kind: fc.constantFrom("class" as const, "interface" as const, "abstract-class" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		extends: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
		implements: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
		members: fc.array(memberSymbol, { maxLength: 10 }),
		isGeneric: fc.boolean(),
		typeParams: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
		isExported: fc.option(fc.boolean(), { nil: undefined }),
	});
}

const classSymbol: fc.Arbitrary<ClassSymbol> = arbClassSymbol();

export function arbFunctionSymbol(): fc.Arbitrary<FunctionSymbol> {
	return fc.record({
		kind: fc.constant("function" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		isExported: fc.boolean(),
		isAsync: fc.boolean(),
		parameters: fc.array(parameterSymbol, { maxLength: 5 }),
		returnType: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
		typeParams: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
	});
}

const functionSymbol: fc.Arbitrary<FunctionSymbol> = arbFunctionSymbol();

export function arbStoreSymbol(): fc.Arbitrary<StoreSymbol> {
	return fc.record({
		kind: fc.constant("store" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		storeType: fc.constantFrom("writable" as const, "readable" as const, "derived" as const),
		valueType: fc.string({ minLength: 1, maxLength: 30 }),
		runeKind: fc.option(fc.constantFrom("state" as const, "derived" as const), { nil: undefined }),
		isExported: fc.option(fc.boolean(), { nil: undefined }),
	});
}

const storeSymbol: fc.Arbitrary<StoreSymbol> = arbStoreSymbol();

export function arbPropSymbol(): fc.Arbitrary<PropSymbol> {
	return fc.record({
		kind: fc.constant("prop" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		componentName: fc.string({ minLength: 1, maxLength: 30 }),
		type: fc.string({ minLength: 1, maxLength: 30 }),
		isRequired: fc.boolean(),
		defaultValue: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
		accessibility: fc.option(fc.constantFrom("public" as const, "internal" as const), {
			nil: undefined,
		}),
	});
}

const propSymbol: fc.Arbitrary<PropSymbol> = arbPropSymbol();

export function arbExportSymbol(): fc.Arbitrary<ExportSymbol> {
	return fc.record({
		kind: fc.constant("export" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		exportType: fc.constantFrom(
			"value" as const,
			"function" as const,
			"class" as const,
			"type" as const,
			"default" as const,
		),
		typeAnnotation: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
	});
}

const exportSymbol: fc.Arbitrary<ExportSymbol> = arbExportSymbol();

function arbRouteParamKind(): fc.Arbitrary<RouteParamKind> {
	return fc.constantFrom("dynamic" as const, "rest" as const, "optional" as const);
}

function arbRouteParam(): fc.Arbitrary<RouteParam> {
	return fc.record({
		kind: arbRouteParamKind(),
		name: fc.string({ minLength: 1, maxLength: 20 }),
		matcher: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
	});
}

const routeParam: fc.Arbitrary<RouteParam> = arbRouteParam();

function arbRouteFileKind(): fc.Arbitrary<RouteFileKind> {
	return fc.constantFrom("page" as const, "layout" as const, "error" as const, "server" as const);
}

function arbRouteSegment(): fc.Arbitrary<RouteSegment> {
	return fc.record({
		raw: fc.string({ maxLength: 30 }),
		params: fc.array(routeParam, { maxLength: 3 }),
		groups: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
	});
}

export function arbRouteSymbol(): fc.Arbitrary<RouteSymbol> {
	return fc.record({
		kind: fc.constant("route" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		routeKind: arbRouteFileKind(),
		isServer: fc.boolean(),
		routeSegment: arbRouteSegment(),
	});
}

const routeSymbol: fc.Arbitrary<RouteSymbol> = arbRouteSymbol();

export function arbComponentSymbol(): fc.Arbitrary<ComponentSymbol> {
	return fc.record({
		kind: fc.constant("component" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
	});
}

const componentSymbol: fc.Arbitrary<ComponentSymbol> = arbComponentSymbol();

export function arbEventSymbol(): fc.Arbitrary<EventSymbol> {
	return fc.record({
		kind: fc.constant("event" as const),
		name: fc.string({ minLength: 1, maxLength: 30 }),
		filePath: fc.string({ minLength: 1, maxLength: 60 }),
		componentName: fc.string({ minLength: 1, maxLength: 30 }),
		eventName: fc.string({ minLength: 1, maxLength: 30 }),
		type: fc.string({ minLength: 1, maxLength: 30 }),
	});
}

const eventSymbol: fc.Arbitrary<EventSymbol> = arbEventSymbol();

export function arbSymbolInfo(): fc.Arbitrary<SymbolInfo> {
	return fc.oneof(
		classSymbol,
		functionSymbol,
		storeSymbol,
		propSymbol,
		exportSymbol,
		routeSymbol,
		componentSymbol,
		eventSymbol,
	);
}

export function arbSymbolTable(): fc.Arbitrary<SymbolTable> {
	return fc.record({
		classes: fc.array(classSymbol, { maxLength: 5 }),
		functions: fc.array(functionSymbol, { maxLength: 5 }),
		stores: fc.array(storeSymbol, { maxLength: 5 }),
		props: fc.array(propSymbol, { maxLength: 5 }),
		events: fc.array(eventSymbol, { maxLength: 5 }),
		exports: fc.array(exportSymbol, { maxLength: 5 }),
		routes: fc.array(routeSymbol, { maxLength: 5 }),
		components: fc.array(componentSymbol, { maxLength: 5 }),
	});
}
