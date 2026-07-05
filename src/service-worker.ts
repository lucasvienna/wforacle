/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `wforacle-${version}`;
const sw = self as unknown as ServiceWorkerGlobalScope;
// `build`/`files` cover the JS bundle and static assets, but this app's page
// is prerendered (see +layout.ts) rather than served by the SSR entry, so its
// HTML lives outside both lists. Precache the app-shell URL (the SW's own
// registration scope, e.g. "/") explicitly so the very first offline reload
// — before any runtime navigation has had a chance to populate the cache —
// still has something to serve.
const PRECACHE = [...build, ...files, sw.registration.scope];

sw.addEventListener('install', (e) => {
	e.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(PRECACHE))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim()),
	);
});

sw.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	// Data: stale-while-revalidate — instant from cache, refresh in background.
	if (url.pathname.endsWith('/data/dataset.json')) {
		e.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const cached = await cache.match(req);
				const network = fetch(req)
					.then((res) => {
						cache.put(req, res.clone());
						return res;
					})
					.catch(() => cached);
				return cached ?? network;
			}),
		);
		return;
	}

	// Everything else: cache-first, falling back to network (offline shell).
	// Successful network responses are cached at runtime too, so any route
	// beyond the precached shell also becomes available offline after one visit.
	e.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(req);
			if (cached) return cached;
			const res = await fetch(req);
			if (res.ok) cache.put(req, res.clone());
			return res;
		}),
	);
});
