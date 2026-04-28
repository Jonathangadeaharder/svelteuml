import type { SymbolTable } from "./ast.js";
import type { EdgeSet } from "./edge.js";

export interface ParseResult {
	sourceFile: string;
	success: boolean;
	error?: ParseError;
}

export interface ParseError {
	message: string;
	line?: number;
	column?: number;
}

export interface ExtractionResult {
	symbols: SymbolTable;
	edges: EdgeSet;
	parseResults: ReadonlyArray<ParseResult>;
}

export interface EmissionResult {
	content: string;
	diagramKind: "class" | "package";
}

export interface PipelineResult {
	extraction: ExtractionResult;
	emission: EmissionResult;
}
