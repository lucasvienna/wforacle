import { describe, it, expect } from 'vitest';
import { PLANETS, BOSS_BY_NODE, planetOrder } from './curated';
import { slugify } from './parse';

describe('curated', () => {
	it('lists 15 planets, Earth first, distinct orders', () => {
		expect(PLANETS).toHaveLength(15);
		const byOrder = [...PLANETS].sort((a, b) => a.order - b.order);
		expect(byOrder[0].name).toBe('Earth');
		expect(new Set(PLANETS.map((p) => p.order)).size).toBe(15);
	});
	it('maps known assassination nodes to boss names', () => {
		expect(BOSS_BY_NODE[slugify('Fossa')]).toBe('Jackal');
		expect(BOSS_BY_NODE[slugify('Oro')]).toBe('Councilor Vay Hek');
	});
	it('returns 999 for an unknown planet', () => {
		expect(planetOrder('Nowhere')).toBe(999);
	});
});
