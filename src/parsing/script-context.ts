export interface ScriptBlock {
	context: "module" | "instance";
	startLine: number;
	endLine: number;
}

export interface ScriptContextMap {
	sourcePath: string;
	blocks: ScriptBlock[];
}

const SCRIPT_OPEN = /<script\b([^>]*)>/;
const SCRIPT_CLOSE = /<\/script>/;

export function parseScriptContexts(content: string): ScriptContextMap {
	const blocks: ScriptBlock[] = [];
	const lines = content.split("\n");

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const match = line?.match(SCRIPT_OPEN);
		if (match) {
			const attrs = match[1] ?? "";
			const isModule = /\bcontext\s*=\s*["']module["']/.test(attrs);
			const startLine = i + 1;
			let endLine = startLine;
			for (let j = i + 1; j < lines.length; j++) {
				if (SCRIPT_CLOSE.test(lines[j] ?? "")) {
					endLine = j + 1;
					break;
				}
			}
			blocks.push({
				context: isModule ? "module" : "instance",
				startLine,
				endLine,
			});
			i = endLine;
		} else {
			i++;
		}
	}

	return { sourcePath: "", blocks };
}

export function getContextForLine(
	map: ScriptContextMap,
	line: number,
): "module" | "instance" | undefined {
	for (const block of map.blocks) {
		if (line >= block.startLine && line <= block.endLine) {
			return block.context;
		}
	}
	return undefined;
}
