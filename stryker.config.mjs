/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
	packageManager: "pnpm",
	reporters: ["html", "clear-text", "progress"],
	testRunner: "vitest",
	coverageAnalysis: "perTest",
	vitest: {
		configFile: "vitest.config.ts",
	},
	thresholds: {
		high: 80,
		low: 60,
		break: 80,
	},
	mutate: [
		"src/discovery/**/*.ts",
		"src/parsing/**/*.ts",
		"src/extraction/**/*.ts",
		"src/dependency/**/*.ts",
		"src/emission/**/*.ts",
	],
	skipMutations: [
		// Skip string literal mutations in error messages
		"StringLiteral",
	],
};
export default config;
