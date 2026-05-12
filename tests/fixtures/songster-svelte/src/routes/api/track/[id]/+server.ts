import { error, json } from '@sveltejs/kit';
import type { DeezerTrackData, Track } from '$lib/types';
import type { RequestHandler } from './$types';
import { getPostHogClient } from '$lib/server/posthog';

const DEEZER_API = 'https://api.deezer.com';

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

export const GET: RequestHandler = async ({ params, locals }) => {
	const deezerId = parseInt(params.id, 10);
	if (Number.isNaN(deezerId)) {
		throw error(400, 'Invalid track ID');
	}

	try {
		const res = await fetch(`${DEEZER_API}/track/${deezerId}`);
		if (res.status === 404) {
			throw error(404, 'Track not found');
		}
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
		const track = mapDeezerTrack(data);

		try {
			const posthog = getPostHogClient();
			const { session } = await locals.safeGetSession();
			const distinctId = session?.user?.id;
			posthog.capture({
				distinctId,
				event: 'track_fetched',
				properties: {
					track_id: params.id,
					title: track.title,
					artist: track.artist,
					year: track.year,
				},
			});
		} catch {}

		return json(track);
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(502, 'Music provider unavailable');
	}
};
