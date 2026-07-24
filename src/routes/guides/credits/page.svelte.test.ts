import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import Page from './+page.svelte';
import type { PageData } from './$types';

export const fixtureResource: Resource = {
	id: 'credits',
	name: 'Credits',
	regionIds: ['ceres', 'neptune', 'venus'],
	recommendations: [
		{
			phase: 'early',
			nodeLabel: 'Ceres — Seimeni / Gabii (Dark Sector)',
			boostersApply: true,
			boosterNote: 'Credit Booster and First Win both apply.',
			note: 'Flat ~20,000 bonus per run.',
			source: 'https://wiki.warframe.com/w/Dark_Sector',
			lastVerified: '2026-07-23',
			regionId: 'ceres',
		},
		{
			phase: 'late',
			nodeLabel: 'Venus — Profit-Taker Orb (Heist Phase 4)',
			boostersApply: true,
			boosterNote: 'Effigy and booster double the drops.',
			note: 'Guaranteed 125,000 credit drop.',
			source: 'https://wiki.warframe.com/w/Profit-Taker_Orb',
			lastVerified: '2026-07-23',
			regionId: 'venus',
		},
	],
};

const data = { resource: fixtureResource } as PageData;

describe('bespoke credits guide page', () => {
	it('sets the guide title, canonical and JSON-LD', () => {
		render(Page, { data });
		expect(document.title).toBe('Credits Farming Guide — Best Locations | wforacle');
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/guides/credits`);
		expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
	});

	it('renders every recommendation card with its booster note and source', () => {
		render(Page, { data });
		expect(screen.getByText('Ceres — Seimeni / Gabii (Dark Sector)')).toBeInTheDocument();
		expect(screen.getByText('Venus — Profit-Taker Orb (Heist Phase 4)')).toBeInTheDocument();
		expect(screen.getByText(/Effigy and booster double the drops/)).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /source/i })).toHaveLength(2);
	});

	it('groups early cards before late cards', () => {
		render(Page, { data });
		const headings = screen.getAllByRole('heading', { level: 3 });
		const labels = headings.map((h) => h.textContent);
		expect(labels.indexOf('Ceres — Seimeni / Gabii (Dark Sector)')).toBeLessThan(
			labels.indexOf('Venus — Profit-Taker Orb (Heist Phase 4)'),
		);
	});

	it('gives the credits icon a descriptive alt', () => {
		render(Page, { data });
		expect(screen.getByRole('img', { name: 'Credits' })).toBeInTheDocument();
	});
});
