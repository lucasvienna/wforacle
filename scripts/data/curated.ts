import { slugify } from './parse';
import type { SolNodes } from './build';
import type { Slot } from '../../src/lib/model/types';

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
	// Special/quest-locked regions (Deimos, Lua, Kuva Fortress, Zariman, ...)
	// are intentionally NOT listed here: they are deferred to a later plan
	// where they're modeled as kind:'special' / spoilerGated:true and rendered
	// off-ring. Adding them to PLANETS would ship them as unhidden main planets
	// and leak spoilers the disclosure feature depends on avoiding.
];

const PLANET_ORDER = new Map(PLANETS.map((p) => [p.name, p.order]));
export function planetOrder(planetName: string): number {
	return PLANET_ORDER.get(planetName) ?? 999;
}

// node slug → boss display name, covering the real Assassination-type
// SolNodes on the 14 main planets (verified against warframe-worldstate-data's
// solNodes + @wfcd/items drop locations — see
// .superpowers/sdd/task-7-report.md for the full breakdown), plus Deimos'
// Magnacidium (Lephantis). Other special-region assassination nodes (e.g.
// Deimos: Exequias/Zealoid Prelate, Effervo/The Fragmented) are deferred to a
// later plan.
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
	// Mercury's assassination node; no Warframe currently drops here (Vor drops the Seer instead)
	[slugify('Tolstoj')]: 'Captain Vor',
	// Deimos' assassination node (special region)
	[slugify('Magnacidium')]: 'Lephantis',
	// Eris key-crafted boss missions (see KEY_BOSS_SOLNODES below)
	[slugify('Mutalist Alad V')]: 'Mutalist Alad V',
	[slugify('Jordas Golem')]: 'Jordas Golem',
};

// Mesa's and Atlas's components drop at key-crafted boss Assassination
// missions on Eris (Mutalist Alad V, Jordas Golem) rather than a star-chart
// SolNode — so they're absent from the game's solNodes data entirely.
// These pseudo-nodes let buildNodes/buildRegions place them on Eris like any
// other Assassination node (see assemble.ts, which merges this into the real
// solNodes before building).
export const KEY_BOSS_SOLNODES: SolNodes = {
	CuratedMutalistAladV: {
		value: 'Mutalist Alad V (Eris)',
		enemy: 'Infested',
		type: 'Assassination',
	},
	CuratedJordasGolem: { value: 'Jordas Golem (Eris)', enemy: 'Infested', type: 'Assassination' },
};

// Raw WFCD drop-location strings (key = text before the first comma) for the
// two key-boss missions above, mapped to the coordinates resolveDropLocation
// (in build.ts) needs since these don't parse as the standard
// "Planet/Node (Type)" format parseDropLocation expects.
export const KEY_BOSS_DROP_LOCATIONS: Record<
	string,
	{ planet: string; node: string; type: string }
> = {
	'Mutalist Alad V Assassinate': { planet: 'Eris', node: 'Mutalist Alad V', type: 'Assassination' },
	'Jordas Golem Assassinate': { planet: 'Eris', node: 'Jordas Golem', type: 'Assassination' },
};

// Frames whose main blueprint is neither a Market credit purchase nor a
// blueprint drop `@wfcd/items` can resolve. Wisp's blueprint IS a resolvable
// Ropalolyst drop and is handled automatically by buildFrames; only these two
// need a curated label. Keyed by frame id (slugified name).
export const ASSASSINATION_BP_SOURCE: Record<string, string> = {
	atlas: 'The Jordas Precept (quest)',
	mesa: 'Mutalist Alad V',
};

// frameId → per-aspect components (the sub-blueprints @wfcd/items flattens
// away). Equinox is the only such frame: each aspect (Day/Night) is assembled
// from its Aspect Blueprint — whose drop chance the build supplies from the
// @wfcd Day/Night Aspect component drop — plus these three 25.81% components.
// Post-Update-42 (2026) Tyl Regor drops one guaranteed component from each side
// per kill; the old Rotation A/B gating is gone, but these within-side weights
// are unchanged. Keyed by frame id (slugified name).
export const ASSASSINATION_ASPECTS: Record<
	string,
	{ day: { slot: Slot; chance: number }[]; night: { slot: Slot; chance: number }[] }
> = {
	equinox: {
		day: [
			{ slot: 'neuroptics', chance: 25.81 },
			{ slot: 'chassis', chance: 25.81 },
			{ slot: 'systems', chance: 25.81 },
		],
		night: [
			{ slot: 'neuroptics', chance: 25.81 },
			{ slot: 'chassis', chance: 25.81 },
			{ slot: 'systems', chance: 25.81 },
		],
	},
};
