import type { Recommendation } from '../../src/lib/model/types';
import { slugify } from './parse';

// The ~12 "starter" resources most new players need for early Warframe/weapon
// blueprints. id = slugify(name) so this stays consistent with every other
// slug in the dataset (regions, nodes, bosses).
export const RESOURCES = [
	{ id: slugify('Orokin Cell'), name: 'Orokin Cell' },
	{ id: slugify('Neurodes'), name: 'Neurodes' },
	{ id: slugify('Neural Sensors'), name: 'Neural Sensors' },
	{ id: slugify('Nano Spores'), name: 'Nano Spores' },
	{ id: slugify('Alloy Plate'), name: 'Alloy Plate' },
	{ id: slugify('Plastids'), name: 'Plastids' },
	{ id: slugify('Polymer Bundle'), name: 'Polymer Bundle' },
	{ id: slugify('Oxium'), name: 'Oxium' },
	{ id: slugify('Argon Crystal'), name: 'Argon Crystal' },
	{ id: slugify('Gallium'), name: 'Gallium' },
	{ id: slugify('Control Module'), name: 'Control Module' },
	{ id: slugify('Rubedo'), name: 'Rubedo' },
];

const R = Object.fromEntries(RESOURCES.map((r) => [r.name, r.id])) as Record<string, string>;

// regionId -> signature resource ids, curated from each resource's wiki page
// "Location:" line / drop-location table, restricted to the 14 main planets.
// Argon Crystal is intentionally absent: per wiki.warframe.com/w/Argon_Crystal
// it is a Void-only resource ("A Void based radioactive resource... Location:
// Missions in the Void"), not a signature drop of any main planet.
export const PLANET_RESOURCES: Record<string, string[]> = {
	earth: [R['Neurodes'], R['Rubedo']],
	venus: [R['Alloy Plate'], R['Polymer Bundle'], R['Oxium'], R['Neurodes']],
	mercury: [R['Polymer Bundle']],
	mars: [R['Gallium'], R['Oxium']],
	phobos: [R['Alloy Plate'], R['Plastids'], R['Rubedo']],
	ceres: [R['Alloy Plate'], R['Orokin Cell']],
	jupiter: [R['Alloy Plate'], R['Neural Sensors'], R['Oxium'], R['Orokin Cell']],
	europa: [R['Oxium'], R['Control Module'], R['Rubedo']],
	saturn: [R['Orokin Cell'], R['Nano Spores'], R['Plastids']],
	uranus: [R['Plastids'], R['Polymer Bundle'], R['Gallium']],
	neptune: [R['Nano Spores'], R['Oxium'], R['Control Module']],
	pluto: [R['Alloy Plate'], R['Plastids'], R['Oxium'], R['Orokin Cell'], R['Rubedo']],
	eris: [R['Plastids'], R['Nano Spores'], R['Oxium'], R['Neurodes']],
	sedna: [R['Alloy Plate'], R['Orokin Cell'], R['Rubedo']],
};

