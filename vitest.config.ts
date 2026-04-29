import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "clover"],
			exclude: [
				"src/cli.ts",
				"dist/**",
				"vitest.config.ts",
				"src/index.ts",
				"src/cli/index.ts",
				"src/discovery/index.ts",
				"src/emission/index.ts",
				"src/extraction/index.ts",
				"src/parsing/index.ts",
				"src/types/ast.ts",
				"src/types/config.ts",
				"src/types/pipeline.ts",
			],
			thresholds: {
				branches: 90,
				lines: 80,
				functions: 90,
				statements: 90,
			},
		},
	},
});
