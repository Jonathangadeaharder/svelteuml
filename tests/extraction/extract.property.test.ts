import fc from "fast-check";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";
import { componentNameFromPath } from "../../src/extraction/component-extractor.js";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const numRuns = Number(process.env.VITEST_PBT_NUM_RUNS) || 100;

function isSafeSegment(s: string): boolean {
	return /^[a-zA-Z0-9_$][a-zA-Z0-9_$\-+.]*$/.test(s) && s.length > 0;
}

/** Generate a single path segment (directory or file name stem). */
function arbSegment(): fc.Arbitrary<string> {
	return fc.string({ minLength: 1, maxLength: 15 }).filter(isSafeSegment);
}

/** Generate a valid JavaScript identifier. */
function arbIdentifier(): fc.Arbitrary<string> {
	return fc
		.string({ minLength: 1, maxLength: 15 })
		.filter((s) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s));
}

/** Choose a SvelteKit route file basename. */
function arbRouteBasename(): fc.Arbitrary<string> {
	return fc.constantFrom(
		"+page.svelte.tsx",
		"+layout.svelte.tsx",
		"+error.svelte.tsx",
		"+page.ts",
		"+layout.ts",
		"+layout.server.ts",
		"+page.server.ts",
		"+server.ts",
	);
}

/**
 * Generate appropriate TypeScript content for a given file path so that the
 * extraction pipeline finds symbols to extract.  Uses fc.sample only for the
 * small set of content decisions, not for the file-tree shape.
 */
function contentForPath(filePath: string): string {
	const name = basename(filePath).replace(/\.(svelte\.tsx|svelte|ts)$/, "");

	if (filePath.endsWith(".svelte.tsx")) {
		if (name.startsWith("+")) {
			return "export let data: unknown;\n";
		}
		return `export let ${name}: string;\n`;
	}

	if (filePath.endsWith("+server.ts")) {
		return "export async function GET(): Promise<Response> { return new Response(); }\n";
	}

	if (name.startsWith("+")) {
		return "export function load() { return {}; }\n";
	}

	const r = Math.random();
	if (r < 0.34) return `export function ${name}(): void {}\n`;
	if (r < 0.67) {
		const st = fc.sample(fc.constantFrom("writable", "readable", "derived"), 1)[0] ?? "writable";
		return `import { ${st} } from 'svelte/store';\nexport const ${name} = ${st}<number>(0);\n`;
	}
	return `export class ${name} {}\n`;
}

/**
 * Generate an arbitrary file tree as `Record<filePath, content>`.
 *
 * Each tree is a small, realistic mix of:
 *   - Svelte component files (`.svelte.tsx`)
 *   - Lib TS files (`.ts`) with functions / stores / classes
 *   - SvelteKit route files under `src/routes/`
 */
function arbFileTree(): fc.Arbitrary<Record<string, string>> {
	return fc
		.record({
			libNames: fc.array(arbIdentifier(), { minLength: 0, maxLength: 3 }),
			compNames: fc.array(arbIdentifier(), { minLength: 0, maxLength: 2 }),
			routeFiles: fc.array(arbRouteBasename(), { minLength: 0, maxLength: 3 }),
			routeDir: fc.array(arbSegment(), { minLength: 0, maxLength: 2 }),
		})
		.chain(({ libNames, compNames, routeFiles, routeDir }) => {
			const tree: Record<string, string> = {};
			const rd = routeDir.length > 0 ? `/src/routes/${routeDir.join("/")}` : "/src/routes";

			for (const name of libNames) {
				tree[`/src/lib/${name}.ts`] = contentForPath(`/src/lib/${name}.ts`);
			}
			for (const name of compNames) {
				tree[`/src/lib/${name}.svelte.tsx`] = contentForPath(`/src/lib/${name}.svelte.tsx`);
			}
			for (const rn of routeFiles) {
				tree[`${rd}/${rn}`] = contentForPath(`${rd}/${rn}`);
			}
			return fc.constant(tree);
		});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProject(files: Record<string, string>): ParsingProject {
	const project = new ParsingProject();
	for (const [filePath, content] of Object.entries(files)) {
		project.addPlainSourceFile(filePath, content);
	}
	return project;
}

function extractSymbols(files: Record<string, string>) {
	const project = buildProject(files);
	const extractor = new SymbolExtractor(project, new PipelineErrorHandler());
	return extractor.extract();
}

/**
 * Symbol filePaths may be stored without the `.tsx` suffix.
 * Returns both the raw path and the `.tsx` variant if applicable.
 */
function sourcePathsWithTsxVariants(files: Record<string, string>): Set<string> {
	const paths = new Set<string>();
	for (const fp of Object.keys(files)) {
		paths.add(fp);
		// Route `.svelte.tsx` files produce symbols with `.svelte` filePath
		if (fp.endsWith(".svelte.tsx")) {
			paths.add(fp.replace(/\.tsx$/, ""));
		}
	}
	return paths;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

const PBT_TIMEOUT = 120_000;

describe("extraction properties", () => {
	it(
		"all extracted symbols reference real source files",
		() => {
			fc.assert(
				fc.property(arbFileTree(), (files) => {
					fc.pre(Object.keys(files).length > 0);
					const table = extractSymbols(files);
					const sources = sourcePathsWithTsxVariants(files);

					const allPaths = [
						...table.classes.map((s) => s.filePath),
						...table.functions.map((s) => s.filePath),
						...table.stores.map((s) => s.filePath),
						...table.props.map((s) => s.filePath),
						...table.routes.map((s) => s.filePath),
						...table.components.map((s) => s.filePath),
					];

					for (const fp of allPaths) {
						expect(sources.has(fp)).toBe(true);
					}
				}),
				{ numRuns: Math.max(numRuns, 500) },
			);
		},
		PBT_TIMEOUT,
	);

	it(
		"extraction is deterministic: same input → identical output",
		() => {
			fc.assert(
				fc.property(arbFileTree(), (files) => {
					fc.pre(Object.keys(files).length > 0);
					const table1 = extractSymbols(files);
					const table2 = extractSymbols(files);
					expect(table1).toEqual(table2);
				}),
				{ numRuns: Math.max(numRuns, 500) },
			);
		},
		PBT_TIMEOUT,
	);

	it(
		"every extracted component name matches its source file",
		() => {
			fc.assert(
				fc.property(arbFileTree(), (files) => {
					fc.pre(Object.keys(files).length > 0);
					const table = extractSymbols(files);
					const sources = sourcePathsWithTsxVariants(files);

					for (const comp of table.components) {
						expect(comp.name).toBe(componentNameFromPath(comp.filePath));
						expect(sources.has(comp.filePath)).toBe(true);
					}
				}),
				{ numRuns: Math.max(numRuns, 500) },
			);
		},
		PBT_TIMEOUT,
	);
});
