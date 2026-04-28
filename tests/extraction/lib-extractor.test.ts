import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import { extractLibFunctions, extractLibClasses } from "../../src/extraction/lib-extractor.js";

function makeSourceFile(code: string, filePath = "/src/lib/utils.ts") {
	const project = new Project({ useInMemoryFileSystem: true });
	return project.createSourceFile(filePath, code);
}

describe("extractLibFunctions", () => {
	it("extracts an exported function declaration", () => {
		const sf = makeSourceFile(`
			export function add(a: number, b: number): number {
				return a + b;
			}
		`);
		const result = extractLibFunctions(sf, "/src/lib/utils.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("add");
		expect(result[0]?.isExported).toBe(true);
		expect(result[0]?.isAsync).toBe(false);
		expect(result[0]?.parameters).toHaveLength(2);
	});

	it("extracts an exported async function", () => {
		const sf = makeSourceFile(`
			export async function fetchData(url: string): Promise<Response> {
				return fetch(url);
			}
		`);
		const result = extractLibFunctions(sf, "/src/lib/api.ts");
		expect(result[0]?.isAsync).toBe(true);
		expect(result[0]?.name).toBe("fetchData");
	});

	it("extracts exported arrow function", () => {
		const sf = makeSourceFile(`
			export const helper = async (x: string) => x.toUpperCase();
		`);
		const result = extractLibFunctions(sf, "/src/lib/utils.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("helper");
		expect(result[0]?.isAsync).toBe(true);
	});

	it("ignores non-exported functions", () => {
		const sf = makeSourceFile(`
			function internal() {}
			export function visible() {}
		`);
		const result = extractLibFunctions(sf, "/src/lib/utils.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("visible");
	});

	it("skips route files (+page.ts)", () => {
		const sf = makeSourceFile(`
			export function load() { return {}; }
		`, "/src/routes/+page.ts");
		const result = extractLibFunctions(sf, "/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});

	it("skips node_modules files", () => {
		const sf = makeSourceFile(`
			export function helper() {}
		`, "/project/node_modules/pkg/index.ts");
		const result = extractLibFunctions(sf, "/project/node_modules/pkg/index.ts");
		expect(result).toHaveLength(0);
	});

	it("extracts function type params", () => {
		const sf = makeSourceFile(`
			export function identity<T>(x: T): T { return x; }
		`);
		const result = extractLibFunctions(sf, "/src/lib/utils.ts");
		expect(result[0]?.typeParams).toEqual(["T"]);
	});
});

describe("extractLibClasses", () => {
	it("extracts an exported class", () => {
		const sf = makeSourceFile(`
			export class AudioPlayer {
				private volume: number = 1;
				play(url: string): void {}
			}
		`);
		const result = extractLibClasses(sf, "/src/lib/audio.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.kind).toBe("class");
		expect(result[0]?.name).toBe("AudioPlayer");
	});

	it("extracts class members with visibility", () => {
		const sf = makeSourceFile(`
			export class Counter {
				private count: number = 0;
				protected label: string = '';
				public increment(): void { this.count++; }
			}
		`);
		const result = extractLibClasses(sf, "/src/lib/counter.ts");
		const cls = result[0];
		expect(cls?.members).toHaveLength(3);
		const countProp = cls?.members.find(m => m.name === "count");
		expect(countProp?.visibility).toBe("private");
		const labelProp = cls?.members.find(m => m.name === "label");
		expect(labelProp?.visibility).toBe("protected");
		const incMethod = cls?.members.find(m => m.name === "increment");
		expect(incMethod?.visibility).toBe("public");
		expect(incMethod?.kind).toBe("method");
	});

	it("extracts abstract class", () => {
		const sf = makeSourceFile(`
			export abstract class BaseService {
				abstract doWork(): void;
			}
		`);
		const result = extractLibClasses(sf, "/src/lib/base.ts");
		expect(result[0]?.kind).toBe("abstract-class");
	});

	it("extracts class with extends and implements", () => {
		const sf = makeSourceFile(`
			interface IInit { init(): void; }
			export class ConcreteService extends BaseService implements IInit {
				init(): void {}
			}
		`);
		const result = extractLibClasses(sf, "/src/lib/services.ts");
		const cls = result.find(c => c.name === "ConcreteService");
		expect(cls?.extends).toBe("BaseService");
		expect(cls?.implements).toContain("IInit");
	});

	it("extracts exported interface", () => {
		const sf = makeSourceFile(`
			export interface IRepository<T> {
				findById(id: string): T;
				save(item: T): void;
			}
		`);
		const result = extractLibClasses(sf, "/src/lib/repository.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.kind).toBe("interface");
		expect(result[0]?.name).toBe("IRepository");
		expect(result[0]?.isGeneric).toBe(true);
		expect(result[0]?.typeParams).toEqual(["T"]);
	});

	it("ignores non-exported classes", () => {
		const sf = makeSourceFile(`
			class Internal {}
			export class Public {}
		`);
		const result = extractLibClasses(sf, "/src/lib/utils.ts");
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("Public");
	});

	it("skips route files", () => {
		const sf = makeSourceFile(`
			export class LoadData {}
		`, "/src/routes/+page.ts");
		const result = extractLibClasses(sf, "/src/routes/+page.ts");
		expect(result).toHaveLength(0);
	});
});
