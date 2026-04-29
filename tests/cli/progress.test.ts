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

	it("quiet mode: all methods are no-ops, no errors thrown", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: true });
		expect(() => {
			reporter.start("test");
			reporter.update("test");
			reporter.succeed("test");
			reporter.succeed();
			reporter.fail("test");
			reporter.fail();
			reporter.warn("test");
			reporter.info("test");
			reporter.stop();
			reporter.startPhase("discovery", 5);
		}).not.toThrow();
	});

	it("non-TTY: creates no-op reporter, no errors", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: undefined },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.start("test");
			reporter.update("test");
			reporter.succeed("test");
			reporter.fail("test");
			reporter.warn("test");
			reporter.info("test");
			reporter.stop();
			reporter.startPhase("parsing", 10);
		}).not.toThrow();
	});

	it("TTY mode: all methods work without throwing", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.start("loading");
			reporter.update("processing");
			reporter.succeed("done");
			reporter.start("loading2");
			reporter.fail("error");
			reporter.start("loading3");
			reporter.warn("careful");
			reporter.info("fyi");
			reporter.stop();
		}).not.toThrow();
	});

	it("startPhase maps phase names to labels", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
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
		}).not.toThrow();
	});

	it("startPhase shows file count when count > 0", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.startPhase("discovery", 42);
			reporter.succeed();
			reporter.startPhase("parsing", 1);
			reporter.succeed();
		}).not.toThrow();
	});

	it("startPhase falls back to phase name for unknown phases", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.startPhase("unknown-phase", 5);
			reporter.succeed();
		}).not.toThrow();
	});

	it("start reuses existing spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.start("first");
			reporter.start("second");
			reporter.succeed();
		}).not.toThrow();
	});

	it("startPhase reuses existing spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.startPhase("discovery", 0);
			reporter.startPhase("parsing", 5);
			reporter.succeed();
		}).not.toThrow();
	});

	it("warn and info work after start", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.start("loading");
			reporter.warn("warning msg");
			reporter.start("loading2");
			reporter.info("info msg");
		}).not.toThrow();
	});

	it("stop clears spinner", () => {
		vi.stubGlobal("process", {
			...process,
			stdout: { ...process.stdout, isTTY: true },
		});
		const reporter = createProgressReporter({ quiet: false });
		expect(() => {
			reporter.start("loading");
			reporter.stop();
			reporter.start("after-stop");
			reporter.succeed();
		}).not.toThrow();
	});
});
