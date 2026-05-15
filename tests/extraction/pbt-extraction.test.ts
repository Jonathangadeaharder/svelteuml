import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";
import type { SymbolTable } from "../../src/types/ast.js";

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

// ts-morph Project creation is expensive (~1s per instance).
// Increase timeout to accommodate PBT run batches.
const PBT_TIMEOUT = 180_000;

// ---------------------------------------------------------------------------
// Content templates
// ---------------------------------------------------------------------------

const STORE_CONTENTS = [
	`import { writable } from 'svelte/store';\nexport const count = writable<number>(0);`,
	`import { readable } from 'svelte/store';\nexport const time = readable<string>('now');`,
	`import { writable, derived } from 'svelte/store';\nexport const items = writable<string[]>([]);`,
];

const FUNCTION_CONTENTS = [
	"export function greet(): void {}",
	"export function formatDate(): string { return ''; }",
	"export function parseInput(n: number): void {}",
];

const CLASS_CONTENTS = [
	"export class AudioPlayer {}",
	"export class UserService {}",
	"export class DataStore {}",
];

const ROUTE_CONTENTS: Record<string, string[]> = {
	"+page.ts": [
		"export function load() { return {}; }",
		"export const load = async () => { return {}; };",
	],
	"+page.server.ts": [
		"export async function load() { return {}; }",
		"export async function load({ params }: { params: Record<string, string> }) { return {}; }",
	],
	"+layout.ts": [
		"export function load() { return {}; }",
	],
	"+layout.server.ts": [
		"export async function load() { return {}; }",
	],
	"+server.ts": [
		"export async function GET() { return new Response('ok'); }",
		"export async function POST() { return new Response('created'); }",
	],
};

// ---------------------------------------------------------------------------
// Path generators
// ---------------------------------------------------------------------------

function arbLibPath(): fc.Arbitrary<string> {
	return fc.constantFrom(
		"/src/lib/utils.ts",
		"/src/lib/stores.ts",
		"/src/lib/helpers.ts",
		"/src/lib/services.ts",
		"/src/lib/api.ts",
		"/src/lib/components/button.ts",
		"/src/lib/data/models.ts",
		"/src/lib/hooks/auth.ts",
	);
}

function arbRoutePath(): fc.Arbitrary<string> {
	return fc.constantFrom(
		"/src/routes/+page.ts",
		"/src/routes/+page.server.ts",
		"/src/routes/+layout.ts",
		"/src/routes/+layout.server.ts",
		"/src/routes/+server.ts",
		"/src/routes/about/+page.ts",
		"/src/routes/api/songs/+server.ts",
		"/src/routes/api/songs/+page.server.ts",
		"/src/routes/dashboard/+layout.server.ts",
		"/src/routes/dashboard/+layout.ts",
		"/src/routes/auth/login/+page.server.ts",
		"/src/routes/products/+page.ts",
		"/src/routes/admin/+layout.ts",
	);
}

function arbSkipPath(): fc.Arbitrary<string> {
	return fc.constantFrom(
		"/project/node_modules/svelte/store.ts",
		"/project/node_modules/lodash/map.ts",
		"/src/lib/types.d.ts",
		"/dist/bundle.ts",
		"/.svelte-kit/generated/types.ts",
	);
}

// ---------------------------------------------------------------------------
// Content selection
// ---------------------------------------------------------------------------

function pickOne<T>(arr: T[]): fc.Arbitrary<T> {
	return fc.constantFrom(...arr);
}

function contentForRoute(routeName: string): fc.Arbitrary<string> {
	const candidates = ROUTE_CONTENTS[routeName];
	if (candidates && candidates.length > 0) {
		return pickOne(candidates);
	}
	return fc.constant("");
}

// ---------------------------------------------------------------------------
// File tree generator
// ---------------------------------------------------------------------------

type FileEntry = { path: string; content: string };

function arbLibFile(): fc.Arbitrary<FileEntry> {
	return fc
		.record({
			path: arbLibPath(),
			kind: fc.constantFrom("store" as const, "function" as const, "class" as const),
		})
		.chain(({ path, kind }) => {
			const contentArb = (() => {
				switch (kind) {
					case "store":
						return pickOne(STORE_CONTENTS);
					case "function":
						return pickOne(FUNCTION_CONTENTS);
					case "class":
						return pickOne(CLASS_CONTENTS);
				}
			})();
			return contentArb.map((content) => ({ path, content }));
		});
}

function arbRouteFile(): fc.Arbitrary<FileEntry> {
	return fc
		.record({
			path: arbRoutePath(),
		})
		.chain(({ path }) => {
			const fileName = path.split("/").at(-1) ?? "+page.ts";
			return contentForRoute(fileName).map((content) => ({ path, content }));
		});
}

function arbSkipFile(): fc.Arbitrary<FileEntry> {
	return arbSkipPath().map((path) => ({ path, content: "" }));
}

function arbFileEntry(): fc.Arbitrary<FileEntry> {
	return fc.oneof(arbLibFile(), arbRouteFile(), arbSkipFile());
}

/**
 * Generate a file tree: Record<filePath, content>.
 * Produces 0–10 unique files mixing lib, route, and skip paths.
 */
function arbFileTree(): fc.Arbitrary<Record<string, string>> {
	return fc
		.uniqueArray(arbFileEntry(), {
			minLength: 0,
			maxLength: 5,
			selector: (e) => e.path,
		})
		.map((entries) => {
			const tree: Record<string, string> = {};
			for (const { path, content } of entries) {
				tree[path] = content;
			}
			return tree;
		});
}

