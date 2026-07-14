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
					lastVerified: '2026-06-01',
				},
				{
					phase: 'late',
					nodeLabel: 'Void — Aphrodite',
					boostersApply: false,
					note: '',
					source: 'https://wiki.warframe.com/neurodes',
					// Guide A's own max — NOT the dataset-wide max.
					lastVerified: '2026-06-15',
				},
			],
		},
		{
			id: 'orokin-cell',
			name: 'Orokin Cell',
			regionIds: ['saturn'],
			recommendations: [
				{
					phase: 'early',
					nodeLabel: 'Saturn — Rhea',
					boostersApply: true,
					note: 'Farm Rhea on Saturn.',
					source: 'https://wiki.warframe.com/orokin-cell',
					lastVerified: '2026-07-05',
				},
				{
					phase: 'late',
					nodeLabel: 'Void — Ani',
					boostersApply: false,
					note: '',
					source: 'https://wiki.warframe.com/orokin-cell',
					// Guide B's own max — also the dataset-wide max.
					lastVerified: '2026-07-20',
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

// Extracts the single <url>...</url> block whose <loc> matches `loc` exactly,
// so a <lastmod> assertion can be tied to a specific URL rather than merely
// asserting the date string appears somewhere in the whole document.
function urlBlockForLoc(body: string, loc: string): string {
	const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = body.match(new RegExp(`<url><loc>${escaped}</loc>.*?</url>`));
	if (!match) {
		throw new Error(`No <url> block found for loc ${loc}`);
	}
	return match[0];
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
		expect(body).toContain(`<loc>${SITE_URL}/guides/orokin-cell</loc>`);
		// Resources without recommendations must not get a guide URL.
		expect(body).not.toContain(`${SITE_URL}/guides/ferrite`);
	});

	it('gives each guide its own latest lastVerified as <lastmod>', async () => {
		const fetchFn = fakeFetch();
		const res = await GET({ fetch: fetchFn } as unknown as Parameters<typeof GET>[0]);
		const body = await res.text();

		const neurodesBlock = urlBlockForLoc(body, `${SITE_URL}/guides/neurodes`);
		expect(neurodesBlock).toContain('<lastmod>2026-06-15</lastmod>');

		const orokinBlock = urlBlockForLoc(body, `${SITE_URL}/guides/orokin-cell`);
		expect(orokinBlock).toContain('<lastmod>2026-07-20</lastmod>');
	});

	it("gives the home page and guides hub the dataset-wide max lastVerified, not one guide's date", async () => {
		const fetchFn = fakeFetch();
		const res = await GET({ fetch: fetchFn } as unknown as Parameters<typeof GET>[0]);
		const body = await res.text();

		// The dataset-wide max (2026-07-20, from orokin-cell) must be used for
		// both the home page and the guides hub — a regression that reused
		// neurodes' own max (2026-06-15) here would fail these assertions.
		const homeBlock = urlBlockForLoc(body, `${SITE_URL}/`);
		expect(homeBlock).toContain('<lastmod>2026-07-20</lastmod>');
		expect(homeBlock).not.toContain('<lastmod>2026-06-15</lastmod>');

		const guidesHubBlock = urlBlockForLoc(body, `${SITE_URL}/guides`);
		expect(guidesHubBlock).toContain('<lastmod>2026-07-20</lastmod>');
		expect(guidesHubBlock).not.toContain('<lastmod>2026-06-15</lastmod>');
	});
});
