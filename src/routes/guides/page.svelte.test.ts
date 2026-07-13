import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import type { Dataset } from '$lib/model/types';

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
					note: '  Farm Eris on Earth for a steady Neurodes drop.  ',
					source: 'https://wiki.warframe.com/neurodes',
					lastVerified: '2026-07-01',
				},
			],
		},
		{
			id: 'plastids',
			name: 'Plastids',
			regionIds: ['venus'],
			recommendations: [
				{
					phase: 'late',
					nodeLabel: 'Venus — Aphrodite',
					boostersApply: false,
					note: '',
					source: 'https://wiki.warframe.com/plastids',
					lastVerified: '2026-07-01',
				},
			],
		},
		{
			// No recommendations — must not render a guide card.
			id: 'ferrite',
			name: 'Ferrite',
			regionIds: ['mars'],
			recommendations: [],
		},
	],
};

vi.mock('$lib/data/dataset', () => ({
	loadDataset: () => Promise.resolve(dataset),
}));

import { load } from './+page';
import Page from './+page.svelte';
import type { PageData } from './$types';

describe('guides hub page', () => {
	it('lists only resources with recommendations, linking each to its guide', async () => {
		const data = (await load({ fetch } as Parameters<typeof load>[0])) as PageData;
		render(Page, { data, params: {} });

		expect(
			screen.getByRole('heading', { level: 1, name: 'Warframe Resource Farming Guides' }),
		).toBeInTheDocument();

		const neurodesLink = screen.getByRole('link', { name: /Neurodes/i });
		expect(neurodesLink.getAttribute('href')).toMatch(/\/guides\/neurodes$/);
		expect(screen.getByText('Farm Eris on Earth for a steady Neurodes drop.')).toBeInTheDocument();

		const plastidsLink = screen.getByRole('link', { name: /Plastids/i });
		expect(plastidsLink.getAttribute('href')).toMatch(/\/guides\/plastids$/);
		expect(screen.getByText('Best places to farm Plastids.')).toBeInTheDocument();

		expect(screen.queryByText('Ferrite')).toBeNull();
	});
});
