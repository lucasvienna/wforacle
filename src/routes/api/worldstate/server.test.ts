import { describe, it, expect, vi, afterEach } from 'vitest';
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
	// These specs spy on console.error and AbortSignal.timeout; leaking either
	// into a sibling test file would be a nasty debugging session.
	afterEach(() => vi.restoreAllMocks());

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

	it('logs which endpoint and status failed', async () => {
		// The old handler's bare `catch {}` threw away the one piece of
		// information that makes an upstream break diagnosable from
		// `wrangler tail`. Only cetusCycle fails here, so the log line has to
		// name it specifically rather than reporting "something broke".
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.get(PC_URL, ({ params }) =>
				params.endpoint === 'cetusCycle'
					? new HttpResponse(null, { status: 503 })
					: HttpResponse.json(fixtures[params.endpoint as string]),
			),
		);

		const res = await GET({} as never);

		expect(await res.json()).toEqual({ ok: false });
		const logged = spy.mock.calls.flat().join(' ');
		expect(logged).toContain('cetusCycle');
		expect(logged).toContain('503');

		// The Error itself is logged, not `e.message`: the message alone reads
		// identically in the assertions above but throws away the stack and the
		// `cause` that fetchEndpoint attaches, which is what you actually want
		// when reading `wrangler tail`.
		const [, error] = spy.mock.calls[0]!;
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).cause).toBeDefined();
	});

	it('bounds every upstream call with a timeout signal', async () => {
		// Pins the timeout wiring: without it a hung upstream holds the Worker
		// invocation open for the full subrequest limit.
		//
		// Asserted on AbortSignal.timeout rather than on the handler's
		// `request.signal`: Node gives every Request a fresh AbortSignal
		// regardless of what we pass, so the receiving-end version of this test
		// passes even with the option deleted — verified before writing this.
		// Tripping the timeout for real would cost 5s of wall clock per run.
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		server.use(
			http.get(PC_URL, ({ params }) => HttpResponse.json(fixtures[params.endpoint as string])),
		);

		await GET({} as never);

		expect(timeout).toHaveBeenCalledTimes(4);
		for (const [ms] of timeout.mock.calls) expect(ms).toBe(5000);
	});
});
