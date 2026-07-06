import { describe, it, expect } from 'vitest';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { slugify } from './parse';

const ids = new Set(RESOURCES.map((r) => r.id));

describe('curated farming data', () => {
	it('has a full resource set with unique slug ids', () => {
		expect(RESOURCES.length).toBeGreaterThanOrEqual(14);
		for (const r of RESOURCES) expect(r.id).toBe(slugify(r.name));
		expect(new Set(RESOURCES.map((r) => r.id)).size).toBe(RESOURCES.length);
	});
	it('maps all 14 main planets to known resource ids only', () => {
		const mains = [
			'earth',
			'venus',
			'mercury',
			'mars',
			'phobos',
			'ceres',
			'jupiter',
			'europa',
			'saturn',
			'uranus',
			'neptune',
			'pluto',
			'eris',
			'sedna',
		];
		expect(Object.keys(PLANET_RESOURCES).sort()).toEqual([...mains].sort());
		for (const rids of Object.values(PLANET_RESOURCES)) {
			for (const rid of rids) expect(ids.has(rid)).toBe(true);
		}
	});
	it('each curated recommendation targets a real resource with an early + late rec', () => {
		for (const [rid, recs] of Object.entries(RECOMMENDATIONS)) {
			expect(ids.has(rid)).toBe(true);
			expect(recs.some((x) => x.phase === 'early')).toBe(true);
			expect(recs.some((x) => x.phase === 'late')).toBe(true);
			for (const x of recs) {
				expect(x.nodeLabel).toBeTruthy();
				expect(typeof x.boostersApply).toBe('boolean');
				expect(x.source).toMatch(/wiki\.warframe\.com/);
				expect(x.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});
});
