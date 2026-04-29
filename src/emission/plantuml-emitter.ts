import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";
import type { EdgeSet } from "../types/edge.js";
import type { EmissionResult } from "../types/pipeline.js";
import { renderClassDiagram } from "./class-diagram.js";
import { renderColorLegend, renderColorTheme } from "./color-theme.js";
import { renderLayoutDirective } from "./layout-hints.js";
import { renderPackageDiagram } from "./package-diagram.js";

export function emitPlantUML(
	symbols: SymbolTable,
	edges: EdgeSet,
	options?: DiagramOptions,
): EmissionResult {
	const opts = options ?? DEFAULT_DIAGRAM_OPTIONS;

	const content =
		opts.kind === "package"
			? renderPackageDiagram(symbols, edges, opts)
			: renderClassDiagram(symbols, edges, opts);

	const injected = injectThemeBlock(content, opts);

	return {
		content: injected,
		diagramKind: opts.kind,
	};
}

function injectThemeBlock(puml: string, opts: DiagramOptions): string {
	const lines = puml.split("\n");
	const headerEndIdx = lines.findIndex((l) => l.startsWith("@startuml"));
	if (headerEndIdx === -1) return puml;

	const insertions: string[] = [];

	const layout = renderLayoutDirective(opts.layoutDirection ?? "top-to-bottom");
	if (layout) insertions.push(layout);

	const theme = renderColorTheme(opts.stereotypeColors ?? {});
	if (theme) insertions.push(theme);

	const legend = renderColorLegend(opts.stereotypeColors ?? {});
	if (legend) insertions.push(legend);

	if (insertions.length === 0) return puml;

	const afterHeader = headerEndIdx + 1;
	const blankLineIdx = lines.findIndex((l, i) => i > headerEndIdx && l.trim() === "");
	const insertAt = blankLineIdx > headerEndIdx ? blankLineIdx + 1 : afterHeader;

	lines.splice(insertAt, 0, ...insertions, "");
	return lines.join("\n");
}
