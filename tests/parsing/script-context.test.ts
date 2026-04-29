import { describe, expect, it } from "vitest";
import { getContextForLine, parseScriptContexts } from "../../src/parsing/script-context.js";

describe("parseScriptContexts", () => {
	it("returns 0 blocks for empty file", () => {
		const result = parseScriptContexts("");
		expect(result.blocks).toHaveLength(0);
	});

	it("returns 0 blocks for file with no scripts", () => {
		const result = parseScriptContexts("<div>Hello</div>");
		expect(result.blocks).toHaveLength(0);
	});

	it("detects instance script only", () => {
		const content = ["<script>", "  let count = 0;", "</script>", "<div>{count}</div>"].join("\n");
		const result = parseScriptContexts(content);
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.context).toBe("instance");
	});

	it("detects module script only", () => {
		const content = ['<script context="module">', "  export const data = {};", "</script>"].join(
			"\n",
		);
		const result = parseScriptContexts(content);
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.context).toBe("module");
	});

	it("detects both module and instance scripts", () => {
		const content = [
			'<script context="module">',
			"  export const preload = {};",
			"</script>",
			"",
			"<script>",
			"  let count = 0;",
			"</script>",
		].join("\n");
		const result = parseScriptContexts(content);
		expect(result.blocks).toHaveLength(2);
		expect(result.blocks[0]?.context).toBe("module");
		expect(result.blocks[1]?.context).toBe("instance");
	});

	it("detects module script with lang='ts'", () => {
		const content = [
			'<script context="module" lang="ts">',
			"  export const data: Record<string, unknown> = {};",
			"</script>",
		].join("\n");
		const result = parseScriptContexts(content);
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.context).toBe("module");
	});

	it("sets correct startLine and endLine", () => {
		const content = ["<script>", "  let x = 1;", "</script>"].join("\n");
		const result = parseScriptContexts(content);
		expect(result.blocks[0]?.startLine).toBe(1);
		expect(result.blocks[0]?.endLine).toBe(3);
	});

	it("handles single-quoted context attribute", () => {
		const content = ["<script context='module'>", "  export const x = 1;", "</script>"].join("\n");
		const result = parseScriptContexts(content);
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0]?.context).toBe("module");
	});
});

describe("getContextForLine", () => {
	const content = [
		'<script context="module">', // line 1
		"  export const data = {};", // line 2
		"</script>", // line 3
		"", // line 4
		"<script>", // line 5
		"  let count = 0;", // line 6
		"</script>", // line 7
	].join("\n");
	const map = parseScriptContexts(content);

	it("returns module for lines inside module script", () => {
		expect(getContextForLine(map, 1)).toBe("module");
		expect(getContextForLine(map, 2)).toBe("module");
		expect(getContextForLine(map, 3)).toBe("module");
	});

	it("returns instance for lines inside instance script", () => {
		expect(getContextForLine(map, 5)).toBe("instance");
		expect(getContextForLine(map, 6)).toBe("instance");
		expect(getContextForLine(map, 7)).toBe("instance");
	});

	it("returns undefined for lines outside any script", () => {
		expect(getContextForLine(map, 4)).toBeUndefined();
		expect(getContextForLine(map, 0)).toBeUndefined();
		expect(getContextForLine(map, 10)).toBeUndefined();
	});
});
