import { createHash } from "node:crypto";

/**
 * E1.4 — Source-map preservation: tsx position → original .svelte position.
 *
 * svelte2tsx emits a source map when converting .svelte → .tsx. This module
 * provides utilities to decode that source map and map positions back to
 * the original .svelte file, so symbol locations in the AST can be traced
 * back to the user's source code.
 */

export interface SourcePosition {
	readonly line: number;
	readonly column: number;
}

export interface MappedPosition {
	readonly source: string;
	readonly line: number;
	readonly column: number;
}

/** Raw VLQ segment from a source map. */
interface SourceMapSegment {
	generatedLine: number;
	generatedColumn: number;
	sourceFileIndex: number;
	sourceLine: number;
	sourceColumn: number;
}

/**
 * Minimal source map consumer that supports the standard Source Map v3 format.
 * Uses the VLQ encoding to decode mappings and supports binary-search lookups.
 */
export class SourceMapDecoder {
	private segments: SourceMapSegment[] = [];
	private sources: string[] = [];

	constructor(sourceMap: {
		sources?: string[];
		mappings?: string;
	}) {
		this.sources = sourceMap.sources ?? [];
		if (sourceMap.mappings) {
			this.segments = decodeVLQMappings(sourceMap.mappings);
		}
	}

	/**
	 * Map a generated (tsx) position back to the original source position.
	 * Returns undefined if the position cannot be mapped (e.g., generated code
	 * with no original source, like svelte2tsx boilerplate).
	 */
	originalPositionFor(generated: SourcePosition): MappedPosition | undefined {
		if (this.segments.length === 0) return undefined;

		const targetLine = generated.line - 1;
		const targetColumn = generated.column;

		let lo = 0;
		let hi = this.segments.length - 1;
		let best: SourceMapSegment | undefined;

		while (lo <= hi) {
			const mid = (lo + hi) >>> 1;
			const seg = this.segments.at(mid);

			if (seg === undefined) break;

			if (seg.generatedLine < targetLine) {
				lo = mid + 1;
			} else if (seg.generatedLine > targetLine) {
				hi = mid - 1;
			} else {
				if (seg.generatedColumn <= targetColumn) {
					best = seg;
					lo = mid + 1;
				} else {
					hi = mid - 1;
				}
			}
		}

		if (best === undefined || best.sourceFileIndex < 0) return undefined;

		return {
			source: this.sources.at(best.sourceFileIndex) ?? "",
			line: best.sourceLine + 1,
			column: best.sourceColumn + 1,
		};
	}
}

/**
 * Decode a VLQ-encoded source map "mappings" string into an array of segments.
 * Each line in the mappings is separated by ';', segments within a line by ','.
 *
 * VLQ decoding follows the Source Map v3 spec:
 * - Continuation bit: bit 5 (0x20)
 * - Value bits: bits 0–4 (0x1F)
 * - Sign bit: bit 0 of the decoded value
 */
export function decodeVLQMappings(mappings: string): SourceMapSegment[] {
	const segments: SourceMapSegment[] = [];
	const lines = mappings.split(";");

	// Running state (delta-encoded, accumulates across segments)
	let generatedLine = 0;
	let generatedColumn = 0;
	let sourceFileIndex = 0;
	let sourceLine = 0;
	let sourceColumn = 0;

	for (const line of lines) {
		generatedColumn = 0;
		if (line.length === 0) {
			generatedLine++;
			continue;
		}

		const segStrings = line.split(",");
		for (const segStr of segStrings) {
			if (segStr.length === 0) continue;

			const fields = decodeVLQSegment(segStr);
			if (fields.length === 0) continue;

			const [colDelta = 0, srcIdxDelta = 0, srcLineDelta = 0, srcColDelta = 0] = fields;
			generatedColumn += colDelta;

			if (fields.length >= 4) {
				sourceFileIndex += srcIdxDelta;
				sourceLine += srcLineDelta;
				sourceColumn += srcColDelta;

				segments.push({
					generatedLine,
					generatedColumn,
					sourceFileIndex,
					sourceLine,
					sourceColumn,
				});
			}
		}

		generatedLine++;
	}

	return segments;
}

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_MAP = new Map<string, number>();
for (let i = 0; i < BASE64_CHARS.length; i++) {
	BASE64_MAP.set(BASE64_CHARS.charAt(i), i);
}

function decodeVLQSegment(segment: string): number[] {
	const result: number[] = [];
	let i = 0;

	while (i < segment.length) {
		let value = 0;
		let shift = 0;
		let continuation = false;

		do {
			const char = segment.charAt(i);
			i++;
			const digit = BASE64_MAP.get(char);
			if (digit === undefined) {
				throw new Error(`Invalid base64 character in source map: ${char}`);
			}
			continuation = (digit & VLQ_CONTINUATION_BIT) !== 0;
			value += (digit & VLQ_BASE_MASK) << shift;
			shift += VLQ_BASE_SHIFT;
		} while (continuation);

		// The low bit is the sign
		const isNegative = (value & 1) !== 0;
		value >>>= 1;
		result.push(isNegative ? -value : value);
	}

	return result;
}

/**
 * E1.5 — Compute a content hash for cache invalidation.
 * Uses SHA-256 truncated to 16 hex chars (64 bits of entropy).
 */
export function contentHash(content: string): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
