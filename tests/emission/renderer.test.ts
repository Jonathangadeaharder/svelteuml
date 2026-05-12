import { describe, expect, it, vi } from "vitest";
import { renderPlantUml } from "../../src/emission/renderer.js";

const mockPlantUml = "@startuml\nclass Foo\n@enduml";

function mockFetch(responseOverrides: Partial<Response> = {}): void {
	vi.mocked(globalThis.fetch).mockResolvedValue({
		ok: true,
		status: 200,
		statusText: "OK",
		text: vi.fn().mockResolvedValue("<svg>mock</svg>"),
		...responseOverrides,
	} as unknown as Response);
}

describe("renderPlantUml", () => {
	beforeEach(() => {
		vi.spyOn(globalThis, "fetch").mockReset();
	});

	it("returns SVG data on successful render", async () => {
		mockFetch();
		const result = await renderPlantUml(mockPlantUml, "svg");
		expect(result.success).toBe(true);
		expect(result.data).toBe("<svg>mock</svg>");
	});

	it("returns PNG data on successful render", async () => {
		mockFetch();
		const result = await renderPlantUml(mockPlantUml, "png");
		expect(result.success).toBe(true);
		expect(result.data).toBe("<svg>mock</svg>");
	});

	it("sends correct Accept header for SVG", async () => {
		mockFetch();
		await renderPlantUml(mockPlantUml, "svg");
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: { Accept: "image/svg+xml" },
			}),
		);
	});

	it("sends correct Accept header for PNG", async () => {
		mockFetch();
		await renderPlantUml(mockPlantUml, "png");
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: { Accept: "image/png" },
			}),
		);
	});

	it("builds correct URL with encoded PlantUML", async () => {
		mockFetch();
		await renderPlantUml(mockPlantUml, "svg");
		const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
		expect(url).toMatch(/^https:\/\/www\.plantuml\.com\/plantuml\/svg\//);
	});

	it("returns error on non-200 response", async () => {
		mockFetch({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});
		const result = await renderPlantUml(mockPlantUml, "svg");
		expect(result.success).toBe(false);
		expect(result.error).toContain("500");
	});

	it("returns error on empty response", async () => {
		mockFetch({
			text: vi.fn().mockResolvedValue(""),
		});
		const result = await renderPlantUml(mockPlantUml, "svg");
		expect(result.success).toBe(false);
		expect(result.error).toContain("empty");
	});

	it("returns error on timeout", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Promise((_, reject) => {
				const error = new Error("The operation was aborted");
				error.name = "AbortError";
				reject(error);
			}),
		);
		const result = await renderPlantUml(mockPlantUml, "svg", 100);
		expect(result.success).toBe(false);
		expect(result.error).toContain("timed out");
	});

	it("returns error on network failure", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));
		const result = await renderPlantUml(mockPlantUml, "svg");
		expect(result.success).toBe(false);
		expect(result.error).toContain("fetch failed");
	});
});
