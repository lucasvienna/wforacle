import { describe, it, expect, vi } from 'vitest';
import type { Dataset, Resource } from '$lib/model/types';
import { load as loadResource } from './[resource]/+page.server';
import { load as loadCredits } from './credits/+page.server';
import { load as loadAffinity } from './affinity/+page.server';

/**
 * The three guide server loads had no coverage of their error branch. Each is
 * the sole gate between a missing dataset entry and a prerender that either
 * 404s correctly or fails confusingly.
 */
const resource = (id: string, name: string): Resource => ({
	id,
	name,
	regionIds: [],
	recommendations: [],
});

const datasetWith = (resources: Resource[]): Dataset =>
	({
		// loadDataset rejects a payload with no regions (it is how a non-dataset
		// response is caught), and a real dataset can never have zero.
		regions: [
			{
				id: 'earth',
				name: 'Earth',
				kind: 'planet' as const,
				progressionOrder: 1,
				factions: ['Grineer'],
				nodeIds: [],
				spoilerGated: false,
				resourceIds: [],
			},
		],
		nodes: [],
		bosses: [],
		warframes: [],
		resources,
		quests: [],
		openWorldFarms: [],
	}) as Dataset;

const fetchOf = (ds: Dataset) =>
	vi.fn(() =>
		Promise.resolve({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ version: 'x', data: ds }),
		}),
	) as unknown as typeof fetch;

const call = (load: (e: never) => unknown, ds: Dataset, params: Record<string, string> = {}) =>
	load({ fetch: fetchOf(ds), params } as never) as Promise<{ resource: Resource }>;

describe('guides/[resource] server load', () => {
	const ds = datasetWith([resource('orokincell', 'Orokin Cell')]);

	it('returns only the matched resource, never the dataset', async () => {
		const data = await call(loadResource, ds, { resource: 'orokincell' });
		expect(Object.keys(data)).toEqual(['resource']);
		expect(data.resource.name).toBe('Orokin Cell');
	});

	it('404s on an unknown resource', async () => {
		// Without this the prerender would fail on a confusing undefined access
		// rather than a clean 404.
		await expect(call(loadResource, ds, { resource: 'unobtainium' })).rejects.toMatchObject({
			status: 404,
		});
	});
});

describe.each([
	['credits', loadCredits],
	['affinity', loadAffinity],
])('guides/%s server load', (id, load) => {
	it('returns its own dataset entry', async () => {
		const data = await call(load, datasetWith([resource(id, id)]));
		expect(data.resource.id).toBe(id);
	});

	it('404s when the entry is missing from the dataset', async () => {
		// These are bespoke static routes: if a data refresh ever dropped the
		// entry, the page would otherwise prerender empty rather than fail.
		await expect(call(load, datasetWith([]))).rejects.toMatchObject({ status: 404 });
	});
});
