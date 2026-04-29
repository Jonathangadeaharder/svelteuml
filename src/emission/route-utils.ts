import type { RouteSymbol } from "../types/ast.js";

export function routeStereotype(route: RouteSymbol): string {
	if (route.routeKind === "server") return "endpoint";
	if (route.routeKind === "error") return "error-page";
	if (route.routeKind === "page" && route.isServer) return "PageLoad";
	if (route.routeKind === "layout" && route.isServer) return "LayoutLoad";
	if (route.routeKind === "page") return "page";
	if (route.routeKind === "layout") return "layout";
	return route.routeKind;
}
