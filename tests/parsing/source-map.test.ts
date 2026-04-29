import { describe, expect, it } from "vitest";
import {
	contentHash,
	decodeVLQMappings,
	SourceMapDecoder,
	type SourcePosition,
} from "../../src/parsing/source-map.js";

describe("decodeVLQMappings", () => {
	it("decodes an empty mappings string", () => {
		expect(decodeVLQMappings("")).toEqual([]);
	});

	it("decodes a single-segment single-line mapping", () => {
		const segments = decodeVLQMappings("AAAA");
		expect(segments.length).toBe(1);
		expect(segments[0]).toEqual({
			generatedLine: 0,
			generatedColumn: 0,
			sourceFileIndex: 0,
			sourceLine: 0,
			sourceColumn: 0,
		});
	});

	it("decodes multiple segments in one line (comma-separated)", () => {
		// C = VLQ 1 (colDelta), A=0, A=0, E=2 (srcColDelta)
		const segments = decodeVLQMappings("AAAA,CAAE");
		expect(segments.length).toBe(2);
		expect(segments[0]?.generatedColumn).toBe(0);
		expect(segments[1]?.generatedColumn).toBe(1);
	});

	it("decodes multiple lines (semicolon-separated)", () => {
		const segments = decodeVLQMappings("AAAA;CAAE");
		expect(segments.length).toBe(2);
		expect(segments[0]?.generatedLine).toBe(0);
		expect(segments[1]?.generatedLine).toBe(1);
	});

	it("handles empty lines (consecutive semicolons)", () => {
		const segments = decodeVLQMappings("AAAA;;CAAE");
		expect(segments.length).toBe(2);
		expect(segments[0]?.generatedLine).toBe(0);
		expect(segments[1]?.generatedLine).toBe(2);
	});

	it("handles negative deltas in VLQ", () => {
		// F = VLQ -2 (srcIdxDelta), negative via sign bit
		const segments = decodeVLQMappings("AAAA,CFAA");
		expect(segments.length).toBe(2);
		expect(segments[0]?.sourceLine).toBe(0);
		expect(segments[1]?.sourceFileIndex).toBe(-2);
	});
});

describe("SourceMapDecoder", () => {
	it("returns undefined for empty source map", () => {
		const decoder = new SourceMapDecoder({});
		expect(decoder.originalPositionFor({ line: 1, column: 0 })).toBeUndefined();
	});

	it("maps a generated position back to original source", () => {
		const decoder = new SourceMapDecoder({
			sources: ["App.svelte"],
			mappings: "AAAA",
		});

		const result = decoder.originalPositionFor({ line: 1, column: 0 });
		expect(result).toEqual({
			source: "App.svelte",
			line: 1,
			column: 1,
		});
	});

	it("returns undefined for positions with no mapping", () => {
		const decoder = new SourceMapDecoder({
			sources: ["App.svelte"],
			mappings: "AAAA",
		});

		const result = decoder.originalPositionFor({ line: 5, column: 0 });
		expect(result).toBeUndefined();
	});

	it("finds the nearest mapping via binary search", () => {
		const decoder = new SourceMapDecoder({
			sources: ["App.svelte"],
			mappings: "AAAA,CAAE",
		});

		const at0 = decoder.originalPositionFor({ line: 1, column: 0 });
		expect(at0?.column).toBe(1);

		const at1 = decoder.originalPositionFor({ line: 1, column: 2 });
		expect(at1?.column).toBe(3);
	});

	it("handles missing source file gracefully", () => {
		const decoder = new SourceMapDecoder({
			sources: [],
			mappings: "AAAA",
		});

		const result = decoder.originalPositionFor({ line: 1, column: 0 });
		expect(result?.source).toBe("");
	});

	it("binary search navigates left when target column is before mid", () => {
		const decoder = new SourceMapDecoder({
			sources: ["App.svelte"],
			mappings: "AAAA;;KAAE",
		});

		const result = decoder.originalPositionFor({ line: 2, column: 0 });
		expect(result).toBeUndefined();
	});

	it("binary search returns undefined for position before all segments", () => {
		const decoder = new SourceMapDecoder({
			sources: ["App.svelte"],
			mappings: "KAAE",
		});

		const result = decoder.originalPositionFor({ line: 1, column: 0 });
		expect(result).toBeUndefined();
	});
});

describe("contentHash", () => {
	it("returns a 16-character hex string", () => {
		const hash = contentHash("hello world");
		expect(hash).toHaveLength(16);
		expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
	});

	it("produces the same hash for the same input", () => {
		expect(contentHash("test content")).toBe(contentHash("test content"));
	});

	it("produces different hashes for different inputs", () => {
		expect(contentHash("content a")).not.toBe(contentHash("content b"));
	});
});
