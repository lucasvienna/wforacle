import { describe, it, expect } from 'vitest';
import { seed } from './seed';

describe('seed dataset', () => {
	it('has planets in progression order starting with Earth', () => {
		const ordered = [...seed.regions].sort((a, b) => a.progressionOrder - b.progressionOrder);
		expect(ordered[0].name).toBe('Earth');
	});
	it('links each assassination node to a boss and a frame', () => {
		const assass = seed.nodes.filter((n) => n.isAssassination);
		expect(assass.length).toBeGreaterThanOrEqual(3);
		for (const n of assass) {
			expect(n.bossId).toBeTruthy();
			expect(n.frameId).toBeTruthy();
			expect(seed.warframes.find((w) => w.id === n.frameId)).toBeTruthy();
		}
	});
	it('gives every frame exactly four parts with unique ids', () => {
		for (const w of seed.warframes) {
			expect(w.parts).toHaveLength(4);
			expect(new Set(w.parts.map((p) => p.id)).size).toBe(4);
		}
	});
	it('carries an openWorldFarms array (empty in the seed)', () => {
		expect(Array.isArray(seed.openWorldFarms)).toBe(true);
		expect(seed.openWorldFarms).toHaveLength(0);
	});
});
