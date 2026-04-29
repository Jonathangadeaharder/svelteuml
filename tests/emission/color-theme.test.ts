import { describe, expect, it } from "vitest";
import { renderColorLegend, renderColorTheme } from "../../src/emission/color-theme.js";

describe("renderColorTheme", () => {
	it("returns empty string for empty colors", () => {
		expect(renderColorTheme({})).toBe("");
	});

	it("renders skinparam blocks for each stereotype", () => {
		const colors = { component: "#4A90D9", store: "#E67E22" };
		const result = renderColorTheme(colors);
		expect(result).toContain("skinparam class<<component>>");
		expect(result).toContain("BackgroundColor #4A90D9");
		expect(result).toContain("skinparam class<<store>>");
		expect(result).toContain("BackgroundColor #E67E22");
	});

	it("renders all default stereotype colors", () => {
		const result = renderColorTheme({ component: "#4A90D9", page: "#27AE60" });
		expect(result).toContain("component");
		expect(result).toContain("page");
	});
});

describe("renderColorLegend", () => {
	it("returns empty string for empty colors", () => {
		expect(renderColorLegend({})).toBe("");
	});

	it("renders legend with color entries", () => {
		const colors = { component: "#4A90D9" };
		const result = renderColorLegend(colors);
		expect(result).toContain("legend right");
		expect(result).toContain("component");
		expect(result).toContain("#4A90D9");
		expect(result).toContain("endlegend");
	});
});
