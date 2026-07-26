import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * The service worker was the largest untested file in the repo (audit T4) and
 * it owns the entire offline story: which responses get cached, which must not,
 * and what happens when the network is gone.
 *
 * It registers its listeners against `self` at import time, so the harness
 * below stubs `self` and `caches`, imports the module fresh, and invokes the
 * captured listeners with fake events.
 */
vi.mock('$service-worker', () => ({
	build: ['/_app/immutable/app.js'],
	files: ['/favicon.png'],
	version: 'test-version',
}));

const ORIGIN = 'http://localhost:3000';
const SCOPE = `${ORIGIN}/`;

/** Minimal in-memory CacheStorage. */
function makeCaches() {
	const stores = new Map<string, Map<string, Response>>();
	const api = {
		open: vi.fn(async (name: string) => {
			if (!stores.has(name)) stores.set(name, new Map());
			const store = stores.get(name)!;
			return {
				match: vi.fn(async (req: Request) => store.get(new URL(req.url).pathname)),
				put: vi.fn(async (req: Request, res: Response) => {
					store.set(new URL(req.url).pathname, res);
				}),
				addAll: vi.fn(async (urls: string[]) => {
					for (const u of urls) store.set(new URL(u, ORIGIN).pathname, new Response('precached'));
				}),
			};
		}),
		keys: vi.fn(async () => [...stores.keys()]),
		delete: vi.fn(async (name: string) => stores.delete(name)),
	};
	return { api, stores };
}

type Listener = (e: never) => void;

async function loadWorker() {
	const listeners = new Map<string, Listener>();
	const skipWaiting = vi.fn();
	const claim = vi.fn();
	const { api: cachesApi, stores } = makeCaches();

	vi.stubGlobal('self', {
		addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
		registration: { scope: SCOPE },
		skipWaiting,
		clients: { claim },
	});
	vi.stubGlobal('caches', cachesApi);

	vi.resetModules();
	await import('./service-worker');
	return { listeners, skipWaiting, claim, cachesApi, stores };
}

function lifecycleEvent() {
	const waited: Promise<unknown>[] = [];
	return { waitUntil: (p: Promise<unknown>) => waited.push(p), waited };
}

function fetchEvent(url: string, init: RequestInit = {}) {
	let responded: Promise<Response> | undefined;
	const waited: Promise<unknown>[] = [];
	return {
		request: new Request(url, init),
		respondWith: (p: Promise<Response>) => {
			responded = p;
		},
		waitUntil: (p: Promise<unknown>) => waited.push(p),
		get responded() {
			return responded;
		},
		waited,
	};
}

const CACHE = 'wforacle-test-version';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('service worker — lifecycle', () => {
	it('precaches the build, static files and the registration scope, then skips waiting', async () => {
		const { listeners, skipWaiting, stores } = await loadWorker();
		const e = lifecycleEvent();

		listeners.get('install')!(e as never);
		await Promise.all(e.waited);

		// The app shell is prerendered, so it is in neither build nor files —
		// the scope has to be precached explicitly or the first offline reload
		// has nothing to serve.
		expect([...stores.get(CACHE)!.keys()].sort()).toEqual([
			'/',
			'/_app/immutable/app.js',
			'/favicon.png',
		]);
		expect(skipWaiting).toHaveBeenCalled();
	});

	it('deletes caches from older versions and claims clients', async () => {
		const { listeners, claim, cachesApi, stores } = await loadWorker();
		stores.set('wforacle-old', new Map());
		stores.set(CACHE, new Map());

		const e = lifecycleEvent();
		listeners.get('activate')!(e as never);
		await Promise.all(e.waited);

		expect(cachesApi.delete).toHaveBeenCalledWith('wforacle-old');
		expect(cachesApi.delete).not.toHaveBeenCalledWith(CACHE);
		expect(claim).toHaveBeenCalled();
	});
});

describe('service worker — what it declines to handle', () => {
	it('ignores non-GET requests', async () => {
		const { listeners } = await loadWorker();
		const e = fetchEvent(`${ORIGIN}/api/worldstate`, { method: 'POST' });
		listeners.get('fetch')!(e as never);
		expect(e.responded).toBeUndefined();
	});

	it('ignores cross-origin requests', async () => {
		const { listeners } = await loadWorker();
		const e = fetchEvent('https://api.warframestat.us/pc/cetusCycle');
		listeners.get('fetch')!(e as never);
		expect(e.responded).toBeUndefined();
	});
});

