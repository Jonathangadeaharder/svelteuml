import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return json({ users: [] });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	return json({ created: true, ...body });
};
