import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Route guard: a game session requires an authenticated or anonymous user.
 * If no session exists at all (not even anon), redirect to login.
 * The client-side store will handle room validation.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		// Preserve destination so auth/callback can redirect back
		const redirectTo = encodeURIComponent(`/game/${params.code}`);
		throw redirect(303, `/auth/login?redirectTo=${redirectTo}`);
	}

	return { code: params.code };
};
