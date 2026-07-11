import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import StarChart from './StarChart.svelte';
import { seed } from '$lib/data/seed';

describe('StarChart', () => {
	const base = {
		regions: seed.regions,
		selectedId: 'venus',
		statusOf: () => 'none' as const,
	};
	it('renders a label per region', () => {
		render(StarChart, { ...base, onselect: () => {} });
		expect(screen.getByText('EARTH')).toBeInTheDocument();
		expect(screen.getByText('VENUS')).toBeInTheDocument();
	});
	it('fires onselect with the region id on click', async () => {
		const onselect = vi.fn();
		render(StarChart, { ...base, onselect });
		screen.getByText('MARS').click();
		expect(onselect).toHaveBeenCalledWith('mars');
	});

	const deimos = {
		id: 'deimos',
		name: 'Deimos',
		kind: 'special' as const,
		progressionOrder: 15,
		factions: ['Infested'],
		nodeIds: [],
		spoilerGated: true,
		questId: 'heartofdeimos',
		resourceIds: [],
	};

	it('renders a label for a revealed special region', () => {
		render(StarChart, {
			...base,
			onselect: () => {},
			specialRegions: [deimos],
		});
		expect(screen.getByText('DEIMOS')).toBeInTheDocument();
	});

	it('fires onselect with the special region id on click', async () => {
		const onselect = vi.fn();
		render(StarChart, { ...base, onselect, specialRegions: [deimos] });
		screen.getByText('DEIMOS').click();
		expect(onselect).toHaveBeenCalledWith('deimos');
	});
});