describe('service worker — dataset (stale-while-revalidate)', () => {
	const URL_ = `${ORIGIN}/data/dataset.json`;

	it('serves the cached copy immediately and revalidates in the background', async () => {
		const { listeners, stores } = await loadWorker();
		stores.set(CACHE, new Map([['/data/dataset.json', new Response('cached')]]));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('fresh', { status: 200 })),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		expect(await (await e.responded)!.text()).toBe('cached');
		// waitUntil keeps the worker alive for the revalidation; without it the
		// browser may kill the SW before the cache write lands.
		expect(e.waited).toHaveLength(1);
		await Promise.all(e.waited);
		expect(await stores.get(CACHE)!.get('/data/dataset.json')!.text()).toBe('fresh');
	});

	it('does not let a transient non-2xx overwrite a good cached dataset', async () => {
		const { listeners, stores } = await loadWorker();
		stores.set(CACHE, new Map([['/data/dataset.json', new Response('good')]]));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('nope', { status: 500 })),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);
		await e.responded;
		await Promise.all(e.waited);

		expect(await stores.get(CACHE)!.get('/data/dataset.json')!.text()).toBe('good');
	});

	it('falls back to the network on a cold cache', async () => {
		const { listeners } = await loadWorker();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('fresh', { status: 200 })),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		expect(await (await e.responded)!.text()).toBe('fresh');
	});

	it('surfaces a network error rather than undefined when offline with no cache', async () => {
		// respondWith rejects on undefined, so the offline path must resolve to
		// an actual Response.
		const { listeners } = await loadWorker();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			}),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		const res = await e.responded;
		expect(res).toBeInstanceOf(Response);
		expect(res!.type).toBe('error');
	});
});

describe('service worker — /api/worldstate (network-first)', () => {
	const URL_ = `${ORIGIN}/api/worldstate`;

	it('prefers the network and caches a successful response', async () => {
		const { listeners, stores } = await loadWorker();
		stores.set(CACHE, new Map([['/api/worldstate', new Response('stale')]]));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('live', { status: 200 })),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		// Never frozen in the cache-first branch: live status must stay live.
		expect(await (await e.responded)!.text()).toBe('live');
		expect(await stores.get(CACHE)!.get('/api/worldstate')!.text()).toBe('live');
	});

	it('falls back to the last cached copy when offline', async () => {
		const { listeners, stores } = await loadWorker();
		stores.set(CACHE, new Map([['/api/worldstate', new Response('stale')]]));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			}),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		expect(await (await e.responded)!.text()).toBe('stale');
	});

	it('surfaces a network error when offline with nothing cached', async () => {
		const { listeners } = await loadWorker();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('offline');
			}),
		);

		const e = fetchEvent(URL_);
		listeners.get('fetch')!(e as never);

		expect((await e.responded)!.type).toBe('error');
	});
});

describe('service worker — everything else (cache-first)', () => {
	it('serves from cache without touching the network', async () => {
		const { listeners, stores } = await loadWorker();
		stores.set(CACHE, new Map([['/', new Response('shell')]]));
		const networkFetch = vi.fn();
		vi.stubGlobal('fetch', networkFetch);

		const e = fetchEvent(`${ORIGIN}/`);
		listeners.get('fetch')!(e as never);

		expect(await (await e.responded)!.text()).toBe('shell');
		expect(networkFetch).not.toHaveBeenCalled();
	});

	it('caches a successful response at runtime, so an unvisited route works offline next time', async () => {
		const { listeners, stores } = await loadWorker();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('guide page', { status: 200 })),
		);

		const e = fetchEvent(`${ORIGIN}/guides/cryotic`);
		listeners.get('fetch')!(e as never);
		await e.responded;

		expect(await stores.get(CACHE)!.get('/guides/cryotic')!.text()).toBe('guide page');
	});

	it('does not cache a non-2xx response', async () => {
		const { listeners, stores } = await loadWorker();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('not found', { status: 404 })),
		);

		const e = fetchEvent(`${ORIGIN}/nope`);
		listeners.get('fetch')!(e as never);
		await e.responded;

		expect(stores.get(CACHE)!.get('/nope')).toBeUndefined();
	});
});
