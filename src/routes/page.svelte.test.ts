import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { seed } from '$lib/data/seed';

const withDeimos = {
	...seed,
	regions: [
		...seed.regions,
		{
			id: 'deimos',
			name: 'Deimos',
			kind: 'special' as const,
			progressionOrder: 15,
			factions: ['Infested'],
			nodeIds: [],
			spoilerGated: true,
			questId: 'heartofdeimos',
			resourceIds: [],
		},
	],
	resources: [
		{
			id: 'ferrite',
			name: 'Ferrite',
			regionIds: ['venus'],
			recommendations: [
				{
					phase: 'early' as const,
					nodeLabel: 'x',
					regionId: 'venus',
					boostersApply: true,
					note: '',
					source: 'https://wiki.warframe.com/x',
					lastVerified: '2026-07-06',
				},
				{
					phase: 'late' as const,
					nodeLabel: 'y',
					regionId: 'venus',
					boostersApply: true,
					note: '',
					source: 'https://wiki.warframe.com/y',
					lastVerified: '2026-07-06',
				},
			],
		},
	],
	quests: [
		{
			id: 'heartofdeimos',
			name: 'Heart of Deimos',
			revealsRegionIds: ['deimos'],
			revealsFrameIds: ['nekros'],
		},
	],
};

vi.mock('$lib/data/dataset', () => ({
	loadDataset: () => Promise.resolve(withDeimos),
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
}));

import { goto } from '$app/navigation';
import Page from './+page.svelte';

const directoryFixture = {
	directory: [
		{
			id: 'venus',
			name: 'Venus',
			frames: ['Rhino'],
			resources: [
				{ id: 'ferrite', name: 'Ferrite', hasGuide: true },
				{ id: 'salvage', name: 'Salvage', hasGuide: false },
			],
		},
	],
};

describe('home page', () => {
	it('renders the h1, intro, directory, and guides link immediately (before dataset onMount resolves)', () => {
		render(Page, { data: directoryFixture, params: {} });

		const h1 = screen.getByRole('heading', { level: 1 });
		expect(h1.textContent?.trim().toLowerCase()).not.toBe('wforacle');
		expect(h1.textContent).toBeTruthy();

		// directory section: planet name, frame name, guide link vs. plain text
		expect(screen.getByText('Venus')).toBeInTheDocument();
		expect(screen.getByText(/Rhino/)).toBeInTheDocument();
		const resourceLink = screen.getByRole('link', { name: 'Ferrite' });
		expect(resourceLink).toHaveAttribute('href', expect.stringMatching(/\/guides\/ferrite$/));
		expect(screen.getByText('Salvage')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Salvage' })).toBeNull();

		// hub link in the footer
		const guidesLink = screen.getByRole('link', { name: /browse all resource farming guides/i });
		expect(guidesLink).toHaveAttribute('href', expect.stringMatching(/\/guides$/));
	});

	it('renders brand immediately and chart+panel after data loads', async () => {
		render(Page, { data: directoryFixture, params: {} });
		// brand text is split across nested <span>s for styling, so the default
		// getByText (which only checks direct text nodes) can't match it directly;
		// use a matcher function that checks the element's full textContent instead.
		// Restrict to the <span> itself — while data is loading the <header> has
		// no other content, so its textContent also collapses to "wforacle" and
		// would otherwise ambiguously match alongside the brand span.
		expect(
			screen.getByText(
				(_, element) =>
					element?.tagName === 'SPAN' && element?.textContent?.trim().toLowerCase() === 'wforacle',
			),
		).toBeInTheDocument();
		// dataset load is async (onMount), so chart/panel only appear once it resolves
		await waitFor(() => expect(screen.getByText('VENUS')).toBeInTheDocument());
		// panel (Venus selected) — boss name appears in subtitle + part-source labels
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);

		// Deimos is spoiler-gated behind the Heart of Deimos quest — hidden by default.
		expect(screen.queryByText('DEIMOS')).toBeNull();
		// The Quests panel now lives inside the Settings drawer, which is closed
		// by default — so the quest row isn't in the document yet.
		expect(screen.queryByText('Heart of Deimos')).toBeNull();

		// Opening the settings drawer reveals the Quests panel.
		const settingsBtn = document.querySelector('[data-open-settings]') as HTMLElement;
		expect(settingsBtn).not.toBeNull();
		await fireEvent.click(settingsBtn);
		expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0);
		const questRow = document.querySelector('[data-quest="heartofdeimos"]');
		expect(questRow).not.toBeNull();

		// Toggling the quest reveals Deimos on the chart via the reactive
		// revealedRegions() derivation.
		(questRow as HTMLElement).click();
		await waitFor(() => expect(screen.getByText('DEIMOS')).toBeInTheDocument());
	});

	it('opens the command palette via the header chip, selects a region, and navigates to a resource guide', async () => {
		render(Page, { data: directoryFixture, params: {} });
		await waitFor(() => expect(screen.getByText('VENUS')).toBeInTheDocument());

		expect(screen.queryByRole('dialog')).toBeNull();
		const chip = document.querySelector('[data-open-palette]') as HTMLElement;
		expect(chip).not.toBeNull();
		await fireEvent.click(chip);
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const input = screen.getByPlaceholderText(/search planets, frames, resources/i);
		await fireEvent.input(input, { target: { value: 'Mars' } });
		const marsOptions = await screen.findAllByRole('option', { name: /Mars/i });
		const marsRegionOption = marsOptions.find(
			(el) => el.getAttribute('data-type') === 'region',
		) as HTMLElement;
		expect(marsRegionOption).toBeTruthy();
		await fireEvent.click(marsRegionOption);
		expect(screen.queryByRole('dialog')).toBeNull();

		// reopen via Ctrl-K keyboard shortcut and pick the resource guide
		await fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		const input2 = screen.getByPlaceholderText(/search planets, frames, resources/i);
		await fireEvent.input(input2, { target: { value: 'Ferrite' } });
		const ferriteOption = await screen.findByRole('option', { name: /Ferrite/i });
		await fireEvent.click(ferriteOption);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(goto).toHaveBeenCalledWith(expect.stringMatching(/\/guides\/ferrite$/));
	});
});
