import { describe, it, expect, vi } from 'vitest';
import type { Dataset } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import { GET } from './+server';

const dataset: Dataset = {
	// These routes only read `resources`, but loadDataset now rejects a payload
	// with no regions (it's how a non-dataset response — an SPA fallback, an
	// error envelope — is caught), and a real dataset can never have zero
	// regions: build-data.ts's count floors reject it. So the fixture carries
	// one.
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet' as const,
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: ['neurodes'],
		},
	],
	nodes: [],
	bosses: [],
	warframes: [],
	quests: [],
	openWorldFarms: [],
	resources: [
		{
			id: 'neurodes',
			name: 'Neurodes',
			regionIds: ['earth'],
			recommendations: [
				{
					phase: 'early',
					nodeLabel: 'Earth — Eris',
					boostersApply: true,
					note: 'Farm Eris on Earth for a steady Neurodes drop.',
					source: 'https://wiki.warframe.com/neurodes',
					lastVerified: '2026-07-01',
				},
			],
		},
		{
			// No recommendations — must not be listed as a guide.
			id: 'ferrite',
			name: 'Ferrite',
			regionIds: ['mars'],
			recommendations: [],
		},
	],
};

function fakeFetch() {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ version: 'x', data: dataset }),
	});
}

describe('GET /llms.txt', () => {
	it('returns plain-text markdown listing the site and each guide', async () => {
		const fetchFn = fakeFetch();
		const res = await GET({ fetch: fetchFn } as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/text\/plain/);

		const body = await res.text();
		expect(body).toContain('# wforacle');
		expect(body).toContain(`${SITE_URL}/`);
		expect(body).toContain(`${SITE_URL}/guides`);
		expect(body).toContain('## Farming Guides');
		expect(body).toContain(
			`- [Neurodes farming guide](${SITE_URL}/guides/neurodes): Farm Eris on Earth for a steady Neurodes drop.`,
		);
		expect(body).not.toContain('Ferrite');
	});
});
