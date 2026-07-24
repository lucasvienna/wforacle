import { describe, it, expect } from 'vitest';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS, PER_RUN_ROTATION_FARMS } from './openworld';

const ZONE_NODES = new Set([
	'SolNode228',
	'SolNode129',
	'SolNode229',
	'CuratedAlbrechtLabs',
	'CuratedSayasVisions',
	'CuratedGranumVoid',
]);

describe('OPEN_WORLD_FARMS', () => {
	it('has 10 entries covering all nine frames', () => {
		expect(OPEN_WORLD_FARMS).toHaveLength(10);
		expect(new Set(OPEN_WORLD_FARMS.map((f) => f.frameId))).toEqual(
			new Set([
				'gara',
				'revenant',
				'caliban',
				'garuda',
				'hildryn',
				'xaku',
				'qorvex',
				'protea',
				'koumei',
			]),
		);
	});
	it('places Caliban in both Plains (earth) and Orb Vallis (venus)', () => {
		const cal = OPEN_WORLD_FARMS.filter((f) => f.frameId === 'caliban');
		expect(cal.map((f) => f.regionId).sort()).toEqual(['earth', 'venus']);
	});
	it('references only declared zone nodes', () => {
		for (const f of OPEN_WORLD_FARMS) expect(ZONE_NODES.has(f.nodeId)).toBe(true);
	});
	it('has no duplicate (frame, node) pair', () => {
		const keys = OPEN_WORLD_FARMS.map((f) => `${f.frameId}@${f.nodeId}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
	it('every farm has non-empty source labels', () => {
		for (const f of OPEN_WORLD_FARMS) {
			expect(f.componentSource.length).toBeGreaterThan(0);
			expect(f.bpSource.length).toBeGreaterThan(0);
		}
	});
});

describe('OPEN_WORLD_SOLNODES', () => {
	it("declares Albrecht's Laboratories as a Free Roam node on Deimos", () => {
		const n = OPEN_WORLD_SOLNODES.CuratedAlbrechtLabs;
		expect(n.type).toBe('Free Roam');
		expect(n.value).toMatch(/\(Deimos\)$/);
	});
	it("declares Saya's Visions as an Infested Shrine Defense node on Earth", () => {
		const n = OPEN_WORLD_SOLNODES.CuratedSayasVisions;
		expect(n.type).toBe('Shrine Defense');
		expect(n.enemy).toBe('Infested');
		expect(n.value).toMatch(/\(Earth\)$/);
	});
	it('declares Granum Void as a Corpus node on Venus', () => {
		const n = OPEN_WORLD_SOLNODES.CuratedGranumVoid;
		expect(n.type).toBe('Granum Void');
		expect(n.enemy).toBe('Corpus');
		expect(n.value).toMatch(/\(Venus\)$/);
	});
});

describe('PER_RUN_ROTATION_FARMS', () => {
	it('covers exactly the farms whose rewards are per-run ranks, not the bounty cycle', () => {
		expect(Object.keys(PER_RUN_ROTATION_FARMS).sort()).toEqual(['koumei', 'protea']);
	});
	it('labels the Protea tiers that need higher-grade Granum Crowns', () => {
		expect(PER_RUN_ROTATION_FARMS.protea).toEqual({
			chassis: 'Extended',
			systems: 'Nightmare',
		});
	});
});
