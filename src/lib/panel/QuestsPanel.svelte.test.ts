import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import QuestsPanel from './QuestsPanel.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Dataset } from '$lib/model/types';

const ds = {
	quests: [
		{
			id: 'heartofdeimos',
			name: 'Heart of Deimos',
			revealsRegionIds: ['deimos'],
			revealsFrameIds: ['nekros'],
		},
		{
			id: 'thewarwithin',
			name: 'The War Within',
			revealsRegionIds: ['kuvafortress'],
			revealsFrameIds: [],
		},
	],
	regions: [
		{
			id: 'deimos',
			name: 'Deimos',
			kind: 'special',
			progressionOrder: 15,
			factions: ['Infested'],
			nodeIds: [],
			spoilerGated: true,
			questId: 'heartofdeimos',
			resourceIds: [],
		},
		{
			id: 'kuvafortress',
			name: 'Kuva Fortress',
			kind: 'special',
			progressionOrder: 18,
			factions: ['Grineer'],
			nodeIds: [],
			spoilerGated: true,
			questId: 'thewarwithin',
			resourceIds: [],
		},
	],
	nodes: [],
	bosses: [],
	warframes: [],
	resources: [],
} as unknown as Dataset;

describe('QuestsPanel', () => {
	it('renders each quest name and its revealed region names', () => {
		const tracker = createTracker([]);
		render(QuestsPanel, { dataset: ds, tracker });
		expect(screen.getByText('Heart of Deimos')).toBeInTheDocument();
		expect(screen.getByText('The War Within')).toBeInTheDocument();
		expect(screen.getByText(/Reveals: Deimos/)).toBeInTheDocument();
	});

	it('toggles a quest done state on row click', async () => {
		const tracker = createTracker([]);
		render(QuestsPanel, { dataset: ds, tracker });
		const row = document.querySelector('[data-quest="heartofdeimos"]') as HTMLElement;
		expect(row.getAttribute('data-done')).toBe('false');
		await row.click();
		const updated = document.querySelector('[data-quest="heartofdeimos"]') as HTMLElement;
		expect(updated.getAttribute('data-done')).toBe('true');
	});
});
