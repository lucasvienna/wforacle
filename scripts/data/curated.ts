import { slugify } from './parse';

export const PLANETS: { name: string; order: number; faction: string; spoilerGated: boolean }[] = [
	{ name: 'Earth', order: 1, faction: 'Grineer', spoilerGated: false },
	{ name: 'Venus', order: 2, faction: 'Corpus', spoilerGated: false },
	{ name: 'Mercury', order: 3, faction: 'Grineer', spoilerGated: false },
	{ name: 'Mars', order: 4, faction: 'Grineer', spoilerGated: false },
	{ name: 'Phobos', order: 5, faction: 'Corpus', spoilerGated: false },
	{ name: 'Ceres', order: 6, faction: 'Grineer', spoilerGated: false },
	{ name: 'Jupiter', order: 7, faction: 'Corpus', spoilerGated: false },
	{ name: 'Europa', order: 8, faction: 'Corpus', spoilerGated: false },
	{ name: 'Saturn', order: 9, faction: 'Grineer', spoilerGated: false },
	{ name: 'Uranus', order: 10, faction: 'Grineer', spoilerGated: false },
	{ name: 'Neptune', order: 11, faction: 'Corpus', spoilerGated: false },
	{ name: 'Pluto', order: 12, faction: 'Corpus', spoilerGated: false },
	{ name: 'Eris', order: 13, faction: 'Infested', spoilerGated: false },
	{ name: 'Sedna', order: 14, faction: 'Grineer', spoilerGated: false },
	{ name: 'Deimos', order: 15, faction: 'Infested', spoilerGated: false },
];

const PLANET_ORDER = new Map(PLANETS.map((p) => [p.name, p.order]));
export function planetOrder(planetName: string): number {
	return PLANET_ORDER.get(planetName) ?? 999;
}

// node slug → boss display name, covering every real Assassination-type
// SolNode across the 15 curated regions (17 nodes, verified against
// warframe-worldstate-data's solNodes + @wfcd/items drop locations —
// see .superpowers/sdd/task-7-report.md for the full breakdown).
export const BOSS_BY_NODE: Record<string, string> = {
	[slugify('Fossa')]: 'Jackal',
	[slugify('Oro')]: 'Councilor Vay Hek',
	[slugify('War')]: 'Lieutenant Lech Kril',
	[slugify('Iliad')]: 'The Sergeant',
	[slugify('Exta')]: 'Captain Vor & Lt. Lech Kril',
	[slugify('Themisto')]: 'Alad V',
	[slugify('The Ropalolyst')]: 'Ropalolyst',
	[slugify('Naamah')]: 'Raptors',
	[slugify('Tethys')]: 'General Sargas Ruk',
	[slugify('Titania')]: 'Tyl Regor',
	[slugify('Psamathe')]: 'Hyena Pack',
	[slugify('Hades')]: 'Ambulas',
	[slugify('Merrow')]: 'Kela De Thaym',
	// Deimos (added in this task — 3 Assassination nodes, the most of any planet)
	[slugify('Magnacidium')]: 'Lephantis',
	[slugify('Exequias')]: 'Zealoid Prelate',
	[slugify('Effervo')]: 'The Fragmented',
	// Mercury's assassination node; no Warframe currently drops here (Vor drops the Seer instead)
	[slugify('Tolstoj')]: 'Captain Vor',
};
