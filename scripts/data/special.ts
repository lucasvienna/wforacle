export const SPECIAL_REGIONS: {
	name: string;
	order: number;
	faction: string;
	spoilerGated: boolean;
	questId?: string;
}[] = [
	{
		name: 'Deimos',
		order: 15,
		faction: 'Infested',
		spoilerGated: true,
		questId: 'heartofdeimos',
	},
	{ name: 'Void', order: 16, faction: 'Orokin', spoilerGated: false },
	{
		name: 'Lua',
		order: 17,
		faction: 'Corpus',
		spoilerGated: true,
		questId: 'thesecondddream',
	},
	{
		name: 'Kuva Fortress',
		order: 18,
		faction: 'Grineer',
		spoilerGated: true,
		questId: 'thewarwithin',
	},
	{
		name: 'Zariman',
		order: 19,
		faction: 'Corpus',
		spoilerGated: true,
		questId: 'angelsofthezariman',
	},
];

export const QUESTS: {
	id: string;
	name: string;
	revealsRegionIds: string[];
	revealsFrameIds: string[];
}[] = [
	{
		id: 'heartofdeimos',
		name: 'Heart of Deimos',
		revealsRegionIds: ['deimos'],
		revealsFrameIds: ['nekros'],
	},
	{
		id: 'thesecondddream',
		name: 'The Second Dream',
		revealsRegionIds: ['lua'],
		revealsFrameIds: [],
	},
	{
		id: 'thewarwithin',
		name: 'The War Within',
		revealsRegionIds: ['kuvafortress'],
		revealsFrameIds: [],
	},
	{
		id: 'angelsofthezariman',
		name: 'Angels of the Zariman',
		revealsRegionIds: ['zariman'],
		revealsFrameIds: [],
	},
];

export const SPECIAL_REGION_NAMES: Set<string> = new Set(SPECIAL_REGIONS.map((r) => r.name));
