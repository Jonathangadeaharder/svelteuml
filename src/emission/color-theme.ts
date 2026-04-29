import type { StereotypeColors } from "../types/diagram.js";

export function renderColorTheme(colors: StereotypeColors): string {
	const entries = Object.entries(colors);
	if (entries.length === 0) return "";

	const lines: string[] = [];
	for (const [stereotype, color] of entries) {
		lines.push(`skinparam class<<${stereotype}>> {`);
		lines.push(`  BackgroundColor ${color}`);
		lines.push("}");
	}
	return lines.join("\n");
}

export function renderColorLegend(colors: StereotypeColors): string {
	const entries = Object.entries(colors);
	if (entries.length === 0) return "";

	const lines: string[] = ["legend right"];
	for (const [stereotype, color] of entries) {
		lines.push(`  |= ${stereotype} |= ${color} |`);
	}
	lines.push("endlegend");
	return lines.join("\n");
}
