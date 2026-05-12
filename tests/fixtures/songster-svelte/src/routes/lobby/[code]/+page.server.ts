import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Route guard: the lobby requires a session (anon or authenticated).
 * Unauthenticated visitors are redirected to login.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		const redirectTo = encodeURIComponent(`/lobby/${params.code}`);
		throw redirect(303, `/auth/login?redirectTo=${redirectTo}`);
	}

	return { code: params.code };
};
