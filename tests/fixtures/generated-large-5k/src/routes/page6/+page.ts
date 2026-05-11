import type { PageLoad } from "./$types";

export interface PageData6 {
	title: string;
	items: number[];
	metadata: Record<string, string>;
}

export const load: PageLoad<PageData6> = async ({ fetch, params }) => {
	const response = await fetch("/api/data");
	const data = (await response.json()) as { items: number[] };
	return {
		title: `Page ${params.slug ?? "default"}`,
		items: data.items,
		metadata: { page: "6", version: "1.0" },
	};
};
