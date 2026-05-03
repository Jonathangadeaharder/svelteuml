import { describe, expect, it } from "vitest";
import { emitPlantUML } from "../../src/emission/plantuml-emitter.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS, DEFAULT_STEREOTYPE_COLORS } from "../../src/types/diagram.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return {
		classes: [],
		functions: [],
		stores: [],
		props: [],
		exports: [],
		routes: [],
		components: [],
		...overrides,
	};
}

describe("emitPlantUML", () => {
	it("defaults to class diagram kind", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.diagramKind).toBe("class");
		expect(result.content).toContain("@startuml");
	});

	it("produces class diagram when kind is class", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
		});
		expect(result.diagramKind).toBe("class");
	});

	it("produces package diagram when kind is package", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "package",
		});
		expect(result.diagramKind).toBe("package");
		expect(result.content).toContain("@startuml");
	});

	it("uses DEFAULT_DIAGRAM_OPTIONS when no options provided", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.content).toContain("@startuml");
		expect(result.content).toContain("@enduml");
	});

	it("injects layout direction when specified", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			layoutDirection: "left-to-right",
			stereotypeColors: {},
		});
		expect(result.content).toContain("left to right direction");
	});

	it("injects color theme when stereotypeColors provided", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: { component: "#FF0000" },
		});
		expect(result.content).toContain("skinparam class<<component>>");
		expect(result.content).toContain("BackgroundColor #FF0000");
	});

	it("omits theme block when stereotypeColors is empty", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: {},
		});
		expect(result.content).not.toContain("skinparam class<<");
		expect(result.content).not.toContain("legend right");
	});

	it("injects layout and color together", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			layoutDirection: "bottom-to-top",
			stereotypeColors: DEFAULT_STEREOTYPE_COLORS,
		});
		expect(result.content).toContain("bottom to top direction");
		expect(result.content).toContain("skinparam class<<component>>");
		expect(result.content).toContain("legend right");
	});

	it("defaults to top-to-bottom layout", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			stereotypeColors: {},
		});
		expect(result.content).toContain("top to bottom direction");
	});

	it("handles no stereotypeColors (undefined)", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]), {
			...DEFAULT_DIAGRAM_OPTIONS,
			kind: "class",
			layoutDirection: "left-to-right",
			stereotypeColors: undefined as any,
		});
		expect(result.content).toContain("left to right direction");
	});
});
