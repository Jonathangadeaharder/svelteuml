import { describe, expect, it } from "vitest";
import type { UmlTag } from "../../src/extraction/comment-tags.js";
import { parseCommentTags } from "../../src/extraction/comment-tags.js";

describe("parseCommentTags", () => {
	it("parses @uml.hide", () => {
		const source = "<!-- @uml.hide -->";
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "hide" }]);
	});

	it("parses @uml.group with name", () => {
		const source = '<!-- @uml.group("Services") -->';
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "group", name: "Services" }]);
	});

	it("parses @uml.color with color", () => {
		const source = '<!-- @uml.color("red") -->';
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "color", color: "red" }]);
	});

	it("parses @uml.focus", () => {
		const source = "<!-- @uml.focus -->";
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "focus" }]);
	});

	it("parses multiple tags from one comment", () => {
		const source = "<!-- @uml.hide @uml.group('Internal') -->";
		const tags = parseCommentTags(source);
		expect(tags).toHaveLength(2);
		expect(tags[0]).toEqual<UmlTag>({ kind: "hide" });
		expect(tags[1]).toEqual<UmlTag>({ kind: "group", name: "Internal" });
	});

	it("parses tags from multiple comments", () => {
		const source = "<!-- @uml.hide -->\n<script>let x = 1;</script>\n<!-- @uml.focus -->";
		const tags = parseCommentTags(source);
		expect(tags).toHaveLength(2);
		expect(tags[0]).toEqual<UmlTag>({ kind: "hide" });
		expect(tags[1]).toEqual<UmlTag>({ kind: "focus" });
	});

	it("returns empty array for source without tags", () => {
		const source = "<script>let x = 1;</script>\n<div>Hello</div>";
		const tags = parseCommentTags(source);
		expect(tags).toEqual([]);
	});

	it("returns empty array for empty source", () => {
		expect(parseCommentTags("")).toEqual([]);
	});

	it("ignores non-uml HTML comments", () => {
		const source = "<!-- just a regular comment -->\n<!-- @uml.hide -->";
		const tags = parseCommentTags(source);
		expect(tags).toHaveLength(1);
		expect(tags[0]).toEqual<UmlTag>({ kind: "hide" });
	});

	it("supports double-quoted strings for group", () => {
		const source = '<!-- @uml.group("My Group") -->';
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "group", name: "My Group" }]);
	});

	it("supports single-quoted strings for group", () => {
		const source = "<!-- @uml.group('My Group') -->";
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "group", name: "My Group" }]);
	});

	it("supports single-quoted strings for color", () => {
		const source = "<!-- @uml.color('#FF0000') -->";
		const tags = parseCommentTags(source);
		expect(tags).toEqual<UmlTag[]>([{ kind: "color", color: "#FF0000" }]);
	});
});
