import { describe, expect, it } from "vitest";
import {
	extractGroups,
	parseRouteParams,
	parseRouteSegment,
} from "../../src/extraction/route-extractor.js";

describe("parseRouteParams", () => {
	it("returns empty array for static segment", () => {
		expect(parseRouteParams("/about")).toEqual([]);
	});

	it("parses single dynamic param [id]", () => {
		const result = parseRouteParams("/users/[id]");
		expect(result).toEqual([{ kind: "dynamic", name: "id" }]);
	});

	it("parses rest param [...slug]", () => {
		const result = parseRouteParams("/files/[...slug]");
		expect(result).toEqual([{ kind: "rest", name: "slug" }]);
	});

	it("parses optional param [[slug]]", () => {
		const result = parseRouteParams("/docs/[[slug]]");
		expect(result).toEqual([{ kind: "optional", name: "slug" }]);
	});

	it("parses param with matcher [id=integer]", () => {
		const result = parseRouteParams("/items/[id=integer]");
		expect(result).toEqual([{ kind: "dynamic", name: "id", matcher: "integer" }]);
	});

	it("parses rest param with matcher [...path=word]", () => {
		const result = parseRouteParams("/static/[...path=word]");
		expect(result).toEqual([{ kind: "rest", name: "path", matcher: "word" }]);
	});

	it("parses multiple params in one segment", () => {
		const result = parseRouteParams("/users/[id]/posts/[postId]");
		expect(result).toEqual([
			{ kind: "dynamic", name: "id" },
			{ kind: "dynamic", name: "postId" },
		]);
	});

	it("returns empty array for root segment", () => {
		expect(parseRouteParams("/")).toEqual([]);
	});
});

describe("extractGroups", () => {
	it("returns empty array when no groups present", () => {
		expect(extractGroups("/users/[id]")).toEqual([]);
	});

	it("extracts single group (auth)", () => {
		expect(extractGroups("/(auth)/login")).toEqual(["auth"]);
	});

	it("extracts multiple groups", () => {
		expect(extractGroups("/(marketing)/(public)/about")).toEqual(["marketing", "public"]);
	});

	it("extracts groups from multiple segments", () => {
		expect(extractGroups("/(app)/settings/(admin)/users")).toEqual(["app", "admin"]);
	});

	it("returns empty array for root", () => {
		expect(extractGroups("/")).toEqual([]);
	});
});

describe("parseRouteSegment", () => {
	it("parses root segment", () => {
		const result = parseRouteSegment("/");
		expect(result).toEqual({ raw: "/", params: [], groups: [] });
	});

	it("parses static segment", () => {
		const result = parseRouteSegment("/about");
		expect(result).toEqual({ raw: "/about", params: [], groups: [] });
	});

	it("parses dynamic segment with group", () => {
		const result = parseRouteSegment("/(auth)/users/[id]");
		expect(result.raw).toBe("/(auth)/users/[id]");
		expect(result.params).toEqual([{ kind: "dynamic", name: "id" }]);
		expect(result.groups).toEqual(["auth"]);
	});

	it("parses segment with matcher and group", () => {
		const result = parseRouteSegment("/(app)/items/[id=integer]");
		expect(result.params).toEqual([{ kind: "dynamic", name: "id", matcher: "integer" }]);
		expect(result.groups).toEqual(["app"]);
	});
});

describe("parseRouteParams edge cases", () => {
	it("parses optional param with matcher [[lang=word]]", () => {
		const result = parseRouteParams("/docs/[[lang=word]]");
		expect(result).toEqual([{ kind: "optional", name: "lang", matcher: "word" }]);
	});

	it("parses multiple different param types", () => {
		const result = parseRouteParams("/(app)/[org]/repos/[...path]/+page");
		expect(result).toEqual([
			{ kind: "dynamic", name: "org" },
			{ kind: "rest", name: "path" },
		]);
	});

	it("parses param with complex matcher name", () => {
		const result = parseRouteParams("/items/[slug=my-custom-matcher]");
		expect(result).toEqual([{ kind: "dynamic", name: "slug", matcher: "my-custom-matcher" }]);
	});
});

describe("extractGroups edge cases", () => {
	it("handles segment with params and groups mixed", () => {
		const result = extractGroups("/(marketing)/campaigns/[id]/(analytics)/report");
		expect(result).toEqual(["marketing", "analytics"]);
	});
});

describe("parseRouteSegment edge cases", () => {
	it("parses complex mixed segment", () => {
		const result = parseRouteSegment("/(app)/org/[orgId]/settings/[...path=word]");
		expect(result.raw).toBe("/(app)/org/[orgId]/settings/[...path=word]");
		expect(result.params).toEqual([
			{ kind: "dynamic", name: "orgId" },
			{ kind: "rest", name: "path", matcher: "word" },
		]);
		expect(result.groups).toEqual(["app"]);
	});

	it("parses segment with only groups", () => {
		const result = parseRouteSegment("/(auth)/(protected)/dashboard");
		expect(result.params).toEqual([]);
		expect(result.groups).toEqual(["auth", "protected"]);
	});
});

describe("malformed segment handling", () => {
	it("handles unmatched opening bracket", () => {
		expect(parseRouteParams("/docs/[lang")).toEqual([]);
	});

	it("handles unmatched closing bracket", () => {
		expect(parseRouteParams("/docs/lang]")).toEqual([]);
	});

	it("handles empty brackets", () => {
		expect(parseRouteParams("/docs/[]")).toEqual([]);
	});

	it("handles empty matcher value", () => {
		expect(parseRouteParams("/items/[slug=]")).toEqual([{ kind: "dynamic", name: "slug", matcher: "" }]);
	});

	it("handles empty param name with matcher", () => {
		expect(parseRouteParams("/items/[=matcher]")).toEqual([{ kind: "dynamic", name: "", matcher: "matcher" }]);
	});

	it("handles unmatched opening paren for groups", () => {
		expect(extractGroups("/(app")).toEqual([]);
	});

	it("handles unmatched closing paren for groups", () => {
		expect(extractGroups("/app)")).toEqual([]);
	});

	it("handles empty group parens", () => {
		expect(extractGroups("/()")).toEqual([]);
	});
});