// Early + late farming recommendations per resource, authored from
// wiki.warframe.com (each resource's own page and/or its dedicated
// "_Farming_Guide" page where one exists, and the community Megazawr guide).
// Rule of thumb applied throughout: recs built around breaking static
// containers/deposits (crate farms) get boostersApply: false, because
// Resource Drop Boosters and the Steel Path resource-drop passive only
// affect *enemy* drop tables, not container/cache pickups. Recs built
// around killing enemies (including bosses and endless-mission enemy
// density) get boostersApply: true.
export const RECOMMENDATIONS: Record<string, Recommendation[]> = {
	[R['Orokin Cell']]: [
		{
			phase: 'early',
			nodeLabel: 'Saturn — Tethys (Assassination, General Sargas Ruk)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Fast, repeatable boss kill with a solid Orokin Cell drop chance; accessible as soon as Saturn is unlocked.',
			source: 'https://wiki.warframe.com/w/Orokin_Cell_Farming_Guide',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Ceres — Gabii (Dark Sector Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Dark Sector +35% resource drop chance stacks with the Steel Path drop-chance passive and Resourceful Retriever/boosters for sustained squad farming.',
			source: 'https://wiki.warframe.com/w/Orokin_Cell_Farming_Guide',
			lastVerified: '2026-07-05',
		},
	],
	[R['Neurodes']]: [
		{
			phase: 'early',
			nodeLabel: 'Earth — Mantle (Sabotage, Grineer cave containers)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Breaking the green-glowing resource containers in the Grineer cave tileset around Mantle guarantees Neurodes, no boss or high level required.',
			source: 'https://wiki.warframe.com/w/Neurodes',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Lua — Circulus (Void Storm/Fissure Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'One of the most popular full-squad Steel Path fissure farms; dense Sentient/Corpus enemy spawns drop Neurodes alongside Rubedo and relics.',
			source: 'https://wiki.warframe.com/w/User:Megazawr/Resource_Farming_Guide',
			lastVerified: '2026-07-05',
		},
	],
	[R['Neural Sensors']]: [
		{
			phase: 'early',
			nodeLabel: 'Jupiter — Elara (Survival)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Low-level Corpus Survival that new players can rotate for a while; enemy drops feed Neural Sensors at an accessible level range.',
			source: 'https://wiki.warframe.com/w/Neural_Sensors',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Jupiter — Cameria (Dark Sector Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Dark Sector +20% resource drop chance plus Steel Path enemy density against Infested hordes makes this the best endgame squad spot.',
			source: 'https://wiki.warframe.com/w/Neural_Sensors',
			lastVerified: '2026-07-05',
		},
	],
	[R['Nano Spores']]: [
		{
			phase: 'early',
			nodeLabel: 'Eris — Akkad (Defense, Spore Culture containers)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Spore Culture containers scattered through the level are a guaranteed Nano Spore source and are easy to clear in the first few Defense waves.',
			source: 'https://wiki.warframe.com/w/Nano_Spores',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Saturn — Piscinas (Dark Sector Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Steel Path Infested density with a Khora/Nekros loot squad on this Dark Sector node yields large Nano Spore hauls per rotation.',
			source: 'https://wiki.warframe.com/w/Nano_Spores',
			lastVerified: '2026-07-05',
		},
	],
	[R['Alloy Plate']]: [
		{
			phase: 'early',
			nodeLabel: 'Venus — Tessera (Defense)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Low-level Corpus Defense on Venus, one of Alloy Plate’s signature planets, gives steady drops from the very start of the star chart.',
			source: 'https://wiki.warframe.com/w/Alloy_Plate',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Zariman Ten Zero — Tuvul Commons (Void Cascade)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Endless Void Cascade enemy density makes this the highest-yield Alloy Plate farm for geared squads; Ceres Gabii Steel Path with a booster is a solid alternative.',
			source: 'https://wiki.warframe.com/w/Alloy_Plate',
			lastVerified: '2026-07-05',
		},
	],
	[R['Plastids']]: [
		{
			phase: 'early',
			nodeLabel: 'Phobos — Gulliver (Defense)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Accessible low-level Corpus Defense; Phobos is one of the few main planets with a decent Plastids drop chance early on.',
			source: 'https://wiki.warframe.com/w/Plastids',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Uranus — Assur (Dark Sector Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Plastids are notoriously low-yield, so a Dark Sector Steel Path Survival squad farm (with Nekros/Hydroid) is worth the endgame investment.',
			source: 'https://wiki.warframe.com/w/Plastids',
			lastVerified: '2026-07-05',
		},
	],
	[R['Polymer Bundle']]: [
		{
			phase: 'early',
			nodeLabel: 'Uranus — Ophelia (Survival)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Uranus is Polymer Bundle’s primary planet, so nearly every resource drop here is a bundle; Ophelia also nets Tellurium on the side.',
			source: 'https://wiki.warframe.com/w/Polymer_Bundle',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Uranus — Assur (Dark Sector Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Same Dark Sector Grineer Galleon chokepoints used for Plastids double as an efficient Steel Path Polymer Bundle squad farm.',
			source: 'https://wiki.warframe.com/w/Polymer_Bundle',
			lastVerified: '2026-07-05',
		},
	],
	[R['Oxium']]: [
		{
			phase: 'early',
			nodeLabel: 'Jupiter — Io (Defense)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Reliable early Oxium Osprey spawns; the wiki cites roughly 80 Oxium over 10 waves on this low-level Corpus Defense.',
			source: 'https://wiki.warframe.com/w/Oxium',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Lua — Tycho (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Higher-level Corpus spawns more Oxium Ospreys per minute; running long Survival rotations beats resetting missions repeatedly.',
			source: 'https://wiki.warframe.com/w/Oxium',
			lastVerified: '2026-07-05',
		},
	],
	[R['Argon Crystal']]: [
		{
			phase: 'early',
			nodeLabel: 'Void — Hepit (Capture, Argon Deposits)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Every non-Defense Void tileset has ~2 static Argon Deposit containers worth 1-2 crystals each, no high level needed; remember they decay daily at 00:00 GMT.',
			source: 'https://wiki.warframe.com/w/Argon_Crystal',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Void — Mot (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Endless Void Survival lets a squad bank as many crystals as they can spend before the daily decay; Resourceful Retriever and boosters help enemy drops here.',
			source: 'https://wiki.warframe.com/w/Argon_Crystal',
			lastVerified: '2026-07-05',
		},
	],
	[R['Gallium']]: [
		{
			phase: 'early',
			nodeLabel: 'Mars — Hellas (Exterminate)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Quick low-level Grineer Exterminate on one of Gallium’s two signature planets; good for a fast early supply.',
			source: 'https://wiki.warframe.com/w/Gallium',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Uranus — Titania (Assassination, Tyl Regor, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Tyl Regor has a dedicated Gallium drop on top of the planet’s signature-resource bonus; Steel Path repeat kills scale well for squads.',
			source: 'https://wiki.warframe.com/w/Gallium',
			lastVerified: '2026-07-05',
		},
	],
	[R['Control Module']]: [
		{
			phase: 'early',
			nodeLabel: 'Void — Hepit (Capture)',
			nodeId: undefined,
			boostersApply: true,
			note: 'The wiki flags the Void as having a higher Control Module drop chance than any main planet; Hepit is a short, low-level Capture to farm it in.',
			source: 'https://wiki.warframe.com/w/Control_Module',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Void — Mot (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Extrapolated from the wiki’s general "Void has better odds" guidance (no distinct late-game node is called out on the resource page): an endless Void Survival gives Steel Path squads the longest uninterrupted enemy-drop window.',
			source: 'https://wiki.warframe.com/w/Control_Module',
			lastVerified: '2026-07-05',
		},
	],
	[R['Rubedo']]: [
		{
			phase: 'early',
			nodeLabel: 'Phobos — Zeugma (Dark Sector Survival)',
			nodeId: undefined,
			boostersApply: true,
			note: 'The wiki cites roughly 250 Rubedo per 5 minutes here, among the best yields available to newer players on a signature Rubedo planet.',
			source: 'https://wiki.warframe.com/w/Rubedo',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Void — Ani (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: true,
			note: 'The wiki recommends Orokin Void Survival/Defense generically for 1,000+ Rubedo per 20 minutes at endgame; Ani is a standard Void Survival node for that squad farm.',
			source: 'https://wiki.warframe.com/w/Rubedo',
			lastVerified: '2026-07-05',
		},
	],
};
