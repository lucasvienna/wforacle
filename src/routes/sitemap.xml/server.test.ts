import { describe, it, expect, vi } from 'vitest';
import type { Dataset } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import { GET } from './+server';

const dataset: Dataset = {
	regions: [],
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
					note: 'Farm Eris on Earth.',
					source: 'https://wiki.warframe.com/neurodes',
					lastVerified: '2026-07-01',
				},
				{
					phase: 'late',
					nodeLabel: 'Void — Aphrodite',
					boostersApply: false,
					note: '',
					source: 'https://wiki.warframe.com/neurodes',
					lastVerified: '2026-07-10',
				},
			],
		},
		{
			// No recommendations — must not appear in the sitemap.
			id: 'ferrite',
			name: 'Ferrite',
			regionIds: ['mars'],
			recommendations: [],
		},
	],
};

function fakeFetch() {
	return vi
		.fn()
		.mockResolvedValue({ json: () => Promise.resolve({ version: 'x', data: dataset }) });
}

describe('GET /sitemap.xml', () => {
	it('returns an XML urlset listing the home page, guides hub, and each guide', async () => {
		const fetchFn = fakeFetch();
		const res = await GET({ fetch: fetchFn } as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/application\/xml/);

		const body = await res.text();
		expect(body).toContain('<urlset');
		expect(body).toContain(`<loc>${SITE_URL}/</loc>`);
		expect(body).toContain(`<loc>${SITE_URL}/guides</loc>`);
		expect(body).toContain(`<loc>${SITE_URL}/guides/neurodes</loc>`);
		// The latest lastVerified for this guide's own recommendations.
		expect(body).toContain('<lastmod>2026-07-10</lastmod>');
		// Resources without recommendations must not get a guide URL.
		expect(body).not.toContain(`${SITE_URL}/guides/ferrite`);
	});
});
