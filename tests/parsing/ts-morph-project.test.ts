import { describe, expect, it } from "vitest";
import type { SvelteToTsxResult } from "../../src/parsing/svelte-to-tsx.js";
import { buildParsingProject, ParsingProject } from "../../src/parsing/ts-morph-project.js";

function makeResult(
	sourcePath: string,
	virtualPath: string,
	tsxCode: string,
	success: boolean,
): SvelteToTsxResult {
	return {
		sourcePath,
		virtualPath,
		tsxCode,
		sourceMap: undefined,
		success,
		...(success ? {} : { error: { message: "conversion failed" } }),
	};
}

describe("ParsingProject", () => {
	it("adds a converted file and retrieves it", () => {
		const project = new ParsingProject();
		const result = makeResult(
			"/app/src/Comp.svelte",
			"/app/src/Comp.svelte.tsx",
			"export default function Render() { return <div />; }",
			true,
		);

		const sf = project.addConvertedFile(result);
		expect(sf).toBeDefined();
		expect(sf.getFilePath()).toContain("Comp.svelte.tsx");

		expect(project.getSourceFile("/app/src/Comp.svelte")).toBe(sf);
		expect(project.getOriginalPath("/app/src/Comp.svelte.tsx")).toBe("/app/src/Comp.svelte");
	});

	it("adds a plain source file and retrieves it", () => {
		const project = new ParsingProject();
		const sf = project.addPlainSourceFile(
			"/app/src/utils.ts",
			"export function add(a: number, b: number): number { return a + b; }",
		);

		expect(sf).toBeDefined();
		expect(project.getSourceFile("/app/src/utils.ts")).toBe(sf);
		expect(project.getOriginalPath("/app/src/utils.ts")).toBe("/app/src/utils.ts");
	});

	it("throws when adding a failed conversion", () => {
		const project = new ParsingProject();
		const result = makeResult("/app/src/Bad.svelte", "/app/src/Bad.svelte.tsx", "", false);

		expect(() => project.addConvertedFile(result)).toThrow(/Cannot add failed conversion/);
	});

	it("resolves original file from virtual path", () => {
		const project = new ParsingProject();
		project.addConvertedFile(
			makeResult("/app/src/Comp.svelte", "/app/src/Comp.svelte.tsx", "code", true),
		);

		expect(project.resolveOriginalFile("/app/src/Comp.svelte.tsx")).toBe("/app/src/Comp.svelte");
		expect(project.resolveOriginalFile("/app/src/unknown.tsx")).toBeUndefined();
	});

	it("returns all source files", () => {
		const project = new ParsingProject();
		project.addConvertedFile(makeResult("/app/src/A.svelte", "/app/src/A.svelte.tsx", "a", true));
		project.addPlainSourceFile("/app/src/b.ts", "export const b = 1;");

		expect(project.getAllSourceFiles().size).toBe(2);
	});

	it("exposes underlying ts-morph project", () => {
		const project = new ParsingProject();
		expect(project.getProject()).toBeDefined();
		expect(project.getProject().getCompilerOptions().strict).toBe(true);
	});

	it("creates project with aliases configured in compiler options", () => {
		const aliases = { $lib: "/app/src/lib", $components: "/app/src/components" };
		const project = new ParsingProject(undefined, aliases);
		const paths = project.getProject().getCompilerOptions().paths;
		expect(paths).toBeDefined();
		expect(paths?.["$lib/*"]).toEqual(["/app/src/lib/*"]);
		expect(paths?.["$components"]).toEqual(["/app/src/components"]);
	});

	it("creates project with empty aliases (no paths)", () => {
		const project = new ParsingProject(undefined, {});
		const paths = project.getProject().getCompilerOptions().paths;
		expect(paths).toBeUndefined();
	});
});

describe("buildParsingProject", () => {
	it("builds project from svelte results and plain files", () => {
		const svelteResults: SvelteToTsxResult[] = [
			makeResult(
				"/app/src/A.svelte",
				"/app/src/A.svelte.tsx",
				"export default function A() {}",
				true,
			),
			makeResult(
				"/app/src/B.svelte",
				"/app/src/B.svelte.tsx",
				"export default function B() {}",
				true,
			),
		];
		const plainFiles = [{ path: "/app/src/utils.ts", content: "export const x = 1;" }];

		const project = buildParsingProject(svelteResults, plainFiles);

		expect(project.getAllSourceFiles().size).toBe(3);
		expect(project.getSourceFile("/app/src/A.svelte")).toBeDefined();
		expect(project.getSourceFile("/app/src/B.svelte")).toBeDefined();
		expect(project.getSourceFile("/app/src/utils.ts")).toBeDefined();
	});

	it("skips failed svelte results", () => {
		const svelteResults: SvelteToTsxResult[] = [
			makeResult("/app/src/Good.svelte", "/app/src/Good.svelte.tsx", "code", true),
			makeResult("/app/src/Bad.svelte", "/app/src/Bad.svelte.tsx", "", false),
		];
		const plainFiles: Array<{ path: string; content: string }> = [];

		const project = buildParsingProject(svelteResults, plainFiles);

		expect(project.getAllSourceFiles().size).toBe(1);
		expect(project.getSourceFile("/app/src/Good.svelte")).toBeDefined();
	});
});
