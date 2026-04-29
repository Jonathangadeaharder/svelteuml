import { describe, expect, it } from "vitest";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";

describe("PipelineErrorHandler", () => {
	it("starts with zero errors", () => {
		const handler = new PipelineErrorHandler();
		expect(handler.getErrors()).toHaveLength(0);
		expect(handler.getFailedFiles()).toHaveLength(0);
	});

	it("adds and retrieves errors", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({
			file: "/src/lib/Broken.svelte",
			phase: "parsing",
			message: "Unexpected token",
		});
		expect(handler.getErrors()).toHaveLength(1);
		expect(handler.getErrors()[0]?.file).toBe("/src/lib/Broken.svelte");
		expect(handler.getErrors()[0]?.phase).toBe("parsing");
	});

	it("returns deduplicated failed file paths", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "err1" });
		handler.addError({ file: "/b.svelte", phase: "extraction", message: "err2" });
		handler.addError({ file: "/a.svelte", phase: "extraction", message: "err3" });
		const failed = handler.getFailedFiles();
		expect(failed).toHaveLength(2);
		expect(failed).toContain("/a.svelte");
		expect(failed).toContain("/b.svelte");
	});

	it("filters errors by phase", () => {
		const handler = new PipelineErrorHandler();
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "err1" });
		handler.addError({ file: "/b.svelte", phase: "extraction", message: "err2" });
		expect(handler.getErrorsForPhase("parsing")).toHaveLength(1);
		expect(handler.getErrorsForPhase("extraction")).toHaveLength(1);
		expect(handler.getErrorsForPhase("discovery")).toHaveLength(0);
	});

	it("formats summary without verbose", () => {
		const handler = new PipelineErrorHandler(false);
		handler.addError({ file: "/a.svelte", phase: "parsing", message: "Unexpected token" });
		handler.addError({ file: "/b.ts", phase: "extraction", message: "Bad AST" });
		const summary = handler.getSummary();
		expect(summary).toContain("2 error(s)");
		expect(summary).toContain("/a.svelte");
		expect(summary).toContain("/b.ts");
		expect(summary).toContain("parsing: 1");
		expect(summary).toContain("extraction: 1");
	});

	it("formats summary with verbose stacks", () => {
		const handler = new PipelineErrorHandler(true);
		handler.addError({
			file: "/a.svelte",
			phase: "parsing",
			message: "Unexpected token",
			stack: "Error: Unexpected token\n  at convertSvelteToTsx (svelte-to-tsx.ts:61:5)",
		});
		const summary = handler.getSummary();
		expect(summary).toContain("Error: Unexpected token");
		expect(summary).toContain("at convertSvelteToTsx");
	});

	it("returns empty summary when no errors", () => {
		const handler = new PipelineErrorHandler();
		expect(handler.getSummary()).toBe("");
	});
});
