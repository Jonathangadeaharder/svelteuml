import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { extractServerExports } from "../../src/extraction/server-extractor.js";

function makeSourceFile(code: string, filePath = "/src/routes/+page.server.ts") {
	const project = new Project({ useInMemoryFileSystem: true });
	return project.createSourceFile(filePath, code);
}

describe("extractServerExports", () => {
	it("extracts a named load function", () => {
		const sf = makeSourceFile(`
			export async function load({ fetch, params }) {
				return { data: await fetch('/api').then(r => r.json()) };
			}
		`);
		const result = extractServerExports(sf, "/src/routes/+page.server.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("load");
		expect(result[0]?.isAsync).toBe(true);
		expect(result[0]?.serverKind).toBe("load");
	});

	it("extracts actions export", () => {
		const sf = makeSourceFile(`
			export const actions = {
				default: async ({ request }) => {
					const data = await request.formData();
					return { success: true };
				}
			};
		`);
		const result = extractServerExports(sf, "/src/routes/+page.server.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("actions");
		expect(result[0]?.serverKind).toBe("action");
	});

	it("extracts GET handler from +server.ts", () => {
		const sf = makeSourceFile(
			`
			import { json } from '@sveltejs/kit';
			export async function GET({ url }) {
				return json({ songs: [] });
			}
		`,
			"/src/routes/api/songs/+server.ts",
		);
		const result = extractServerExports(sf, "/src/routes/api/songs/+server.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("GET");
		expect(result[0]?.serverKind).toBe("http-handler");
	});

	it("extracts multiple HTTP handlers", () => {
		const sf = makeSourceFile(
			`
			export async function GET() { return new Response('ok'); }
			export async function POST({ request }) { return new Response('created'); }
			export async function DELETE() { return new Response('deleted'); }
		`,
			"/src/routes/api/+server.ts",
		);
		const result = extractServerExports(sf, "/src/routes/api/+server.ts");
		expect(result).toHaveLength(3);
		const names = result.map((r) => r.name);
		expect(names).toContain("GET");
		expect(names).toContain("POST");
		expect(names).toContain("DELETE");
	});

	it("skips non-server exports", () => {
		const sf = makeSourceFile(`
			export const CONSTANT = 'hello';
			export async function load() { return {}; }
		`);
		const result = extractServerExports(sf, "/src/routes/+page.server.ts");
		// CONSTANT should be skipped (not a recognised server export)
		const names = result.map((r) => r.name);
		expect(names).not.toContain("CONSTANT");
		expect(names).toContain("load");
	});

	it("skips files in node_modules", () => {
		const sf = makeSourceFile(
			`
			export async function load() { return {}; }
		`,
			"/project/node_modules/pkg/+page.server.ts",
		);
		const result = extractServerExports(sf, "/project/node_modules/pkg/+page.server.ts");
		expect(result).toHaveLength(0);
	});

	it("deduplicates entries with same name", () => {
		const sf = makeSourceFile(`
			export async function load() { return {}; }
			export const load2 = async () => {};
		`);
		const result = extractServerExports(sf, "/src/routes/+page.server.ts");
		const loadEntries = result.filter((r) => r.name === "load");
		expect(loadEntries).toHaveLength(1);
	});
});
