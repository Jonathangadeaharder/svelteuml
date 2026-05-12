import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { convertSvelteToTsx } from "../../src/parsing/svelte-to-tsx.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures/golden");
const GOLDEN_DIR = path.resolve(FIXTURES_DIR, "__tsx__");

function goldenPath(fixtureName: string): string {
	return path.join(GOLDEN_DIR, `${fixtureName}.svelte.tsx.txt`);
}

interface FixturePatterns {
	required: string[];
	forbidden?: string[];
}

const PATTERNS: Record<string, FixturePatterns> = {
	"Basic.svelte": {
		required: [
			'///<reference types="svelte" />',
			"$$ComponentProps",
			"$props",
			"__sveltets_2_fn_component",
			"Basic__SvelteComponent_",
		],
		forbidden: ["__sveltets_2_isomorphic_component", "__sveltets_2_store_get"],
	},
	"Complex.svelte": {
		required: [
			'import type { Snippet } from "svelte"',
			"$state<string | null>(null)",
			"__sveltets_2_ensureSnippet",
			"__sveltets_2_ensureArray",
			"__sveltets_2_fn_component",
			"Complex__SvelteComponent_",
		],
		forbidden: ["__sveltets_2_isomorphic_component", "__sveltets_2_store_get"],
	},
	"StateRunes.svelte": {
		required: [
			"$state(0)",
			"$derived(count * 2)",
			"__sveltets_2_fn_component",
			"StateRunes__SvelteComponent_",
			"Record<string, never>",
		],
		forbidden: ["__sveltets_2_isomorphic_component", "__sveltets_2_store_get", "export let"],
	},
	"Legacy.svelte": {
		required: [
			"__sveltets_2_any",
			"__sveltets_2_isomorphic_component",
			"__sveltets_2_with_any_event",
			"__sveltets_2_partial",
			'"on:click"',
			"Legacy__SvelteComponent_",
		],
		forbidden: ["__sveltets_2_fn_component", "$state", "$derived"],
	},
	"Stores.svelte": {
		required: [
			"__sveltets_2_store_get",
			"$userStore",
			"$count",
			"__sveltets_2_fn_component",
			"Stores__SvelteComponent_",
		],
		forbidden: ["__sveltets_2_isomorphic_component", "export let"],
	},
};

describe("golden TSX output", () => {
	const fixtureFiles = fs
		.readdirSync(FIXTURES_DIR)
		.filter((f) => f.endsWith(".svelte"))
		.sort();

	it.each(fixtureFiles)("generates matching TSX for %s", async (fixtureFile) => {
		const filePath = path.join(FIXTURES_DIR, fixtureFile);
		const goldenFile = goldenPath(fixtureFile);
		const result = await convertSvelteToTsx(filePath);

		expect(result.success).toBe(true);
		expect(result.tsxCode.length).toBeGreaterThan(0);

		const update = process.env.UPDATE_SNAPSHOTS === "1";

		if (update) {
			fs.mkdirSync(GOLDEN_DIR, { recursive: true });
			fs.writeFileSync(goldenFile, result.tsxCode, "utf-8");
			return;
		}

		if (!fs.existsSync(goldenFile)) {
			expect(goldenFile).toBe(
				`GOLDEN FILE NOT FOUND — run with UPDATE_SNAPSHOTS=1 to create: ${fixtureFile}`,
			);
			return;
		}

		const expected = fs.readFileSync(goldenFile, "utf-8");
		expect(result.tsxCode).toBe(expected);

		if (result.tsxCode !== expected) {
			const diffPath = path.join(GOLDEN_DIR, `${fixtureFile}.tsx.actual.txt`);
			fs.writeFileSync(diffPath, result.tsxCode, "utf-8");
			expect(diffPath).toBe(
				`MISMATCH — actual output written to ${diffPath}. Run with UPDATE_SNAPSHOTS=1 to accept.`,
			);
		}
	});

	describe("pattern assertions", () => {
		for (const [fixtureFile, patterns] of Object.entries(PATTERNS)) {
			it(`contains expected TSX patterns for ${fixtureFile}`, async () => {
				const filePath = path.join(FIXTURES_DIR, fixtureFile);
				const result = await convertSvelteToTsx(filePath);

				expect(result.success).toBe(true);

				for (const pattern of patterns.required) {
					expect(result.tsxCode).toContain(pattern);
				}

				if (patterns.forbidden) {
					for (const pattern of patterns.forbidden) {
						expect(result.tsxCode).not.toContain(pattern);
					}
				}
			});
		}
	});
});
