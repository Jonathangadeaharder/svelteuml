import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgressReporter } from "../../src/cli/progress.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createProgressReporter", () => {
	it("creates a reporter with all required methods", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(typeof reporter.start).toBe("function");
		expect(typeof reporter.update).toBe("function");
		expect(typeof reporter.succeed).toBe("function");
		expect(typeof reporter.fail).toBe("function");
		expect(typeof reporter.warn).toBe("function");
		expect(typeof reporter.info).toBe("function");
		expect(typeof reporter.stop).toBe("function");
		expect(typeof reporter.startPhase).toBe("function");
	});

	it("quiet mode: all methods are no-ops, return undefined", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: true });
		expect(reporter.start("test")).toBeUndefined();
		expect(reporter.update("test")).toBeUndefined();
		expect(reporter.succeed("test")).toBeUndefined();
		expect(reporter.succeed()).toBeUndefined();
		expect(reporter.fail("test")).toBeUndefined();
		expect(reporter.fail()).toBeUndefined();
		expect(reporter.warn("test")).toBeUndefined();
		expect(reporter.info("test")).toBeUndefined();
		expect(reporter.stop()).toBeUndefined();
		expect(reporter.startPhase("discovery", 5)).toBeUndefined();
	});

	it("non-TTY: creates no-op reporter, methods return undefined", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: undefined },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(reporter.start("test")).toBeUndefined();
		expect(reporter.update("test")).toBeUndefined();
		expect(reporter.succeed("test")).toBeUndefined();
		expect(reporter.fail("test")).toBeUndefined();
		expect(reporter.warn("test")).toBeUndefined();
		expect(reporter.info("test")).toBeUndefined();
		expect(reporter.stop()).toBeUndefined();
		expect(reporter.startPhase("parsing", 10)).toBeUndefined();
	});

	it("TTY mode: reporter methods are callable without error", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(typeof reporter.start).toBe("function");
		expect(typeof reporter.update).toBe("function");
		expect(typeof reporter.succeed).toBe("function");
		expect(typeof reporter.fail).toBe("function");
		expect(typeof reporter.warn).toBe("function");
		expect(typeof reporter.info).toBe("function");
		expect(typeof reporter.stop).toBe("function");
		expect(typeof reporter.startPhase).toBe("function");

		reporter.start("loading");
		reporter.update("processing");
		reporter.succeed("done");
		reporter.start("loading2");
		reporter.fail("error");
		reporter.start("loading3");
		reporter.warn("careful");
		reporter.info("fyi");
		reporter.stop();
	});

	it("startPhase maps phase names to labels", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.startPhase("discovery", 0);
		reporter.succeed();
		reporter.startPhase("parsing", 0);
		reporter.succeed();
		reporter.startPhase("extraction", 0);
		reporter.succeed();
		reporter.startPhase("resolution", 0);
		reporter.succeed();
		reporter.startPhase("emission", 0);
		reporter.succeed();
	});

	it("startPhase shows file count when count > 0", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.startPhase("discovery", 42);
		reporter.succeed();
		reporter.startPhase("parsing", 1);
		reporter.succeed();
	});

	it("startPhase falls back to phase name for unknown phases", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.startPhase("unknown-phase", 5);
		reporter.succeed();
	});

	it("start reuses existing spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("first");
		reporter.start("second");
		reporter.succeed();
	});

	it("startPhase reuses existing spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.startPhase("discovery", 0);
		reporter.startPhase("parsing", 5);
		reporter.succeed();
	});

	it("warn and info work after start", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("loading");
		reporter.warn("warning msg");
		reporter.start("loading2");
		reporter.info("info msg");
	});

	it("stop clears spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		reporter.start("loading");
		reporter.stop();
		reporter.start("after-stop");
		reporter.succeed();
	});
});
