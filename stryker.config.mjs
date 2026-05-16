/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
	packageManager: "pnpm",
	plugins: ["@stryker-mutator/vitest-runner"],
	reporters: ["html", "clear-text", "progress"],
	testRunner: "vitest",
	coverageAnalysis: "perTest",
	incremental: true,
	ignoreStatic: true,
	vitest: {
		configFile: "vitest.config.ts",
	},
	thresholds: {
		high: 80,
		low: 60,
		break: 75,
	},
	mutator: {
		excludedMutations: ["StringLiteral"],
	},
	mutate: [
		"src/discovery/**/*.ts",
		"src/parsing/**/*.ts",
		"src/extraction/**/*.ts",
		"src/dependency/**/*.ts",
		"src/emission/**/*.ts",
		"src/cli/**/*.ts",
	],
};
export default config;
