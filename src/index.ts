export {
	getDefaultConfig,
	mergeConfigs,
	type SvelteUMLConfigInput,
	safeValidateConfig,
	validateConfig,
} from "./config/index.js";
export {
	type DiscoveryOptions,
	discoverFiles,
	loadSvelteConfig,
	loadTsConfig,
} from "./discovery/index.js";
export {
	buildParsingProject,
	type CacheEntry,
	ConversionCache,
	contentHash,
	convertFiles,
	convertPlainTsFile,
	convertSvelteToTsx,
	decodeVLQMappings,
	isTypeScriptSvelte,
	type MappedPosition,
	ParsingProject,
	SourceMapDecoder,
	type SourcePosition,
	type SvelteToTsxResult,
} from "./parsing/index.js";
export type {
	ClassSymbol,
	ExportSymbol,
	FunctionSymbol,
	MemberSymbol,
	ParameterSymbol,
	PropSymbol,
	StoreSymbol,
	SymbolInfo,
	SymbolTable,
	Visibility,
} from "./types/ast.js";
export type {
	AliasMap,
	DiscoveredFiles,
	SvelteConfigResult,
	SvelteUMLConfig,
	TsConfigResult,
} from "./types/config.js";
export type { DiagramKind, DiagramOptions } from "./types/diagram.js";
export { DEFAULT_DIAGRAM_OPTIONS } from "./types/diagram.js";
export type { Edge, EdgeSet, EdgeType } from "./types/edge.js";
export { createEdgeSet } from "./types/edge.js";
export type {
	EmissionResult,
	ExtractionResult,
	ParseError,
	ParseResult,
	PipelineResult,
} from "./types/pipeline.js";
