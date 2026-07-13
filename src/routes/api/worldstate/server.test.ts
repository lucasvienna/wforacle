import { describe, it, expect } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { server } from '../../../mocks/server';
import { GET } from './+server';

const fixtures: Record<string, JsonBodyType> = {
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

const PC_URL = 'https://api.warframestat.us/pc/:endpoint';

describe('GET /api/worldstate', () => {
	it('returns the composed world state on success', async () => {
		server.use(
			http.get(PC_URL, ({ params }) => HttpResponse.json(fixtures[params.endpoint as string])),
		);
		const res = await GET({} as never);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.ok).toBe(true);
		expect(body.cetus).toEqual({ state: 'day', expiry: 'c' });
		expect(body.rotation).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
		expect(res.headers.get('cache-control')).toMatch(/s-maxage=60/);
	});

	it('returns { ok: false } and no-store on upstream failure', async () => {
		server.use(http.get(PC_URL, () => HttpResponse.error()));
		const res = await GET({} as never);
		expect(await res.json()).toEqual({ ok: false });
		expect(res.headers.get('cache-control')).toBe('no-store');
	});
});
