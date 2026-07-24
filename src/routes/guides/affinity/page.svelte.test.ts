import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import Page from './+page.svelte';
import type { PageData } from './$types';

const fixtureResource: Resource = {
	id: 'affinity',
	name: 'Affinity',
	regionIds: ['saturn', 'sedna', 'jupiter', 'zariman'],
	recommendations: [
		{
			phase: 'early',
			nodeLabel: 'Saturn — Helene (Defense)',
			boostersApply: true,
			boosterNote: 'Affinity Booster doubles everything here.',
			note: 'Level 21–26 Defense, rewards every 3 waves.',
			source: 'https://wiki.warframe.com/w/Helene',
			lastVerified: '2026-07-24',
			regionId: 'saturn',
		},
		{
			// Out of phase order on purpose: the page must group by phase, not
			// trust dataset order.
			phase: 'late',
			nodeLabel: 'Jupiter — Elara (Steel Path Survival)',
			boostersApply: true,
			boosterNote: 'Steel Path bonuses are drop chance, not affinity.',
			note: 'Level 115–120 Corpus Survival leech farm.',
			source: 'https://wiki.warframe.com/w/Elara',
			lastVerified: '2026-07-24',
			regionId: 'jupiter',
		},
		{
			phase: 'mid',
			nodeLabel: 'Sanctuary Onslaught (Cephalon Simaris)',
			boostersApply: true,
			boosterNote: 'Booster doubles the kill volume.',
			note: 'Leave at zone 8 for a full AABC.',
			source: 'https://wiki.warframe.com/w/Sanctuary_Onslaught',
			lastVerified: '2026-07-24',
		},
	],
};

const data = { resource: fixtureResource } as PageData;

describe('bespoke affinity guide page', () => {
	it('sets the guide title, canonical and JSON-LD', () => {
		render(Page, { data, params: {} });
		expect(document.title).toBe('Affinity Farming Guide — Fastest XP Locations | wforacle');
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/guides/affinity`);
		expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
	});

	it('renders every recommendation card with its booster note and source', () => {
		render(Page, { data, params: {} });
		expect(screen.getByText('Saturn — Helene (Defense)')).toBeInTheDocument();
		expect(screen.getByText('Sanctuary Onslaught (Cephalon Simaris)')).toBeInTheDocument();
		expect(screen.getByText('Jupiter — Elara (Steel Path Survival)')).toBeInTheDocument();
		expect(screen.getByText(/drop chance, not affinity/)).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /source/i })).toHaveLength(3);
	});

	it('groups cards early → mid → late regardless of dataset order', () => {
		render(Page, { data, params: {} });
		const headings = screen.getAllByRole('heading', { level: 3 });
		const labels = headings.map((h) => h.textContent);
		const early = labels.indexOf('Saturn — Helene (Defense)');
		const mid = labels.indexOf('Sanctuary Onslaught (Cephalon Simaris)');
		const late = labels.indexOf('Jupiter — Elara (Steel Path Survival)');
		expect(early).toBeLessThan(mid);
		expect(mid).toBeLessThan(late);
	});

	it('gives the affinity icon a descriptive alt', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('img', { name: 'Affinity' })).toBeInTheDocument();
	});

	it('explains the sharing rules with the loadout warning', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /sharing rules/i })).toBeInTheDocument();
		expect(screen.getByText('Your kills')).toBeInTheDocument();
		expect(screen.getByText(/Squad kills/)).toBeInTheDocument();
		expect(screen.getByText(/only the gear you.re leveling/i)).toBeInTheDocument();
	});

	it('renders the multiplier stacking table with the ×5 worked example', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /stacking multipliers/i })).toBeInTheDocument();
		expect(screen.getByRole('cell', { name: 'Smeeta Kavat Charm' })).toBeInTheDocument();
		expect(screen.getByText(/×5 on every kill/)).toBeInTheDocument();
	});

	it('busts outdated advice', () => {
		render(Page, { data, params: {} });
		expect(screen.getByRole('heading', { name: /outdated advice/i })).toBeInTheDocument();
		// "Draco" and "Steel Path" each appear in both a claim and elsewhere —
		// assert presence, not uniqueness.
		expect(screen.getAllByText(/Draco/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Steel Path/).length).toBeGreaterThan(0);
	});

	it('lists honorable mentions and sources', () => {
		render(Page, { data, params: {} });
		expect(screen.getByText(/Solstice Square/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Affinity — Warframe Wiki/i })).toBeInTheDocument();
	});
});
