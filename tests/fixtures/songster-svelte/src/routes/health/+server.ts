import { json } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import type { RequestHandler } from './$types';

const startTime = Date.now();

let version = 'unknown';
try {
	const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
	version = pkg.version ?? 'unknown';
} catch {
	/* fallback */
}

export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		version,
		uptime: Math.floor((Date.now() - startTime) / 1000),
	});
};
