import { describe, it, expect } from 'vitest';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS } from './openworld';

const ZONE_NODES = new Set(['SolNode228', 'SolNode129', 'SolNode229', 'CuratedAlbrechtLabs']);

describe('OPEN_WORLD_FARMS', () => {
	it('has 8 entries covering all seven frames', () => {
		expect(OPEN_WORLD_FARMS).toHaveLength(8);
		expect(new Set(OPEN_WORLD_FARMS.map((f) => f.frameId))).toEqual(
			new Set(['gara', 'revenant', 'caliban', 'garuda', 'hildryn', 'xaku', 'qorvex']),
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
});
