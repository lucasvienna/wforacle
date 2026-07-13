import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

vi.mock('$app/environment', () => ({ browser: true }));
// resolve('/api/worldstate') must yield an absolute URL for undici; production
// resolve prefixes base ('') and resolves against the page origin, but node
// fetch has no origin, so the mock prefixes a concrete one.
vi.mock('$app/paths', () => ({
	resolve: (path: string) => `http://localhost:3000${path}`,
}));

import { createWorldStateStore } from './worldstate.svelte';
import type { WorldState } from './types';

const OK: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'day', expiry: 'c' },
	vallis: { state: 'cold', expiry: 'v' },
	cambion: { state: 'fass', expiry: 'm' },
	rotation: { letter: 'C', expiry: 'e' },
};

const okHandler = () => http.get('*/api/worldstate', () => HttpResponse.json(OK));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createWorldStateStore', () => {
	it('populates state from the first fetch', async () => {
		server.use(okHandler());
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.state).toEqual(OK);
		expect(store.error).toBe(false);
		store.dispose();
	});

	it('bypasses the browser HTTP cache so a long-open tab never polls stale data', async () => {
		let seenCache: string | undefined;
		server.use(
			http.get('*/api/worldstate', ({ request }) => {
				seenCache = request.cache;
				return HttpResponse.json(OK);
			}),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(seenCache).toBe('no-store');
		store.dispose();
	});

	it('sets error and keeps last state when the payload is { ok: false }', async () => {
		server.use(okHandler());
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		// A later matching handler takes precedence in MSW.
		server.use(http.get('*/api/worldstate', () => HttpResponse.json({ ok: false })));
		await store.refresh();
		expect(store.error).toBe(true);
		expect(store.state).toEqual(OK); // last good kept
		store.dispose();
	});

	it('sets error on network rejection', async () => {
		server.use(http.get('*/api/worldstate', () => HttpResponse.error()));
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.error).toBe(true);
		store.dispose();
	});

	it('dispose stops the poll timer (no further fetches)', async () => {
		server.use(okHandler());
		let requests = 0;
		server.events.on('request:start', () => {
			requests += 1;
		});
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		store.dispose();
		const afterDispose = requests;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(requests).toBe(afterDispose);
	});
});
