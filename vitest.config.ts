import { defineConfig } from "vitest/config";

export default defineConfig({
		test: {
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		testTimeout: 15_000,
		globals: true,
		exclude: ["tests/integration/**", "tests/e2e/**", "**/node_modules/**"],
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
				branches: 85,
				lines: 80,
				functions: 85,
				statements: 85,
				"src/parsing/svelte-to-tsx.ts": {
					branches: 77,
				},
			},
		},
		env: {
			VITEST_PBT_NUM_RUNS: "100",
		},
	},
});
