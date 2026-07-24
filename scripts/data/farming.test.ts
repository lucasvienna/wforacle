import { describe, it, expect } from 'vitest';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { recRegionId } from './assemble';
import { slugify } from './parse';
import { SPECIAL_REGIONS } from './special';

const ids = new Set(RESOURCES.map((r) => r.id));

describe('curated farming data', () => {
	it('has a full resource set with unique slug ids', () => {
		expect(RESOURCES.length).toBeGreaterThanOrEqual(14);
		for (const r of RESOURCES) expect(r.id).toBe(slugify(r.name));
		expect(new Set(RESOURCES.map((r) => r.id)).size).toBe(RESOURCES.length);
	});
	it('includes the curated special-region resources', () => {
		const names = new Set(RESOURCES.map((r) => r.name));
		for (const name of ['Somatic Fibers', 'Kuva', 'Voidgel Orb', 'Entrati Lanthorn'])
			expect(names.has(name)).toBe(true);
	});
	it('maps every main planet (plus curated special regions) to known resource ids only', () => {
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
		const keys = Object.keys(PLANET_RESOURCES);
		// every main planet must be present
		for (const m of mains) expect(keys).toContain(m);
		// every key must be a real region slug — a main planet or a curated
		// special region (e.g. deimos), never a typo'd/unknown id
		const validRegionIds = new Set([...mains, ...SPECIAL_REGIONS.map((r) => slugify(r.name))]);
		for (const k of keys) expect(validRegionIds.has(k)).toBe(true);
		// all mapped values must be known resource ids
		for (const rids of Object.values(PLANET_RESOURCES)) {
			for (const rid of rids) expect(ids.has(rid)).toBe(true);
		}
	});
	it('includes a curated Cryotic excavation guide', () => {
		const id = slugify('Cryotic');
		expect(ids.has(id)).toBe(true);
		// Cryotic is an Excavation payout, farmed on Earth (Everest) and Pluto
		// (Hieracon) — the two planets its recommendations point at.
		expect(PLANET_RESOURCES.earth).toContain(id);
		expect(PLANET_RESOURCES.pluto).toContain(id);
		const recs = RECOMMENDATIONS[id];
		expect(recs.some((x) => x.phase === 'early' && x.nodeLabel.includes('Everest'))).toBe(true);
		expect(recs.some((x) => x.phase === 'late' && x.nodeLabel.includes('Hieracon'))).toBe(true);
		// The top-tier farm: endless Excavation Void Fissures (stacking in-mission
		// resource boosters). Rotating nodes, so its label must not resolve to a
		// region — otherwise a "best farm here" badge lands on the wrong panel.
		const fissure = recs.find((x) => /fissure/i.test(x.nodeLabel));
		expect(fissure?.phase).toBe('late');
		expect(recRegionId(fissure!.nodeLabel)).toBeUndefined();
	});
	it('includes a curated Credits farming guide', () => {
		const id = slugify('Credits');
		expect(ids.has(id)).toBe(true);
		// Credits are mapped (like Cryotic) onto their signature farm planets:
		// Ceres (Seimeni/Gabii), Neptune (Index, Laomedeia), Venus (Profit-Taker).
		expect(PLANET_RESOURCES.ceres).toContain(id);
		expect(PLANET_RESOURCES.neptune).toContain(id);
		expect(PLANET_RESOURCES.venus).toContain(id);
		const recs = RECOMMENDATIONS[id];
		expect(recs).toHaveLength(6);
		expect(recs.filter((x) => x.phase === 'early')).toHaveLength(3);
		// Credit boosters ≠ resource boosters: every rec must override the
		// canned booster copy.
		for (const x of recs) expect(x.boosterNote).toBeTruthy();
		// 'Anywhere' (First Win habit) and 'Höllvania' (not a chart region)
		// must not resolve to a region, or a "best farm here" badge lands on
		// the wrong panel.
		const firstWin = recs.find((x) => /first win/i.test(x.nodeLabel));
		expect(recRegionId(firstWin!.nodeLabel)).toBeUndefined();
		const techrot = recs.find((x) => /legacyte/i.test(x.nodeLabel));
		expect(techrot?.phase).toBe('late');
		// Laomedeia is the mid-game (~MR7–14) step: Disruption Demolishers are
		// too much for a fresh account but it's far from endgame.
		const laomedeia = recs.find((x) => /laomedeia/i.test(x.nodeLabel));
		expect(laomedeia?.phase).toBe('mid');
		expect(recRegionId(techrot!.nodeLabel)).toBeUndefined();
		// The guide's core rule: cache-paying farms must warn that the Daily
		// First Win Bonus doesn't apply to them.
		const index = recs.find((x) => /index/i.test(x.nodeLabel));
		expect(index?.boosterNote).toMatch(/first win/i);
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
