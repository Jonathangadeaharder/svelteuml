import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";

/**
 * Build a ParsingProject from a map of filePath → code.
 * All files are treated as plain TS (no svelte2tsx conversion needed for tests).
 */
function buildProject(files: Record<string, string>): ParsingProject {
	const parsingProject = new ParsingProject();
	for (const [filePath, content] of Object.entries(files)) {
		parsingProject.addPlainSourceFile(filePath, content);
	}
	return parsingProject;
}

describe("SymbolExtractor", () => {
	it("extracts store symbols from lib files", () => {
		const project = buildProject({
			"/src/lib/stores.ts": `
				import { writable, readable } from 'svelte/store';
				export const count = writable<number>(0);
				export const time = readable<Date>(new Date());
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		expect(table.stores).toHaveLength(2);
		const names = table.stores.map(s => s.name);
		expect(names).toContain("count");
		expect(names).toContain("time");
	});

	it("extracts lib functions from utility files", () => {
		const project = buildProject({
			"/src/lib/utils.ts": `
				export function formatDate(d: Date): string { return d.toISOString(); }
				export function clamp(n: number, min: number, max: number): number {
					return Math.max(min, Math.min(max, n));
				}
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		expect(table.functions).toHaveLength(2);
		const names = table.functions.map(f => f.name);
		expect(names).toContain("formatDate");
		expect(names).toContain("clamp");
	});

	it("extracts classes from lib files", () => {
		const project = buildProject({
			"/src/lib/audio.ts": `
				export class AudioPlayer {
					private volume: number = 1;
					play(url: string): void {}
					stop(): void {}
				}
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		expect(table.classes).toHaveLength(1);
		expect(table.classes[0]?.name).toBe("AudioPlayer");
	});

	it("extracts route exports from server files", () => {
		const project = buildProject({
			"/src/routes/+page.server.ts": `
				export async function load({ fetch }) {
					return { data: [] };
				}
				export const actions = {
					default: async ({ request }) => ({ success: true })
				};
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		const names = table.functions.map(f => f.name);
		expect(names).toContain("load");
		expect(names).toContain("actions");
	});

	it("extracts HTTP handlers from +server.ts", () => {
		const project = buildProject({
			"/src/routes/api/songs/+server.ts": `
				export async function GET({ url }) { return new Response('[]'); }
				export async function POST({ request }) { return new Response('ok'); }
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		const names = table.functions.map(f => f.name);
		expect(names).toContain("GET");
		expect(names).toContain("POST");
	});

	it("skips .d.ts files", () => {
		const project = buildProject({
			"/src/lib/types.d.ts": `
				export interface User { id: string; name: string; }
			`,
			"/src/lib/utils.ts": `
				export function greet(name: string): string { return 'hi ' + name; }
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		// Classes from .d.ts should be skipped; function from .ts should be found
		expect(table.functions.some(f => f.name === "greet")).toBe(true);
	});

	it("skips node_modules files", () => {
		const project = buildProject({
			"/project/node_modules/svelte/store.ts": `
				export function writable() {}
			`,
			"/src/lib/mystore.ts": `
				import { writable } from 'svelte/store';
				export const x = writable<number>(0);
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		// Should not include anything from node_modules
		const fromNodeModules = [...table.functions, ...table.stores, ...table.classes]
			.filter(s => s.filePath.includes("node_modules"));
		expect(fromNodeModules).toHaveLength(0);
	});

	it("produces deterministic output ordering", () => {
		const project = buildProject({
			"/src/lib/b.ts": `
				export function bFunc(): void {}
			`,
			"/src/lib/a.ts": `
				export function aFunc(): void {}
			`,
		});
		const extractor = new SymbolExtractor(project);
		const table1 = extractor.extract();
		const table2 = extractor.extract();

		const names1 = table1.functions.map(f => f.name);
		const names2 = table2.functions.map(f => f.name);
		expect(names1).toEqual(names2);
		// aFunc should come before bFunc due to path sorting
		expect(names1.indexOf("aFunc")).toBeLessThan(names1.indexOf("bFunc"));
	});

	it("returns empty table for empty project", () => {
		const project = buildProject({});
		const extractor = new SymbolExtractor(project);
		const table = extractor.extract();

		expect(table.classes).toHaveLength(0);
		expect(table.functions).toHaveLength(0);
		expect(table.stores).toHaveLength(0);
		expect(table.props).toHaveLength(0);
		expect(table.exports).toHaveLength(0);
	});
});
