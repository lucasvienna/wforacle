import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
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
	// The section shells, SEO block, card ordering and boosterNote fallback are
	// covered once in src/lib/guides/GuideLongform.svelte.test.ts. This spec
	// asserts only what is specific to the affinity guide: its own content file
	// and its two prose snippets.

	it('renders its own recommendation cards from the dataset entry', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getByText('Saturn — Helene (Defense)')).toBeInTheDocument();
		expect(screen.getByText('Jupiter — Elara (Steel Path Survival)')).toBeInTheDocument();
		expect(
			screen.getByText(/Steel Path bonuses are drop chance, not affinity/),
		).toBeInTheDocument();
	});

	it('gives the affinity icon a descriptive alt', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getByRole('img', { name: 'Affinity' })).toBeInTheDocument();
	});

	it('explains the sharing rules with the loadout warning', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getByRole('heading', { name: /sharing rules/i })).toBeInTheDocument();
		expect(screen.getByText('Your kills')).toBeInTheDocument();
		expect(screen.getByText('Squad kills')).toBeInTheDocument();
		expect(screen.getByText(/only the gear you’re leveling/i)).toBeInTheDocument();
	});

	it('lists affinity multipliers with the ×5 worked example, and no channel column', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getByRole('cell', { name: 'Smeeta Kavat Charm' })).toBeInTheDocument();
		// Every affinity multiplier applies to everything, so the column that
		// the credits guide needs must not appear here.
		expect(screen.queryByRole('columnheader', { name: /applies to/i })).not.toBeInTheDocument();
		expect(screen.getByText(/×5 on every kill/)).toBeInTheDocument();
	});

	it('busts outdated affinity advice', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getAllByText(/Steel Path/).length).toBeGreaterThan(0);
	});

	it('lists affinity honorable mentions and sources', () => {
		render(Page, { data, params: {}, form: undefined });
		expect(screen.getByText(/Adaro \(Sedna\) stealth/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Affinity — Warframe Wiki/i })).toBeInTheDocument();
	});
});
