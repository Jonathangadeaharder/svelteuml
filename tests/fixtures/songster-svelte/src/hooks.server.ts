import { createServerClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import {
	PUBLIC_POSTHOG_HOST,
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_URL,
} from '$env/static/public';
import { getPostHogClient, shutdownPostHog } from '$lib/server/posthog';

const isPlaceholder =
	PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' &&
	PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key';

const PUBLIC_ROUTES = ['/', '/lobby/DEMO', '/health'];

function isPublicRoute(pathname: string): boolean {
	return pathname.startsWith('/login') || PUBLIC_ROUTES.includes(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (pathname.startsWith('/ingest')) {
		const useAssetHost =
			pathname.startsWith('/ingest/static/') || pathname.startsWith('/ingest/array/');
		const baseHost = new URL(PUBLIC_POSTHOG_HOST).hostname;
		const hostname = useAssetHost ? baseHost.replace('.', '-assets.') : baseHost;

		const url = new URL(event.request.url);
		url.protocol = 'https:';
		url.hostname = hostname;
		url.port = '443';
		url.pathname = pathname.replace(/^\/ingest/, '');

		const headers = new Headers(event.request.headers);
		headers.set('host', hostname);
		headers.set('accept-encoding', '');

		const clientIp = event.request.headers.get('x-forwarded-for') || event.getClientAddress();
		if (clientIp) {
			headers.set('x-forwarded-for', clientIp);
		}

		const response = await fetch(url.toString(), {
			method: event.request.method,
			headers,
			body: event.request.body,
			duplex: 'half',
		});

		return response;
	}

	if (isPlaceholder) {
		event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (
					cookies: {
						name: string;
						value: string;
						options: Record<string, unknown>;
					}[]
				) => {
					for (const { name, value, options } of cookies) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				},
			},
		});
		event.locals.safeGetSession = async () => ({
			session: {
				user: { id: '00000000-0000-0000-0000-000000000000' },
				access_token: 'placeholder',
				refresh_token: '',
				expires_in: 3600,
				token_type: 'bearer',
			} as unknown as Session,
		});
	} else {
		event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (
					cookies: {
						name: string;
						value: string;
						options: Record<string, unknown>;
					}[]
				) => {
					for (const { name, value, options } of cookies) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				},
			},
		});

		event.locals.safeGetSession = async () => {
			const {
				data: { user },
			} = await event.locals.supabase.auth.getUser();
			if (!user) return { session: null };
			const {
				data: { session },
			} = await event.locals.supabase.auth.getSession();
			return { session };
		};
	}

	if (!isPublicRoute(event.url.pathname)) {
		const { session } = await event.locals.safeGetSession();
		if (!session) {
			throw redirect(303, '/login');
		}
	}

	if (event.url.pathname === '/login') {
		const { session } = await event.locals.safeGetSession();
		if (session) {
			throw redirect(303, '/');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range',
	});
};

export const handleError: HandleServerError = async ({ error, event }) => {
	try {
		const posthog = getPostHogClient();
		let distinctId: string | undefined;
		try {
			const { session } = await event.locals.safeGetSession?.();
			distinctId = session?.user?.id;
		} catch {}
		posthog.captureException(error, distinctId);
	} catch {}
};

process.on('SIGTERM', async () => {
	await shutdownPostHog();
	process.exit(0);
});

process.on('SIGINT', async () => {
	await shutdownPostHog();
	process.exit(0);
});
