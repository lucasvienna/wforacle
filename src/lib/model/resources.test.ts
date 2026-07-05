import { describe, it, expect } from 'vitest';
import { resourcesForRegion, bestPhaseRec } from './resources';
import type { Dataset, Resource } from './types';

const alloy: Resource = {
	id: 'alloyplate',
	name: 'Alloy Plate',
	regionIds: ['venus', 'ceres'],
	recommendations: [
		{
			phase: 'early',
			nodeLabel: 'Venus — Tessera',
			boostersApply: false,
			note: 'crate run',
			source: 'wiki',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Ceres — Gabii',
			boostersApply: true,
			note: 'SP squad',
			source: 'wiki',
			lastVerified: '2026-07-05',
		},
	],
};
const ds = {
	regions: [],
	nodes: [],
	bosses: [],
	warframes: [],
	resources: [alloy],
} as unknown as Dataset;

describe('resources helpers', () => {
	it('lists resources for a region', () => {
		expect(resourcesForRegion(ds, 'ceres').map((r) => r.id)).toEqual(['alloyplate']);
		expect(resourcesForRegion(ds, 'earth')).toEqual([]);
	});
	it('picks the best rec per phase', () => {
		expect(bestPhaseRec(alloy, 'early')?.nodeLabel).toBe('Venus — Tessera');
		expect(bestPhaseRec(alloy, 'late')?.boostersApply).toBe(true);
	});
});
