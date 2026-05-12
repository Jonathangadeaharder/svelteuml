export type UmlTag =
	| { kind: "hide" }
	| { kind: "group"; name: string }
	| { kind: "color"; color: string }
	| { kind: "focus" };

const CommentBlockRe = /<!--[\s\S]*?-->/g;

const UmlDirectiveRe = /@uml\.(\w+)(?:\(([^)]*)\))?/g;

const TagValueRe = /['"]([^'"]+)['"]/;

export function parseCommentTags(source: string): UmlTag[] {
	const tags: UmlTag[] = [];
	let commentMatch: RegExpExecArray | null = CommentBlockRe.exec(source);
	while (commentMatch !== null) {
		const commentContent = commentMatch[0];
		let directiveMatch: RegExpExecArray | null = UmlDirectiveRe.exec(commentContent);
		while (directiveMatch !== null) {
			const directive = directiveMatch[1];
			const rawValue = directiveMatch[2];
			switch (directive) {
				case "hide": {
					tags.push({ kind: "hide" });
					break;
				}
				case "group": {
					const name = extractStringValue(rawValue) ?? "unnamed";
					tags.push({ kind: "group", name });
					break;
				}
				case "color": {
					const colorValue = extractStringValue(rawValue) ?? "red";
					tags.push({ kind: "color", color: colorValue });
					break;
				}
				case "focus": {
					tags.push({ kind: "focus" });
					break;
				}
			}
			directiveMatch = UmlDirectiveRe.exec(commentContent);
		}
		commentMatch = CommentBlockRe.exec(source);
	}
	return tags;
}

function extractStringValue(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const m = TagValueRe.exec(raw.trim());
	return m?.[1];
}
