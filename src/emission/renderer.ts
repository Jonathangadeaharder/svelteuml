import { encodePlantUml } from "./plantuml-encoder.js";

const PLANTUML_SERVER_BASE = "https://www.plantuml.com/plantuml";

export interface RenderResult {
	success: boolean;
	data?: string;
	error?: string;
}

export async function renderPlantUml(
	plantUml: string,
	format: "svg" | "png",
	timeoutMs = 15_000,
): Promise<RenderResult> {
	try {
		const encoded = encodePlantUml(plantUml);
		const url = `${PLANTUML_SERVER_BASE}/${format}/${encoded}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: format === "svg" ? "image/svg+xml" : "image/png",
			},
		});
		clearTimeout(timer);

		if (!response.ok) {
			return {
				success: false,
				error: `PlantUML server returned ${response.status}: ${response.statusText}`,
			};
		}

		const data = await response.text();

		if (!data || data.length === 0) {
			return { success: false, error: "PlantUML server returned empty response" };
		}

		return { success: true, data };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("abort")) {
			return { success: false, error: "PlantUML server request timed out" };
		}
		return { success: false, error: `PlantUML render failed: ${message}` };
	}
}
