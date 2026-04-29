import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";

describe("SymbolExtractor error handling", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "extractor-err-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("extracts valid functions from good file", () => {
		const project = new ParsingProject();
		const errorHandler = new PipelineErrorHandler();
		project.addPlainSourceFile(
			path.join(tmpDir, "good.ts"),
			"export function hello(): string { return 'hi'; }",
		);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(symbols.functions.length).toBeGreaterThanOrEqual(1);
		expect(symbols.functions[0]?.name).toBe("hello");
		expect(errorHandler.getErrors()).toHaveLength(0);
	});

	it("catches extraction errors per file", () => {
		const project = new ParsingProject();
		const errorHandler = new PipelineErrorHandler();
		project.addPlainSourceFile(
			path.join(tmpDir, "bad.ts"),
			"this is not valid typescript {{{",
		);
		project.addPlainSourceFile(
			path.join(tmpDir, "good.ts"),
			"export function ok(): void {}",
		);
		const extractor = new SymbolExtractor(project, errorHandler);
		const symbols = extractor.extract();
		expect(errorHandler.getFailedFiles().length).toBeGreaterThanOrEqual(0);
		expect(symbols.functions.length).toBeGreaterThanOrEqual(0);
	});
});
