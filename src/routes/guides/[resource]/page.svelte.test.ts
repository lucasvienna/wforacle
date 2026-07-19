import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
import { guideDescription } from '$lib/seo/meta';
import { SITE_URL } from '$lib/seo/config';
import Page from './+page.svelte';
import type { PageData } from './$types';

const resource: Resource = {
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
		{
			phase: 'late',
			nodeLabel: 'Void — Aphrodite',
			boostersApply: false,
			note: '',
			source: 'https://wiki.warframe.com/neurodes-late',
			lastVerified: '2026-07-01',
		},
	],
};

const data = { resource, guide: null } as PageData;

describe('guide detail page', () => {
	it('sets a unique title, description, canonical, and JSON-LD', () => {
		render(Page, { data, params: { resource: resource.id } });

		expect(document.title).toBe('Neurodes Farming Guide — Best Locations | wforacle');

		const description = document.head.querySelector('meta[name="description"]');
		expect(description?.getAttribute('content')).toBe(guideDescription(resource));

		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/guides/neurodes`);

		const jsonLd = document.head.querySelector('script[type="application/ld+json"]');
		expect(jsonLd).not.toBeNull();
	});

	it('renders a custom boosterNote instead of the canned booster copy', () => {
		const custom: Resource = {
			...resource,
			recommendations: [
				{
					...resource.recommendations[0],
					boosterNote:
						'Resource Boosters double the mission payout — drop-chance boosters do nothing here.',
				},
			],
		};
		render(Page, {
			data: { resource: custom, guide: null } as PageData,
			params: { resource: custom.id },
		});

		expect(screen.getByText(/drop-chance boosters do nothing here/)).toBeInTheDocument();
		expect(screen.queryByText(/relies on enemy drop tables/)).not.toBeInTheDocument();
	});

	it('gives the resource icon a descriptive alt instead of a decorative empty one', () => {
		render(Page, { data, params: { resource: resource.id } });

		expect(screen.getByRole('img', { name: 'Neurodes' })).toBeInTheDocument();
	});
});
