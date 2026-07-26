import { describe, it, expect } from 'vitest';
import type { OpenWorldFarm, WarframePart } from '$lib/model/types';
import { assassinationSourceText, owSourceText } from './sourceText';

const part = (over: Partial<WarframePart> = {}): WarframePart => ({
	id: 'rhino:chassis',
	frameId: 'rhino',
	slot: 'chassis',
	...over,
});

const farm: OpenWorldFarm = {
	frameId: 'gara',
	nodeId: 'SolNode228',
	regionId: 'earth',
	componentSource: 'Plains bounty',
	bpSource: 'Quills offering',
};

describe('assassinationSourceText', () => {
	it('reads a curated bpSource verbatim', () => {
		expect(
			assassinationSourceText(
				part({ slot: 'bp', bpSource: 'Complete The Deadlock Protocol' }),
				'Jackal',
			),
		).toBe('Complete The Deadlock Protocol');
	});

	it('formats a Market blueprint with thousands separators', () => {
		expect(assassinationSourceText(part({ slot: 'bp', marketCost: 25000 }), 'Jackal')).toBe(
			'Market (25,000cr)',
		);
	});

	it('falls back to a bare "Market" when no cost is known', () => {
		expect(assassinationSourceText(part({ slot: 'bp' }), 'Jackal')).toBe('Market');
	});

	it('reads "{boss} · {chance}%" for a component drop', () => {
		expect(assassinationSourceText(part({ chance: 25.81 }), 'Jackal')).toBe('Jackal · 25.81%');
	});

	it('treats a blueprint that drops from the boss as a drop, not a purchase', () => {
		// Wisp/Ropalolyst-shaped: slot 'bp' but with a dropSourceNodeId.
		expect(
			assassinationSourceText(
				part({ slot: 'bp', dropSourceNodeId: 'SolNode9', chance: 11.06 }),
				'Ropalolyst',
			),
		).toBe('Ropalolyst · 11.06%');
	});

	it('omits the chance when the drop rate is unknown', () => {
		expect(assassinationSourceText(part(), 'Jackal')).toBe('Jackal');
	});
});

describe('owSourceText', () => {
	it('reads the farm bpSource for a bare blueprint', () => {
		expect(owSourceText(part({ slot: 'bp' }), farm)).toBe('Quills offering');
	});

	it('joins source, tier, rotation and chance', () => {
		expect(owSourceText(part({ bountyTier: 'L20–40', rotation: 'B', chance: 12.5 }), farm)).toBe(
			'Plains bounty · L20–40 · Rot B · 12.5%',
		);
	});

	it('renders "any rot" when a component drops on all rotations equally', () => {
		expect(owSourceText(part({ bountyTier: 'L20–40', rotation: 'any', chance: 8 }), farm)).toBe(
			'Plains bounty · L20–40 · any rot · 8%',
		);
	});

	it('omits tier and rotation for a non-bounty source (Exploiter Orb)', () => {
		expect(owSourceText(part({ chance: 38.72 }), farm)).toBe('Plains bounty · 38.72%');
	});

	it('treats a drop-sourced blueprint as a component row', () => {
		// Citrine/Dante/Voruna/Gyre-shaped.
		expect(
			owSourceText(part({ slot: 'bp', dropSourceNodeId: 'SolNode450', chance: 9.3 }), farm),
		).toBe('Plains bounty · 9.3%');
	});
});
