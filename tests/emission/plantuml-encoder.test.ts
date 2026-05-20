import { describe, expect, it } from "vitest";
import { decodePlantUml, encodePlantUml } from "../../src/emission/plantuml-encoder.js";

describe("encodePlantUml", () => {
	it("encodes simple PlantUML source", () => {
		const source = "@startuml\nclass Foo\n@enduml";
		const encoded = encodePlantUml(source);
		expect(encoded).toBeTypeOf("string");
		expect(encoded.length).toBeGreaterThan(0);
	});

	it("encodes empty source", () => {
		const encoded = encodePlantUml("");
		expect(encoded).toBeTypeOf("string");
	});

	it("produces deterministic output", () => {
		const source = "@startuml\nclass Foo\n@enduml";
		const a = encodePlantUml(source);
		const b = encodePlantUml(source);
		expect(a).toBe(b);
	});

	it("produces different output for different input", () => {
		const a = encodePlantUml("@startuml\nclass Foo\n@enduml");
		const b = encodePlantUml("@startuml\nclass Bar\n@enduml");
		expect(a).not.toBe(b);
	});

	it("round-trips through decodePlantUml", () => {
		const source = "@startuml\nclass Foo\n@enduml";
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("round-trips empty string", () => {
		const source = "";
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("round-trips multiline PlantUML", () => {
		const source = [
			"@startuml",
			"class User {",
			"  +name: string",
			"  +email: string",
			"}",
			"class Order {",
			"  +id: number",
			"}",
			"User --> Order",
			"@enduml",
		].join("\n");
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("uses only PlantUML alphabet characters", () => {
		const source = "@startuml\nclass Foo\n@enduml";
		const encoded = encodePlantUml(source);
		const validChars = /^[0-9A-Za-z\-_]+$/;
		expect(validChars.test(encoded)).toBe(true);
	});

	it("round-trips with special characters", () => {
		const source = "@startuml\nclass FooBar {\n  + méthode(): void\n  + über(): string\n}\n@enduml";
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("encode handles single byte remainder", () => {
		// Single character source exercises remainder === 1 in toPlantUmlBase64
		const source = "@";
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("encode handles two byte remainder", () => {
		// Two character source exercises remainder === 2 in toPlantUmlBase64
		const source = "@s";
		const encoded = encodePlantUml(source);
		const decoded = decodePlantUml(encoded);
		expect(decoded).toBe(source);
	});

	it("decode handles characters not in plantuml alphabet", () => {
		// Characters outside PLANTUML_ALPHABET exercise the ?? 0 fallback
		const source = encodePlantUml("A");
		const corrupted = source.replace(/[0-9A-Za-z\-_]/, "!");
		const decoded = decodePlantUml(corrupted);
		expect(decoded).toBeTypeOf("string");
	});
});
