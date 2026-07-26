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

	// P2: a background tab kept polling every 60s and ticking every second
	// forever. Nothing was watching, and it costs battery and edge requests.
	describe('visibility gating', () => {
		function setHidden(hidden: boolean) {
			Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		}

		// Without this, "stops polling while the tab is hidden" leaves
		// document.hidden true for every later test in the file. The suite only
		// survived because each test happened to set it explicitly first — a trap
		// for whoever adds the next one.
		afterEach(() => {
			Object.defineProperty(document, 'hidden', { value: false, configurable: true });
		});

		it('stops polling while the tab is hidden', async () => {
			server.use(okHandler());
			let requests = 0;
			server.events.on('request:start', () => {
				requests += 1;
			});
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);

			setHidden(true);
			const whenHidden = requests;
			await vi.advanceTimersByTimeAsync(300_000);

			expect(requests).toBe(whenHidden);
			store.dispose();
		});

		it('refreshes immediately on becoming visible again', async () => {
			// Whatever is on screen is by then up to a poll interval stale, so
			// waiting another 60s to correct it would be the wrong trade.
			server.use(okHandler());
			let requests = 0;
			server.events.on('request:start', () => {
				requests += 1;
			});
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);
			setHidden(true);
			await vi.advanceTimersByTimeAsync(300_000);
			const whenHidden = requests;

			setHidden(false);
			await vi.advanceTimersByTimeAsync(0);

			expect(requests).toBe(whenHidden + 1);
			store.dispose();
		});

		it('resumes polling after becoming visible, without doubling up', async () => {
			// startTimers uses ??=, so a second visible event cannot leave two
			// intervals running.
			server.use(okHandler());
			let requests = 0;
			server.events.on('request:start', () => {
				requests += 1;
			});
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);
			setHidden(true);
			setHidden(false);
			setHidden(false);
			await vi.advanceTimersByTimeAsync(0);
			const base = requests;

			await vi.advanceTimersByTimeAsync(60_000);

			expect(requests).toBe(base + 1);
			store.dispose();
		});

		it('stops listening after dispose', async () => {
			server.use(okHandler());
			let requests = 0;
			server.events.on('request:start', () => {
				requests += 1;
			});
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);
			store.dispose();
			const afterDispose = requests;

			setHidden(false);
			await vi.advanceTimersByTimeAsync(120_000);

			expect(requests).toBe(afterDispose);
		});

		it('does not start polling when the store is created in a hidden tab', async () => {
			// "Open link in a new tab": the store is constructed while hidden and
			// used later. Gating only the visibilitychange transition left this
			// case polling every 60s until the tab was first shown.
			Object.defineProperty(document, 'hidden', { value: true, configurable: true });
			server.use(okHandler());
			let requests = 0;
			server.events.on('request:start', () => {
				requests += 1;
			});
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);
			// The initial fetch still happens — the page needs data when read.
			const initial = requests;
			expect(initial).toBe(1);

			await vi.advanceTimersByTimeAsync(300_000);

			expect(requests).toBe(initial);
			store.dispose();
		});

		it('advances `now` on becoming visible, so countdowns are not a second stale', async () => {
			// `now` only moves on the 1s tick, so without an explicit update the
			// first frame after returning renders the pre-hide timestamp.
			server.use(okHandler());
			const store = createWorldStateStore();
			await vi.advanceTimersByTimeAsync(0);
			setHidden(true);
			const beforeHiddenGap = store.now;
			await vi.advanceTimersByTimeAsync(120_000);
			expect(store.now).toBe(beforeHiddenGap);

			setHidden(false);
			await vi.advanceTimersByTimeAsync(0);

			expect(store.now).toBeGreaterThan(beforeHiddenGap);
			store.dispose();
		});
	});
});
