import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { SvelteToTsxResult } from "./svelte-to-tsx.js";

export interface CacheEntry {
	readonly contentHash: string;
	readonly result: SvelteToTsxResult;
	readonly mtimeMs: number;
}

function computeContentHash(content: string): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export class ConversionCache {
	private cache = new Map<string, CacheEntry>();

	has(filePath: string): boolean {
		const entry = this.cache.get(filePath);
		if (entry === undefined) return false;
		try {
			const content = readFileSync(filePath, "utf-8");
			return entry.contentHash === computeContentHash(content);
		} catch {
			return false;
		}
	}

	get(filePath: string): SvelteToTsxResult | undefined {
		const entry = this.cache.get(filePath);
		if (entry === undefined) return undefined;
		try {
			const content = readFileSync(filePath, "utf-8");
			if (entry.contentHash === computeContentHash(content)) {
				return entry.result;
			}
			return undefined;
		} catch {
			return undefined;
		}
	}

	set(filePath: string, result: SvelteToTsxResult): void {
		try {
			const content = readFileSync(filePath, "utf-8");
			const stats = statSync(filePath);
			this.cache.set(filePath, {
				contentHash: computeContentHash(content),
				result,
				mtimeMs: stats.mtimeMs,
			});
		} catch {
			this.cache.set(filePath, { contentHash: "", result, mtimeMs: 0 });
		}
	}

	computeHash(content: string): string {
		return computeContentHash(content);
	}

	static async computeHash(
		filePath: string,
	): Promise<{ hash: string; mtimeMs: number }> {
		try {
			const content = await readFile(filePath, "utf-8");
			const stats = await stat(filePath);
			return {
				hash: computeContentHash(content),
				mtimeMs: stats.mtimeMs,
			};
		} catch {
			return { hash: "", mtimeMs: 0 };
		}
	}

	evict(filePath: string): void {
		this.cache.delete(filePath);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}
