export { type CacheEntry, ConversionCache } from "./cache.js";
export {
	contentHash,
	decodeVLQMappings,
	type MappedPosition,
	SourceMapDecoder,
	type SourcePosition,
} from "./source-map.js";
export {
	convertFiles,
	convertPlainTsFile,
	convertSvelteToTsx,
	isTypeScriptSvelte,
	type SvelteToTsxResult,
} from "./svelte-to-tsx.js";
export { buildParsingProject, ParsingProject } from "./ts-morph-project.js";
