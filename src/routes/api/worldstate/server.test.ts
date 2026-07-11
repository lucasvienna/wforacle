import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET } from './+server';

function mockFetch(byEndpoint: Record<string, unknown>, fail = false) {
	return vi.fn(async (url: string) => {
		if (fail) throw new Error('network down');
		const key = Object.keys(byEndpoint).find((k) => url.includes(k))!;
		return { ok: true, json: async () => byEndpoint[key] } as Response;
	});
}

afterEach(() => vi.unstubAllGlobals());

const fixtures = {
	cetusCycle: { state: 'day', expiry: 'c' },
	vallisCycle: { state: 'cold', expiry: 'v' },
	cambionCycle: { state: 'fass', expiry: 'm' },
	syndicateMissions: [
		{
			syndicate: 'Ostrons',
			expiry: '2026-07-11T21:00:00.000Z',
			jobs: [{ rewardPool: ['Korumm Blueprint'] }],
		},
	],
};

describe('GET /api/worldstate', () => {
	it('returns the composed world state on success', async () => {
		vi.stubGlobal('fetch', mockFetch(fixtures));
		const res = await GET({} as never);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.ok).toBe(true);
		expect(body.cetus).toEqual({ state: 'day', expiry: 'c' });
		expect(body.rotation).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
		expect(res.headers.get('cache-control')).toMatch(/s-maxage=60/);
	});
	it('returns { ok: false } and no-store on upstream failure', async () => {
		vi.stubGlobal('fetch', mockFetch(fixtures, true));
		const res = await GET({} as never);
		expect(await res.json()).toEqual({ ok: false });
		expect(res.headers.get('cache-control')).toBe('no-store');
	});
});
