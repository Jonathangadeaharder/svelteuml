import type { LayoutDirection } from "../types/diagram.js";

const DIRECTION_MAP: Record<LayoutDirection, string> = {
	"top-to-bottom": "top to bottom direction",
	"left-to-right": "left to right direction",
	"bottom-to-top": "bottom to top direction",
	"right-to-left": "right to left direction",
};

export function renderLayoutDirective(direction: LayoutDirection): string {
	return DIRECTION_MAP[direction] ?? "";
}
