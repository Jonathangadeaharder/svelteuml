import { error, json } from '@sveltejs/kit';
import type { DeezerTrackData, Track } from '$lib/types';
import type { RequestHandler } from './$types';
import { getPostHogClient } from '$lib/server/posthog';

const DEEZER_API = 'https://api.deezer.com';
const cache = new Map<string, { data: Track[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

function parseReleaseYear(data: DeezerTrackData): number | undefined {
	if (!data.release_date) return undefined;
	const year = parseInt(data.release_date.substring(0, 4), 10);
	return Number.isNaN(year) ? undefined : year;
}

function mapDeezerTrack(data: DeezerTrackData): Track {
	return {
		id: `dz-${data.id}`,
		num: data.id,
		title: data.title,
		artist: data.artist?.name ?? '',
		year: parseReleaseYear(data) ?? 0,
		deezer_id: data.id,
		preview_url: data.preview ?? '',
		cover_small: data.album?.cover_small ?? null,
		cover_medium: data.album?.cover_medium ?? null,
		duration: data.duration ?? 30,
	};
}

function getCached(key: string): Track[] | undefined {
	const entry = cache.get(key);
	if (entry && entry.expires > Date.now()) return entry.data;
	if (entry) cache.delete(key);
	return undefined;
}

function setCached(key: string, data: Track[]): void {
	if (cache.size >= MAX_CACHE_SIZE) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const query = url.searchParams.get('q');
	let limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
	if (Number.isNaN(limit) || limit <= 0) {
		limit = 10;
	}
	limit = Math.min(limit, 50);

	if (!query) {
		throw error(400, 'Missing query parameter: q');
	}

	const cacheKey = `${query}:${limit}`;
	const cached = getCached(cacheKey);
	if (cached) return json(cached);

	try {
		const deezerUrl = `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}&output=json`;
		const res = await fetch(deezerUrl);

		if (res.status === 429) {
			const retryAfter = res.headers.get('Retry-After') ?? '60';
			return new Response(JSON.stringify({ message: 'Rate limited by music provider' }), {
				status: 503,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': retryAfter,
				},
			});
		}

		if (!res.ok) {
			throw error(502, 'Music provider unavailable');
		}

		const data = await res.json();
		const tracks: Track[] = (data.data ?? []).map(mapDeezerTrack);
		setCached(cacheKey, tracks);

		try {
			const posthog = getPostHogClient();
			const { session } = await locals.safeGetSession();
			const distinctId = session?.user?.id;
			posthog.capture({
				distinctId,
				event: 'track_searched',
				properties: { query, result_count: tracks.length, limit },
			});
		} catch {}

		return json(tracks);
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(502, 'Music provider unavailable');
	}
};
