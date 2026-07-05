import type { Dataset, Slot, Warframe } from '$lib/model/types';
import { partId } from '$lib/model/completion';

const SLOTS: Slot[] = ['bp', 'neuroptics', 'chassis', 'systems'];
function frame(id: string, name: string, nodeId: string): Warframe {
	return {
		id,
		name,
		nodeId,
		parts: SLOTS.map((slot) => ({ id: partId(id, slot), frameId: id, slot })),
	};
}
// regions: Earth(1) Venus(2) Mars(3) Phobos(4) Ceres(5) Mercury(6) Jupiter(7) — progressionOrder
// assassination nodes: oro→Vay Hek→hydroid, fossa→Jackal→rhino, war→Lech Kril→excalibur
export const seed: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['oro'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'venus',
			name: 'Venus',
			kind: 'planet',
			progressionOrder: 2,
			factions: ['Corpus'],
			nodeIds: ['fossa'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'mercury',
			name: 'Mercury',
			kind: 'planet',
			progressionOrder: 6,
			factions: ['Grineer'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'mars',
			name: 'Mars',
			kind: 'planet',
			progressionOrder: 3,
			factions: ['Grineer'],
			nodeIds: ['war'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'phobos',
			name: 'Phobos',
			kind: 'planet',
			progressionOrder: 4,
			factions: ['Corpus'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'ceres',
			name: 'Ceres',
			kind: 'planet',
			progressionOrder: 5,
			factions: ['Grineer'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'jupiter',
			name: 'Jupiter',
			kind: 'planet',
			progressionOrder: 7,
			factions: ['Corpus'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'oro',
			regionId: 'earth',
			name: 'Oro',
			missionType: 'Assassination',
			faction: 'Grineer',
			isAssassination: true,
			bossId: 'vayhek',
			frameId: 'hydroid',
		},
		{
			id: 'fossa',
			regionId: 'venus',
			name: 'Fossa',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'jackal',
			frameId: 'rhino',
		},
		{
			id: 'war',
			regionId: 'mars',
			name: 'War',
			missionType: 'Assassination',
			faction: 'Grineer',
			isAssassination: true,
			bossId: 'lechkril',
			frameId: 'excalibur',
		},
	],
	bosses: [
		{ id: 'vayhek', name: 'Councilor Vay Hek', nodeId: 'oro', faction: 'Grineer' },
		{ id: 'jackal', name: 'Jackal', nodeId: 'fossa', faction: 'Corpus' },
		{ id: 'lechkril', name: 'Lieutenant Lech Kril', nodeId: 'war', faction: 'Grineer' },
	],
	warframes: [
		frame('hydroid', 'Hydroid', 'oro'),
		frame('rhino', 'Rhino', 'fossa'),
		frame('excalibur', 'Excalibur', 'war'),
	],
	resources: [],
};
