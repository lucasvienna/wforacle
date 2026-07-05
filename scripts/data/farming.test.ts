import { describe, it, expect } from 'vitest';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { slugify } from './parse';

const ids = new Set(RESOURCES.map((r) => r.id));

describe('curated farming data', () => {
	it('has ~12 starter resources with slug ids', () => {
		expect(RESOURCES.length).toBeGreaterThanOrEqual(10);
		for (const r of RESOURCES) expect(r.id).toBe(slugify(r.name));
	});
	it('maps only known resource ids to planets, on the 14 main regions', () => {
		const mains = new Set([
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
		]);
		for (const [region, rids] of Object.entries(PLANET_RESOURCES)) {
			expect(mains.has(region)).toBe(true);
			for (const rid of rids) expect(ids.has(rid)).toBe(true);
		}
	});
	it('every resource has an early and a late rec with required fields', () => {
		for (const r of RESOURCES) {
			const recs = RECOMMENDATIONS[r.id] ?? [];
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
