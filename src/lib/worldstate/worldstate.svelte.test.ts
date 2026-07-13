import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

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

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('createWorldStateStore', () => {
	it('populates state from the first fetch', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ json: async () => OK }) as Response),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.state).toEqual(OK);
		expect(store.error).toBe(false);
		store.dispose();
	});
	it('bypasses the browser HTTP cache so a long-open tab never polls stale data', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
		vi.stubGlobal('fetch', fetchMock);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ cache: 'no-store' }),
		);
		store.dispose();
	});
	it('sets error and keeps last state when the payload is { ok: false }', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
		vi.stubGlobal('fetch', fetchMock);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		fetchMock.mockResolvedValueOnce({
			json: async () => ({ ok: false }),
		} as Response);
		await store.refresh();
		expect(store.error).toBe(true);
		expect(store.state).toEqual(OK); // last good kept
		store.dispose();
	});
	it('sets error on network rejection', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('down');
			}),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.error).toBe(true);
		store.dispose();
	});
	it('dispose stops the poll timer (no further fetches)', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
		vi.stubGlobal('fetch', fetchMock);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		store.dispose();
		fetchMock.mockClear();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