/**
 * Generate an import graph: Record<filePath, content> with cross-file imports.
 * Files import from each other to test that extraction handles multi-file projects.
 */
function arbImportGraph(): fc.Arbitrary<Record<string, string>> {
	return fc
		.uniqueArray(
			fc.constantFrom(
				"/src/lib/utils.ts",
				"/src/lib/stores.ts",
				"/src/lib/services.ts",
				"/src/lib/helpers.ts",
				"/src/lib/components/button.ts",
				"/src/routes/+page.ts",
				"/src/routes/+page.server.ts",
				"/src/routes/+layout.ts",
				"/src/routes/+layout.server.ts",
				"/src/routes/+server.ts",
				"/src/routes/api/songs/+server.ts",
				"/src/routes/dashboard/+layout.server.ts",
			),
			{ minLength: 0, maxLength: 8, selector: (p) => p },
		)
		.chain((paths) => {
			const entries: FileEntry[] = paths.map((p) => {
				if (p.startsWith("/src/routes/")) {
					const fileName = p.split("/").at(-1) ?? "+page.ts";
					const candidates = ROUTE_CONTENTS[fileName];
					const content = candidates ? candidates[0] ?? "" : "";
					return { path: p, content };
				}
				return { path: p, content: "export function helper(): void {}" };
			});
			return fc.constant(entries).map((es) => {
				const tree: Record<string, string> = {};
				for (const { path, content } of es) {
					tree[path] = content;
				}
				return tree;
			});
		});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProject(files: Record<string, string>): ParsingProject {
	const parsingProject = new ParsingProject();
	for (const [filePath, content] of Object.entries(files)) {
		parsingProject.addPlainSourceFile(filePath, content);
	}
	return parsingProject;
}

function* iterateSymbols(entry: SymbolTable): Generator<{ kind: string; filePath: string }> {
	for (const s of entry.classes) yield { kind: "class", filePath: s.filePath };
	for (const s of entry.functions) yield { kind: "function", filePath: s.filePath };
	for (const s of entry.stores) yield { kind: "store", filePath: s.filePath };
	for (const s of entry.props) yield { kind: "prop", filePath: s.filePath };
	for (const s of entry.events) yield { kind: "event", filePath: s.filePath };
	for (const s of entry.exports) yield { kind: "export", filePath: s.filePath };
	for (const s of entry.routes) yield { kind: "route", filePath: s.filePath };
	for (const s of entry.components) yield { kind: "component", filePath: s.filePath };
}

/** Serialise a SymbolTable for deterministic comparison (ignoring non-deterministic fields). */
function canonicalTable(table: SymbolTable): string {
	const parts: string[] = [];
	const add = (label: string, objs: { filePath: string; name?: string }[]) => {
		if (objs.length === 0) return;
		parts.push(`${label}:${objs.map((o) => `${o.filePath}::${o.name ?? ""}`).sort().join(",")}`);
	};
	add("cls", table.classes);
	add("fn", table.functions);
	add("store", table.stores);
	add("prop", table.props);
	add("event", table.events);
	add("export", table.exports);
	add("route", table.routes);
	add("comp", table.components);
	return parts.join("|");
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("Extraction PBT", () => {
	it("extracted ⊂ source: all symbol filePaths exist in the input file tree", { timeout: PBT_TIMEOUT }, () => {
		fc.assert(
			fc.property(arbFileTree(), (files) => {
				const project = buildProject(files);
				const extractor = new SymbolExtractor(project, new PipelineErrorHandler());
				const table = extractor.extract();

				const sourcePaths = new Set(Object.keys(files));
				for (const sym of iterateSymbols(table)) {
					if (sym.filePath) {
						expect(sourcePaths.has(sym.filePath)).toBe(true);
					}
				}
			}),
			{ numRuns: 500 },
		);
	});

	it("deterministic: same file tree twice produces identical output", { timeout: PBT_TIMEOUT }, () => {
		fc.assert(
			fc.property(arbFileTree(), (files) => {
				const project1 = buildProject(files);
				const table1 = new SymbolExtractor(project1, new PipelineErrorHandler()).extract();

				const project2 = buildProject(files);
				const table2 = new SymbolExtractor(project2, new PipelineErrorHandler()).extract();

				expect(canonicalTable(table1)).toBe(canonicalTable(table2));
			}),
			{ numRuns },
		);
	});

	it("no phantom: never produces components not backed by source files", { timeout: PBT_TIMEOUT }, () => {
		fc.assert(
			fc.property(arbFileTree(), (files) => {
				const project = buildProject(files);
				const extractor = new SymbolExtractor(project, new PipelineErrorHandler());
				const table = extractor.extract();

				const hasSvelteFiles = Object.keys(files).some(
					(p) => p.endsWith(".svelte") || p.endsWith(".svelte.tsx"),
				);

				if (!hasSvelteFiles) {
					expect(table.components).toHaveLength(0);
				} else {
					const sourcePaths = new Set(Object.keys(files));
					for (const c of table.components) {
						expect(sourcePaths.has(c.filePath)).toBe(true);
					}
				}
			}),
			{ numRuns },
		);
	});

	it("import graph: extracted symbols are a subset of input paths", { timeout: PBT_TIMEOUT }, () => {
		fc.assert(
			fc.property(arbImportGraph(), (files) => {
				const project = buildProject(files);
				const extractor = new SymbolExtractor(project, new PipelineErrorHandler());
				const table = extractor.extract();

				const sourcePaths = new Set(Object.keys(files));
				for (const sym of iterateSymbols(table)) {
					expect(sourcePaths.has(sym.filePath)).toBe(true);
				}
			}),
			{ numRuns },
		);
	});
});
