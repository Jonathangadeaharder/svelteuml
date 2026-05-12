import { describe, expect, it } from "vitest";
import {
	applyFocusFilter,
	filterHiddenComponents,
	getComponentColor,
	getFocusedComponents,
	groupComponentsByTag,
	removeHiddenComponents,
} from "../../src/emission/tag-processor.js";
import type { ComponentSymbol, SymbolTable } from "../../src/types/ast.js";
import type { EdgeSet } from "../../src/types/edge.js";

function makeComp(name: string, filePath: string, tags?: ComponentSymbol["tags"]): ComponentSymbol {
	const comp: ComponentSymbol = { kind: "component", name, filePath };
	if (tags) comp.tags = tags;
	return comp;
}

function makeEmptySymbols(): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		events: [],
		exports: [],
		routes: [],
		components: [],
	};
}

describe("filterHiddenComponents", () => {
	it("removes components with @uml.hide tag", () => {
		const comps = [
			makeComp("Visible", "/Visible.svelte"),
			makeComp("Hidden", "/Hidden.svelte", [{ kind: "hide" }]),
			makeComp("AlsoVisible", "/AlsoVisible.svelte"),
		];
		const result = filterHiddenComponents(comps);
		expect(result).toHaveLength(2);
		expect(result.find((c) => c.name === "Visible")).toBeDefined();
		expect(result.find((c) => c.name === "AlsoVisible")).toBeDefined();
		expect(result.find((c) => c.name === "Hidden")).toBeUndefined();
	});

	it("returns all components when none are hidden", () => {
		const comps = [makeComp("A", "/A.svelte"), makeComp("B", "/B.svelte")];
		expect(filterHiddenComponents(comps)).toHaveLength(2);
	});

	it("returns empty when all are hidden", () => {
		const comps = [makeComp("A", "/A.svelte", [{ kind: "hide" }])];
		expect(filterHiddenComponents(comps)).toHaveLength(0);
	});

	it("returns empty array for no components", () => {
		expect(filterHiddenComponents([])).toEqual([]);
	});
});

describe("groupComponentsByTag", () => {
	it("groups components by @uml.group tag", () => {
		const comps = [
			makeComp("ServiceA", "/ServiceA.svelte", [{ kind: "group", name: "Services" }]),
			makeComp("ServiceB", "/ServiceB.svelte", [{ kind: "group", name: "Services" }]),
			makeComp("Widget", "/Widget.svelte"),
		];
		const { grouped, ungrouped } = groupComponentsByTag(comps);
		expect(grouped.size).toBe(1);
		expect(grouped.get("Services")).toHaveLength(2);
		expect(ungrouped).toHaveLength(1);
		expect(ungrouped[0]?.name).toBe("Widget");
	});

	it("handles multiple groups", () => {
		const comps = [
			makeComp("ServiceA", "/ServiceA.svelte", [{ kind: "group", name: "Services" }]),
			makeComp("UtilA", "/UtilA.svelte", [{ kind: "group", name: "Utilities" }]),
		];
		const { grouped, ungrouped } = groupComponentsByTag(comps);
		expect(grouped.size).toBe(2);
		expect(ungrouped).toHaveLength(0);
	});

	it("handles component with multiple tags including group", () => {
		const comps = [
			makeComp("ServiceA", "/ServiceA.svelte", [
				{ kind: "group", name: "Services" },
				{ kind: "color", color: "red" },
			]),
		];
		const { grouped, ungrouped } = groupComponentsByTag(comps);
		expect(grouped.size).toBe(1);
		expect(ungrouped).toHaveLength(0);
	});
});

describe("applyFocusFilter", () => {
	it("filters to only focused components when focus tags present", () => {
		const comps = [
			makeComp("FocusComp", "/FocusComp.svelte", [{ kind: "focus" }]),
			makeComp("NormalComp", "/NormalComp.svelte"),
		];
		const result = applyFocusFilter(comps);
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("FocusComp");
	});

	it("returns all components when no focus tag", () => {
		const comps = [makeComp("A", "/A.svelte"), makeComp("B", "/B.svelte")];
		expect(applyFocusFilter(comps)).toHaveLength(2);
	});
});

describe("getComponentColor", () => {
	it("returns color from @uml.color tag", () => {
		const comp = makeComp("A", "/A.svelte", [{ kind: "color", color: "red" }]);
		expect(getComponentColor(comp)).toBe("red");
	});

	it("returns undefined when no color tag", () => {
		const comp = makeComp("A", "/A.svelte");
		expect(getComponentColor(comp)).toBeUndefined();
	});

	it("returns undefined for non-color tags", () => {
		const comp = makeComp("A", "/A.svelte", [{ kind: "hide" }]);
		expect(getComponentColor(comp)).toBeUndefined();
	});
});

describe("removeHiddenComponents", () => {
	it("removes hidden components from symbol table", () => {
		const symbols: SymbolTable = {
			...makeEmptySymbols(),
			components: [
				makeComp("Visible", "/Visible.svelte"),
				makeComp("Hidden", "/Hidden.svelte", [{ kind: "hide" }]),
			],
		};
		const result = removeHiddenComponents(symbols, {
			edges: [],
			bySource: new Map(),
			byTarget: new Map(),
		});
		expect(result.symbols.components).toHaveLength(1);
		expect(result.symbols.components[0]?.name).toBe("Visible");
	});

	it("returns original when no hidden components", () => {
		const symbols: SymbolTable = {
			...makeEmptySymbols(),
			components: [makeComp("A", "/A.svelte")],
		};
		const edges: EdgeSet = { edges: [], bySource: new Map(), byTarget: new Map() };
		const result = removeHiddenComponents(symbols, edges);
		expect(result.symbols.components).toHaveLength(1);
		expect(result.edges.edges).toHaveLength(0);
	});
});

describe("getFocusedComponents", () => {
	it("returns only focused components when focus tags exist", () => {
		const comps = [
			makeComp("A", "/A.svelte", [{ kind: "focus" }]),
			makeComp("B", "/B.svelte"),
			makeComp("C", "/C.svelte"),
		];
		expect(getFocusedComponents(comps)).toHaveLength(1);
		expect(getFocusedComponents(comps)[0]?.name).toBe("A");
	});

	it("returns all when no focus tags", () => {
		const comps = [makeComp("A", "/A.svelte"), makeComp("B", "/B.svelte")];
		expect(getFocusedComponents(comps)).toHaveLength(2);
	});
});
