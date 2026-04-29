import type { SymbolTable } from "../types/ast.js";
import type { DiagramOptions } from "../types/diagram.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../types/diagram.js";
import type { EdgeSet } from "../types/edge.js";
import type { EmissionResult } from "../types/pipeline.js";
import { renderClassDiagram } from "./class-diagram.js";
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

	return {
		content,
		diagramKind: opts.kind,
	};
}
