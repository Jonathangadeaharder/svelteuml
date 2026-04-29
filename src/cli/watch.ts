import { watch } from "chokidar";
import type { FSWatcher } from "chokidar";
import type { CliOptions } from "./args.js";
import type { ProgressReporter } from "./progress.js";
import { runPipeline } from "./runner.js";

export interface Watcher {
	close(): Promise<void>;
	on(event: "change", callback: (file: string) => void): void;
}

type ChangeCallback = (file: string) => void;

const IGNORED_PATTERNS = [
	"**/node_modules/**",
	"**/.svelte-kit/**",
	"**/dist/**",
	"**/.git/**",
];

export function startWatcher(
	cliOpts: CliOptions,
	fileConfig: Record<string, unknown>,
	reporter?: ProgressReporter,
): Watcher {
	const callbacks: ChangeCallback[] = [];
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const chokidarWatcher: FSWatcher = watch(cliOpts.targetDir, {
		ignored: IGNORED_PATTERNS,
		ignoreInitial: true,
		persistent: true,
	});

	const triggerChange = (file: string) => {
		if (debounceTimer !== undefined) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			debounceTimer = undefined;
			for (const cb of callbacks) {
				cb(file);
			}
			runPipeline(cliOpts, fileConfig, reporter);
		}, 500);
	};

	chokidarWatcher.on("add", triggerChange);
	chokidarWatcher.on("change", triggerChange);
	chokidarWatcher.on("unlink", triggerChange);

	return {
		on(event: "change", callback: ChangeCallback) {
			if (event === "change") {
				callbacks.push(callback);
			}
		},
		async close() {
			if (debounceTimer !== undefined) {
				clearTimeout(debounceTimer);
				debounceTimer = undefined;
			}
			await chokidarWatcher.close();
		},
	};
}
