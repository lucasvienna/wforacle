import type { RequestHandler } from './$types';
import { buildWorldState, type RawCycle, type RawSyndicate } from './parse';

export const prerender = false;

const BASE = 'https://api.warframestat.us/pc';

// Bounded per endpoint. Without this a hung upstream holds the Worker
// invocation open indefinitely; the browser poll is every 60s, so anything
// slower than a few seconds is already useless to the client.
const TIMEOUT_MS = 5000;

// Synthetic, stable key for the Workers edge cache (caches.default). Absent in
// dev/test — guarded so the handler still works uncached there.
const CACHE_KEY = 'https://worldstate.internal/api/worldstate';

/**
 * Fetch one upstream endpoint as JSON.
 *
 * The `as T` is the one assertion left, and it is the honest kind: Response
 * .json() is typed `any` and this project deliberately carries no runtime
 * schema validator (see docs/revamp/03-strategy.md). It is tolerable because
 * every consumer degrades on a missing field — toCycle falls back to
 * 'unknown'/'', deriveRotation to { letter: null }.
 *
 * What it replaces was not tolerable: a `Promise.all(ENDPOINTS.map(…))` result
 * cast `as Parameters<typeof buildWorldState>`, asserting a 4-element array
 * into a 5-tuple. That compiled only because destructuring four elements off a
 * 5-tuple is legal, so the arity was never checked.
 */
async function fetchEndpoint<T>(endpoint: string): Promise<T> {
	try {
		const res = await fetch(`${BASE}/${endpoint}?language=en`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return (await res.json()) as T;
	} catch (e) {
		// Re-thrown with the endpoint name attached. A timeout's DOMException
		// names neither the endpoint nor the cause, which is useless in a log
		// line with four fetches in flight.
		throw new Error(`${endpoint}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
	}
}

export const GET: RequestHandler = async () => {
	const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	if (edge) {
		const hit = await edge.match(CACHE_KEY);
		if (hit) return hit;
	}
	try {
		// An explicit 4-element array rather than ENDPOINTS.map(), so the tuple
		// type is genuinely inferred instead of asserted.
		const [cetus, vallis, cambion, syndicates] = await Promise.all([
			fetchEndpoint<RawCycle>('cetusCycle'),
			fetchEndpoint<RawCycle>('vallisCycle'),
			fetchEndpoint<RawCycle>('cambionCycle'),
			fetchEndpoint<RawSyndicate[]>('syndicateMissions'),
		]);
		const body = buildWorldState(cetus, vallis, cambion, syndicates, new Date().toISOString());
		const res = new Response(JSON.stringify(body), {
			headers: {
				'content-type': 'application/json',
				'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
			},
		});
		// Best-effort cache write: a put failure must not fall through to the
		// catch and discard an otherwise-good payload.
		if (edge) await edge.put(CACHE_KEY, res.clone()).catch(() => {});
		return res;
	} catch (e) {
		// The only visibility into upstream breakage. Workers invocation_logs are
		// enabled, so this surfaces in `wrangler tail`; the previous bare
		// `catch {}` discarded which endpoint and status had failed.
		console.error('[worldstate] upstream fetch failed:', e instanceof Error ? e.message : e);
		return new Response(JSON.stringify({ ok: false }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
		});
	}
};
