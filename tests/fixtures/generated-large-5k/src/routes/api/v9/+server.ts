import type { RequestEvent } from "@sveltejs/kit";

export interface Item9 {
	id: number;
	label: string;
	value: number;
	tags: string[];
}

const items = new Map<number, Item9>();

export async function GET(event: RequestEvent): Promise<Response> {
	const id = Number(event.url.searchParams.get("id") ?? "0");
	const item = items.get(id);
	return Response.json(item ?? null);
}

export async function POST(event: RequestEvent): Promise<Response> {
	const body = (await event.request.json()) as Omit<Item9, "id">;
	const id = items.size + 1;
	items.set(id, { id, ...body });
	return Response.json({ id }, { status: 201 });
}

export async function DELETE(event: RequestEvent): Promise<Response> {
	const id = Number(event.url.searchParams.get("id") ?? "0");
	items.delete(id);
	return new Response(null, { status: 204 });
}
