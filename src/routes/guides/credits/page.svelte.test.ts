import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import Page from './+page.svelte';
import type { PageData } from './$types';

const fixtureResource: Resource = {
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
			// Out of phase order on purpose: the page must group by phase, not
			// trust dataset order.
			phase: 'late',
			nodeLabel: 'Venus — Profit-Taker Orb (Heist Phase 4)',
			boostersApply: true,
			boosterNote: 'Effigy and booster double the drops.',
			note: 'Guaranteed 125,000 credit drop.',
			source: 'https://wiki.warframe.com/w/Profit-Taker_Orb',
			lastVerified: '2026-07-23',
			regionId: 'venus',
		},
		{
			phase: 'mid',
			nodeLabel: 'Neptune — Laomedeia (Disruption)',
			boostersApply: true,
			boosterNote: 'Booster doubles the caches silently.',
			note: 'Rounds 1–4 pay 160,000 with all conduits defended.',
			source: 'https://wiki.warframe.com/w/Laomedeia',
			lastVerified: '2026-07-23',
			regionId: 'neptune',
		},
	],
};

const data = { resource: fixtureResource } as PageData;

describe('bespoke credits guide page', () => {
	it('sets the guide title, canonical and JSON-LD', () => {
		render(Page, { data, params: {} });
		expect(document.title).toBe('Credits Farming Guide — Best Locations | wforacle');
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/guides/credits`);
		expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
	});

	it('renders every recommendation card with its booster note and source', () => {
		render(Page, { data, params: {} });
		expect(screen.getByText('Ceres — Seimeni / Gabii (Dark Sector)')).toBeInTheDocument();
		expect(screen.getByText('Neptune — Laomedeia (Disruption)')).toBeInTheDocument();
		expect(screen.getByText('Venus — Profit-Taker Orb (Heist Phase 4)')).toBeInTheDocument();
		expect(screen.getByText(/Effigy and booster double the drops/)).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /source/i })).toHaveLength(3);
	});

	it('groups cards early → mid → late regardless of dataset order', () => {
		render(Page, { data, params: {} });
		const headings = screen.getAllByRole('heading', { level: 3 });
		const labels = headings.map((h) => h.textContent);
		const early = labels.indexOf('Ceres — Seimeni / Gabii (Dark Sector)');
		const mid = labels.indexOf('Neptune — Laomedeia (Disruption)');
		const late = labels.indexOf('Venus — Profit-Taker Orb (Heist Phase 4)');
		expect(early).toBeLessThan(mid);
		expect(mid).toBeLessThan(late);
	});

	it('gives the credits icon a descriptive alt', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('img', { name: 'Credits' })).toBeInTheDocument();
	});

	it('explains the two-channel rule with the first-win warning', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /two-channel rule/i })).toBeInTheDocument();
		expect(screen.getByText('End-of-mission rewards')).toBeInTheDocument();
		expect(screen.getByText(/Pickups & caches/)).toBeInTheDocument();
		expect(screen.getByText(/wastes the First Win Bonus/i)).toBeInTheDocument();
	});

	it('renders the multiplier stacking table with the 500k worked example', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /stacking multipliers/i })).toBeInTheDocument();
		expect(screen.getByRole('cell', { name: "Chroma's Effigy" })).toBeInTheDocument();
		expect(screen.getByText(/500,000 per kill/)).toBeInTheDocument();
	});

	it('busts outdated advice', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /outdated advice/i })).toBeInTheDocument();
		// "Secura Lecta" appears in two myth entries — assert presence, not uniqueness.
		expect(screen.getAllByText(/Secura Lecta/).length).toBeGreaterThan(0);
		expect(screen.getByText(/Gian Point/)).toBeInTheDocument();
	});

	it('lists honorable mentions and sources', () => {
		render(Page, { data, params: {} });
		// "Railjack" also appears in the two-channel rewards panel.
		expect(screen.getAllByText(/Railjack/).length).toBeGreaterThan(0);
		expect(screen.getByRole('link', { name: /Credits — Warframe Wiki/i })).toBeInTheDocument();
	});
});
