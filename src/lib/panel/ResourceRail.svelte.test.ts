import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ResourceRail from './ResourceRail.svelte';
import type { Resource } from '$lib/model/types';

const resources: Resource[] = [
	{
		id: 'alloyplate',
		name: 'Alloy Plate',
		image: 'AlloyPlate.png',
		regionIds: ['venus'],
		recommendations: [
			{
				phase: 'early',
				nodeLabel: 'Venus — Tessera',
				regionId: 'venus',
				boostersApply: false,
				note: '',
				source: '',
				lastVerified: '2026-07-05',
			},
			{
				phase: 'late',
				nodeLabel: 'Uranus — Assur',
				regionId: 'uranus',
				boostersApply: true,
				note: '',
				source: '',
				lastVerified: '2026-07-05',
			},
		],
	},
];

describe('ResourceRail', () => {
	it('badges the phase whose best node is on this region, muting the other', () => {
		render(ResourceRail, { resources, regionId: 'venus' });
		expect(screen.getByText('Alloy Plate')).toBeInTheDocument();
		expect(screen.getByText('⚡ early best')).toBeInTheDocument();
		expect(screen.queryByText('💀 late best')).toBeNull();
		expect(screen.getByText(/⚡ Early: Venus — Tessera/)).toBeInTheDocument();
		expect(screen.getByText(/💀 Late: Uranus — Assur/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /farming/i })).toHaveAttribute(
			'href',
			'/guides/alloyplate',
		);
	});

	it('renders an empty state when there are no resources', () => {
		render(ResourceRail, { resources: [], regionId: 'venus' });
		expect(screen.getByText('No notable resources.')).toBeInTheDocument();
	});
});
