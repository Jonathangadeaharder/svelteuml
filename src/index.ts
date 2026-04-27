export { loadSvelteConfig, loadTsConfig, discoverFiles, type DiscoveryOptions } from "./discovery/index.js";
export {
	validateConfig,
	safeValidateConfig,
	getDefaultConfig,
	mergeConfigs,
	type SvelteUMLConfigInput,
} from "./config/index.js";
export type {
	AliasMap,
	DiscoveredFiles,
	SvelteConfigResult,
	TsConfigResult,
	SvelteUMLConfig,
} from "./types/index.js";
