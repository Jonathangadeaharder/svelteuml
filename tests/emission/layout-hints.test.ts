import { describe, expect, it } from "vitest";
import { renderLayoutDirective } from "../../src/emission/layout-hints.js";

describe("renderLayoutDirective", () => {
	it("renders top-to-bottom", () => {
		expect(renderLayoutDirective("top-to-bottom")).toBe("top to bottom direction");
	});

	it("renders left-to-right", () => {
		expect(renderLayoutDirective("left-to-right")).toBe("left to right direction");
	});

	it("renders bottom-to-top", () => {
		expect(renderLayoutDirective("bottom-to-top")).toBe("bottom to top direction");
	});

	it("renders right-to-left", () => {
		expect(renderLayoutDirective("right-to-left")).toBe("right to left direction");
	});

	it("returns empty string for unknown direction", () => {
		expect(renderLayoutDirective("diagonal" as any)).toBe("");
	});
});
