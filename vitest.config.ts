import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "clover"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/index.ts",
				"src/cli.ts",
				"src/types/ast.ts",
				"src/types/config.ts",
				"src/types/pipeline.ts",
			],
			thresholds: {
				branches: 90,
				lines: 80,
				functions: 90,
				statements: 90,
				"src/parsing/svelte-to-tsx.ts": {
					branches: 77,
				},
			},
		},
	},
});
