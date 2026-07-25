import { describe, it, expect, vi } from 'vitest';
import { loadDataset } from './dataset';
import { seed } from './seed';

/** A minimal Response stand-in; only the two members loadDataset touches. */
function response(init: { ok?: boolean; status?: number; json: () => Promise<unknown> }) {
	return { ok: init.ok ?? true, status: init.status ?? 200, ...init } as unknown as Response;
}

const fetchOf = (res: Response | Error) =>
	vi.fn(() =>
		res instanceof Error ? Promise.reject(res) : Promise.resolve(res),
	) as unknown as typeof fetch;

describe('loadDataset', () => {
	it('fetches and unwraps the dataset payload', async () => {
		const fetchFn = fetchOf(
			response({ json: () => Promise.resolve({ version: 'x', data: seed }) }),
		);
		const ds = await loadDataset(fetchFn);
		expect(ds.regions[0].name).toBeTruthy();
		expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/data/dataset.json'));
	});

	it('throws with the status on a non-ok response', async () => {
		// The failure that used to produce a permanent "Loading Star Chart…":
		// res.ok was never checked, so a 404 body went to res.json() and the
		// resulting rejection was unhandled.
		const fetchFn = fetchOf(response({ ok: false, status: 404, json: () => Promise.resolve({}) }));
		await expect(loadDataset(fetchFn)).rejects.toThrow(/404/);
	});

	it('propagates a network rejection', async () => {
		// e.g. the service worker's offline path returning Response.error().
		const fetchFn = fetchOf(new TypeError('Failed to fetch'));
		await expect(loadDataset(fetchFn)).rejects.toThrow(/Failed to fetch/);
	});

	it.each([
		['an empty object', {}],
		['a null body', null],
		['a payload with no data key', { version: 'x' }],
		['a payload with empty regions', { version: 'x', data: { ...seed, regions: [] } }],
	])('rejects %s rather than returning a half-built dataset', async (_label, body) => {
		// A well-formed JSON response that isn't the dataset (an SPA fallback,
		// an error envelope) passes res.ok and would otherwise surface much
		// later as "regions is undefined" somewhere deep in the UI.
		const fetchFn = fetchOf(response({ json: () => Promise.resolve(body) }));
		await expect(loadDataset(fetchFn)).rejects.toThrow(/regions/);
	});
});
