import type { Ora } from "ora";
import ora from "ora";

export interface ProgressReporter {
	start(text: string): void;
	update(text: string): void;
	succeed(text?: string): void;
	fail(text?: string): void;
	warn(text: string): void;
	info(text: string): void;
	stop(): void;
	startPhase(phase: string, count: number): void;
}

const PHASE_LABELS: Record<string, string> = {
	discovery: "Discovering files",
	parsing: "Parsing files",
	extraction: "Extracting symbols",
	resolution: "Resolving dependencies",
	emission: "Generating diagram",
};

interface ProgressOptions {
	quiet: boolean;
}

function createNoOpReporter(): ProgressReporter {
	return {
		start() {},
		update() {},
		succeed() {},
		fail() {},
		warn() {},
		info() {},
		stop() {},
		startPhase() {},
	};
}

function createOraReporter(): ProgressReporter {
	let spinner: Ora | undefined;

	return {
		start(text: string) {
			if (spinner) {
				spinner.start(text);
			} else {
				spinner = ora(text).start();
			}
		},
		update(text: string) {
			spinner?.start(text);
		},
		succeed(text?: string) {
			spinner?.succeed(text);
			spinner = undefined;
		},
		fail(text?: string) {
			spinner?.fail(text);
			spinner = undefined;
		},
		warn(text: string) {
			spinner?.warn(text);
			spinner = undefined;
		},
		info(text: string) {
			spinner?.info(text);
			spinner = undefined;
		},
		stop() {
			spinner?.stop();
			spinner = undefined;
		},
		startPhase(phase: string, count: number) {
			const label = PHASE_LABELS[phase] ?? phase;
			const text = count > 0 ? `${label} (${count} files)` : label;
			if (spinner) {
				spinner.start(text);
			} else {
				spinner = ora(text).start();
			}
		},
	};
}

export function createProgressReporter(options: ProgressOptions): ProgressReporter {
	if (options.quiet || !process.stdout.isTTY) {
		return createNoOpReporter();
	}
	return createOraReporter();
}
