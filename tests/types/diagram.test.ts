import { describe, it, expect } from "vitest";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";
import type { DiagramKind, DiagramOptions } from "../../src/types/diagram.js";

describe("src/types/diagram.ts", () => {
	describe("DiagramKind", () => {
		it("accepts class kind", () => {
			const kind: DiagramKind = "class";
			expect(kind).toBe("class");
		});

		it("accepts package kind", () => {
			const kind: DiagramKind = "package";
			expect(kind).toBe("package");
		});
	});

	describe("DEFAULT_DIAGRAM_OPTIONS", () => {
		it("defaults to class diagram kind", () => {
			expect(DEFAULT_DIAGRAM_OPTIONS.kind).toBe("class");
		});

		it("enables all visibility options by default", () => {
			expect(DEFAULT_DIAGRAM_OPTIONS.showMembers).toBe(true);
			expect(DEFAULT_DIAGRAM_OPTIONS.showMethods).toBe(true);
			expect(DEFAULT_DIAGRAM_OPTIONS.showVisibility).toBe(true);
			expect(DEFAULT_DIAGRAM_OPTIONS.showStores).toBe(true);
			expect(DEFAULT_DIAGRAM_OPTIONS.showProps).toBe(true);
		});

		it("does not hide empty packages by default", () => {
			expect(DEFAULT_DIAGRAM_OPTIONS.hideEmptyPackages).toBe(false);
		});

		it("has no default title", () => {
			expect(DEFAULT_DIAGRAM_OPTIONS.title).toBeUndefined();
		});
	});

	describe("DiagramOptions", () => {
		it("allows overriding all defaults", () => {
			const opts: DiagramOptions = {
				kind: "package",
				showMembers: false,
				showMethods: false,
				showVisibility: false,
				showStores: false,
				showProps: false,
				hideEmptyPackages: true,
				title: "My Diagram",
			};
			expect(opts.kind).toBe("package");
			expect(opts.title).toBe("My Diagram");
			expect(opts.hideEmptyPackages).toBe(true);
		});

		it("allows partial overrides spread from defaults", () => {
			const opts: DiagramOptions = {
				...DEFAULT_DIAGRAM_OPTIONS,
				kind: "package",
				title: "Custom",
			};
			expect(opts.kind).toBe("package");
			expect(opts.title).toBe("Custom");
			expect(opts.showMembers).toBe(true);
		});
	});
});
