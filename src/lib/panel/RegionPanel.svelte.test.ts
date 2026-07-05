import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RegionPanel from './RegionPanel.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';

describe('RegionPanel', () => {
	it('shows the boss, frame, and faction for an assassination region', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		// Boss name appears in the subtitle (and as part-source labels).
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);
		expect(screen.getByText(/Rhino/)).toBeInTheDocument();
		expect(screen.getByText(/Corpus · Assassination/)).toBeInTheDocument();
	});
	it('toggles a part on row click', async () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		const row = screen.getByText('Chassis').closest('[data-part]') as HTMLElement;
		expect(row.getAttribute('data-owned')).toBe('false');
		await row.click();
		expect(tracker.isOwned('rhino:chassis')).toBe(true);
	});
	it('shows an empty state for a region with no assassination frame', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'mercury', tracker });
		expect(screen.getByText(/no assassination frame/i)).toBeInTheDocument();
	});
});
