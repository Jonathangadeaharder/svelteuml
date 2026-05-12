import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Route guard: results page requires a session.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		const redirectTo = encodeURIComponent(`/results/${params.code}`);
		throw redirect(303, `/auth/login?redirectTo=${redirectTo}`);
	}

	return { code: params.code };
};
