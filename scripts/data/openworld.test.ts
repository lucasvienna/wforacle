import { describe, it, expect } from 'vitest';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS, PER_RUN_ROTATION_FARMS } from './openworld';

const ZONE_NODES = new Set([
	'SolNode228',
	'SolNode129',
	'SolNode229',
	'CuratedAlbrechtLabs',
	'CuratedSayasVisions',
	'CuratedGranumVoid',
	// Real star-chart mission-farm nodes (see 2026-07-24 spec)
	'SolNode450', // Tyana Pass, Mars — Citrine
	'SolNode721', // Armatus, Deimos — Dante
	'SolNode177', // Kappa, Sedna — Gauss
	'SolNode310', // Circulus, Lua — Voruna
	'SolNode167', // Oestrus, Eris — Nidus
	'SolNode723', // Brutus, Uranus — Jade
	'ZarimanHub', // Chrysalith, Zariman — Gyre
]);

describe('OPEN_WORLD_FARMS', () => {
	it('has 17 entries covering all sixteen frames', () => {
		expect(OPEN_WORLD_FARMS).toHaveLength(17);
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
				'citrine',
				'dante',
				'gauss',
				'voruna',
				'nidus',
				'jade',
				'gyre',
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
		expect(Object.keys(PER_RUN_ROTATION_FARMS).sort()).toEqual([
			'citrine',
			'dante',
			'gauss',
			'koumei',
			'nidus',
			'protea',
			'voruna',
		]);
	});

	it('labels every mission-farm slot Rotation C, including drop-sourced blueprints', () => {
		expect(PER_RUN_ROTATION_FARMS.citrine).toEqual({
			bp: 'Rotation C',
			neuroptics: 'Rotation C',
			chassis: 'Rotation C',
			systems: 'Rotation C',
		});
		// Gauss's bp is a Market purchase, not a drop — no bp label.
		expect(PER_RUN_ROTATION_FARMS.gauss).toEqual({
			neuroptics: 'Rotation C',
			chassis: 'Rotation C',
			systems: 'Rotation C',
		});
	});
});
