import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return json({ data: "Hello from API" });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return json({ received: true, ...body });
};
