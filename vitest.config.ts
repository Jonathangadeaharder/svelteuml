import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "clover"],
			thresholds: {
				branches: 90,
				lines: 80,
				functions: 90,
				statements: 90,
			},
		},
	},
});
