import { describe, it, expect } from 'vitest';
import { regionFrames } from './regionFrames';
import type { Dataset } from '$lib/model/types';

function frame(id: string) {
	return { id, name: id, parts: [{ id: `${id}:bp`, frameId: id, slot: 'bp' as const }] };
}

const ds: Dataset = {
	regions: [],
	nodes: [
		// jupiter: TWO assassination nodes → two frames
		{
			id: 'themisto',
			regionId: 'jupiter',
			name: 'Themisto',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'aladv',
			frameId: 'valkyr',
		},
		{
			id: 'ropalolyst',
			regionId: 'jupiter',
			name: 'The Ropalolyst',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'ropa',
			frameId: 'wisp',
		},
		// earth: one free-roam zone (Plains) with two frames
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
	],
	bosses: [
		{ id: 'aladv', name: 'Alad V', nodeId: 'themisto', faction: 'Corpus' },
		{ id: 'ropa', name: 'Ropalolyst', nodeId: 'ropalolyst', faction: 'Corpus' },
	],
	warframes: [frame('valkyr'), frame('wisp'), frame('gara'), frame('revenant')],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'gara',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: 'X',
		},
		{
			frameId: 'revenant',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: 'Y',
		},
	],
} as unknown as Dataset;

describe('regionFrames', () => {
	it('returns one assassination entry per node in a multi-boss region (Jupiter)', () => {
		const r = regionFrames(ds, 'jupiter');
		expect(r.assassination.map((e) => e.frame.id)).toEqual(['valkyr', 'wisp']);
		expect(r.zones).toEqual([]);
	});

	it('groups multiple free-roam frames under a single zone node (Earth)', () => {
		const r = regionFrames(ds, 'earth');
		expect(r.assassination).toEqual([]);
		expect(r.zones).toHaveLength(1);
		expect(r.zones[0].node.name).toBe('Plains of Eidolon');
		expect(r.zones[0].entries.map((e) => e.frame.id)).toEqual(['gara', 'revenant']);
	});

	it('returns empty groups for a region with no frames', () => {
		const r = regionFrames(ds, 'mercury');
		expect(r.assassination).toEqual([]);
		expect(r.zones).toEqual([]);
	});

	it('drops assassination nodes whose boss or frame is missing', () => {
		const broken = { ...ds, bosses: [] } as unknown as Dataset;
		expect(regionFrames(broken, 'jupiter').assassination).toEqual([]);
	});
});
