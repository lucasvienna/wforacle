import { describe, it, expect } from 'vitest';
import { partId, frameCompletion, datasetCompletion } from './completion';
import type { Warframe } from './types';

const rhino: Warframe = {
	id: 'rhino',
	name: 'Rhino',
	nodeId: 'fossa',
	parts: (['bp', 'neuroptics', 'chassis', 'systems'] as const).map((slot) => ({
		id: partId('rhino', slot),
		frameId: 'rhino',
		slot,
	})),
};

describe('completion', () => {
	it('builds a stable part id', () => {
		expect(partId('rhino', 'chassis')).toBe('rhino:chassis');
	});
	it('counts owned parts for a frame', () => {
		const owned = new Set(['rhino:bp', 'rhino:neuroptics']);
		expect(frameCompletion(rhino, owned)).toEqual({ owned: 2, total: 4 });
	});
	it('aggregates across frames', () => {
		const owned = new Set(['rhino:bp']);
		expect(datasetCompletion([rhino, rhino], owned)).toEqual({ owned: 2, total: 8 });
	});
	it('builds stable part ids for Equinox day/night aspect slots', () => {
		expect(partId('equinox', 'dayaspect')).toBe('equinox:dayaspect');
		expect(partId('equinox', 'nightaspect')).toBe('equinox:nightaspect');
	});
});
