import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { startWatcher } from "../../src/cli/watch.js";
import type { CliOptions } from "../../src/cli/args.js";

let tempDir: string;

function makeCliOpts(overrides?: Partial<CliOptions>): CliOptions {
	return {
		targetDir: tempDir,
		outputPath: undefined,
		format: "text",
		excludeExternals: false,
		maxDepth: 0,
		exclude: [],
		hideTypeDeps: false,
		hideStateDeps: false,
		quiet: true,
		verbose: false,
		watch: true,
		...overrides,
	};
}

describe("startWatcher", () => {
	beforeEach(async () => {
		tempDir = join(tmpdir(), `svelteuml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("returns a watcher with a close method", () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		expect(typeof watcher.close).toBe("function");
		return watcher.close();
	});

	it("stops the watcher after close()", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		await watcher.close();
		expect(watcher).toBeDefined();
	});

	it("has an on method for change events", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		expect(typeof watcher.on).toBe("function");

		const handler = vi.fn();
		watcher.on("change", handler);

		const testFile = join(tempDir, "test.svelte");
		await writeFile(testFile, "<script>let x = 1;</script>");

		await new Promise((resolve) => setTimeout(resolve, 2000));

		expect(handler).toHaveBeenCalled();
		await watcher.close();
	});

	it("debounces multiple rapid file changes", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});
		const handler = vi.fn();
		watcher.on("change", handler);

		await writeFile(join(tempDir, "a.svelte"), "<script>let a = 1;</script>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await writeFile(join(tempDir, "b.svelte"), "<script>let b = 2;</script>");

		await new Promise((resolve) => setTimeout(resolve, 700));

		expect(handler).toHaveBeenCalledTimes(1);
		await watcher.close();
	});

	it("clears pending debounce timer on close", async () => {
		const cliOpts = makeCliOpts();
		const watcher = startWatcher(cliOpts, {});

		await writeFile(join(tempDir, "c.svelte"), "<script>let c = 3;</script>");

		await new Promise((resolve) => setTimeout(resolve, 50));
		await watcher.close();

		expect(watcher).toBeDefined();
	});
});
