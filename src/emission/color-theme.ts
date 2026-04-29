import type { StereotypeColors } from "../types/diagram.js";

const STEREOTYPE_RE = /^[a-zA-Z0-9_-]+$/;
const COLOR_HEX_RE = /^#[0-9a-fA-F]{6}$/;
const NAMED_COLORS = new Set([
	"black",
	"white",
	"red",
	"green",
	"blue",
	"yellow",
	"orange",
	"purple",
	"gray",
	"grey",
	"cyan",
	"magenta",
	"pink",
	"brown",
	"gold",
	"silver",
	"navy",
	"teal",
	"maroon",
	"olive",
	"lime",
	"aqua",
	"fuchsia",
	"transparent",
]);

function sanitizeStereotype(s: string): string {
	return STEREOTYPE_RE.test(s) ? s : s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sanitizeColor(c: string): string {
	if (COLOR_HEX_RE.test(c) || NAMED_COLORS.has(c.toLowerCase())) return c;
	return "#666666";
}

export function renderColorTheme(colors: StereotypeColors): string {
	const entries = Object.entries(colors);
	if (entries.length === 0) return "";

	const lines: string[] = [];
	for (const [stereotype, color] of entries) {
		const safe = sanitizeStereotype(stereotype);
		const safeColor = sanitizeColor(color);
		lines.push(`skinparam class<<${safe}>> {`);
		lines.push(`  BackgroundColor ${safeColor}`);
		lines.push("}");
	}
	return lines.join("\n");
}

export function renderColorLegend(colors: StereotypeColors): string {
	const entries = Object.entries(colors);
	if (entries.length === 0) return "";

	const lines: string[] = ["legend right"];
	for (const [stereotype, color] of entries) {
		const safe = sanitizeStereotype(stereotype);
		const safeColor = sanitizeColor(color);
		lines.push(`  |= ${safe} |= ${safeColor} |`);
	}
	lines.push("endlegend");
	return lines.join("\n");
}
