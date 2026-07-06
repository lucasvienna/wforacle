import { describe, it, expect } from 'vitest';
import { isRegionRevealed, revealedRegions } from './reveal';
import type { Region, Dataset } from './types';

const main = { id: 'venus', spoilerGated: false } as Region;
const deimos = { id: 'deimos', spoilerGated: true, questId: 'heartofdeimos' } as Region;

describe('reveal', () => {
	it('always reveals non-spoiler regions', () => {
		expect(isRegionRevealed(main, new Set())).toBe(true);
	});
	it('hides a spoiler region until its quest is complete', () => {
		expect(isRegionRevealed(deimos, new Set())).toBe(false);
		expect(isRegionRevealed(deimos, new Set(['heartofdeimos']))).toBe(true);
	});
	it('filters a dataset to revealed regions', () => {
		const ds = { regions: [main, deimos] } as Dataset;
		expect(revealedRegions(ds, new Set()).map((r) => r.id)).toEqual(['venus']);
		expect(revealedRegions(ds, new Set(['heartofdeimos'])).map((r) => r.id)).toEqual([
			'venus',
			'deimos',
		]);
	});
});
