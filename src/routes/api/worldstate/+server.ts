import type { RequestHandler } from './$types';
import { buildWorldState } from './parse';

export const prerender = false;

const BASE = 'https://api.warframestat.us/pc';
const ENDPOINTS = ['cetusCycle', 'vallisCycle', 'cambionCycle', 'syndicateMissions'] as const;

// Synthetic, stable key for the Workers edge cache (caches.default). Absent in
// dev/test — guarded so the handler still works uncached there.
const CACHE_KEY = 'https://worldstate.internal/api/worldstate';

export const GET: RequestHandler = async () => {
	const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	if (edge) {
		const hit = await edge.match(CACHE_KEY);
		if (hit) return hit;
	}
	try {
		const [cetus, vallis, cambion, syndicates] = (await Promise.all(
			ENDPOINTS.map((e) =>
				fetch(`${BASE}/${e}?language=en`).then((r) => {
					if (!r.ok) throw new Error(`${e} ${r.status}`);
					return r.json();
				}),
			),
		)) as Parameters<typeof buildWorldState>;
		const body = buildWorldState(cetus, vallis, cambion, syndicates, new Date().toISOString());
		const res = new Response(JSON.stringify(body), {
			headers: {
				'content-type': 'application/json',
				'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
			},
		});
		if (edge) await edge.put(CACHE_KEY, res.clone());
		return res;
	} catch {
		return new Response(JSON.stringify({ ok: false }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
		});
	}
};
