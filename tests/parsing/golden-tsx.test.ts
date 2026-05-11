import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { convertSvelteToTsx } from "../../src/parsing/svelte-to-tsx.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures/golden");
const GOLDEN_DIR = path.resolve(FIXTURES_DIR, "__tsx__");

function goldenPath(fixtureName: string): string {
	return path.join(GOLDEN_DIR, `${fixtureName}.svelte.tsx.txt`);
}

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
});
