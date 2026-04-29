import { describe, it, expect } from "vitest";
import { emitPlantUML } from "../../src/emission/plantuml-emitter.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { createEdgeSet } from "../../src/types/edge.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
	return { classes: [], functions: [], stores: [], props: [], exports: [], ...overrides };
}

describe("emitPlantUML", () => {
	it("defaults to class diagram kind", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.diagramKind).toBe("class");
		expect(result.content).toContain("@startuml");
	});

	it("produces class diagram when kind is class", () => {
		const result = emitPlantUML(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			{ ...DEFAULT_DIAGRAM_OPTIONS, kind: "class" },
		);
		expect(result.diagramKind).toBe("class");
	});

	it("produces package diagram when kind is package", () => {
		const result = emitPlantUML(
			makeEmptySymbolTable(),
			createEdgeSet([]),
			{ ...DEFAULT_DIAGRAM_OPTIONS, kind: "package" },
		);
		expect(result.diagramKind).toBe("package");
		expect(result.content).toContain("@startuml");
	});

	it("uses DEFAULT_DIAGRAM_OPTIONS when no options provided", () => {
		const result = emitPlantUML(makeEmptySymbolTable(), createEdgeSet([]));
		expect(result.content).toContain("@startuml");
		expect(result.content).toContain("@enduml");
	});
});
