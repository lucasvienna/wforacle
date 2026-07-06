import type { Recommendation } from '../../src/lib/model/types';
import { slugify } from './parse';

// Every resource that appears in a main-planet's resource pool, plus the
// curated-only ones (Argon Crystal — Void). id = slugify(name), and each name
// matches its @wfcd/items entry so the pipeline resolves its icon.
// A resource having farming RECOMMENDATIONS (below) is a curated subset; the
// rest are informational-only (they show which planet drops them, no guide).
export const RESOURCES = [
	{ id: slugify('Ferrite'), name: 'Ferrite' },
	{ id: slugify('Alloy Plate'), name: 'Alloy Plate' },
	{ id: slugify('Nano Spores'), name: 'Nano Spores' },
	{ id: slugify('Salvage'), name: 'Salvage' },
	{ id: slugify('Circuits'), name: 'Circuits' },
	{ id: slugify('Polymer Bundle'), name: 'Polymer Bundle' },
	{ id: slugify('Plastids'), name: 'Plastids' },
	{ id: slugify('Rubedo'), name: 'Rubedo' },
	{ id: slugify('Morphics'), name: 'Morphics' },
	{ id: slugify('Gallium'), name: 'Gallium' },
	{ id: slugify('Neurodes'), name: 'Neurodes' },
	{ id: slugify('Neural Sensors'), name: 'Neural Sensors' },
	{ id: slugify('Control Module'), name: 'Control Module' },
	{ id: slugify('Orokin Cell'), name: 'Orokin Cell' },
	{ id: slugify('Oxium'), name: 'Oxium' },
	{ id: slugify('Tellurium'), name: 'Tellurium' },
	{ id: slugify('Hexenon'), name: 'Hexenon' },
	{ id: slugify('Mutagen Sample'), name: 'Mutagen Sample' },
	{ id: slugify('Detonite Ampule'), name: 'Detonite Ampule' },
	{ id: slugify('Fieldron Sample'), name: 'Fieldron Sample' },
	{ id: slugify('Carbides'), name: 'Carbides' },
	{ id: slugify('Cubic Diodes'), name: 'Cubic Diodes' },
	{ id: slugify('Argon Crystal'), name: 'Argon Crystal' },
];

const R = Object.fromEntries(RESOURCES.map((r) => [r.name, r.id])) as Record<string, string>;

// regionId -> the resources a planet yields. Base = the planet-page infobox
// "Region Resources" pool (verified against wiki.warframe.com for all 14
// planets). Oxium is added on top for the planets where its Oxium Osprey drops
// (Venus/Jupiter/Mars/Neptune/Pluto/Eris/Europa) — it's an enemy drop, not an
// infobox pool item, but is a resource you genuinely farm there.
// Argon Crystal is intentionally absent: it is Void-only, not a main-planet drop.
export const PLANET_RESOURCES: Record<string, string[]> = {
	mercury: [R['Ferrite'], R['Polymer Bundle'], R['Morphics'], R['Detonite Ampule']],
	venus: [R['Alloy Plate'], R['Polymer Bundle'], R['Circuits'], R['Fieldron Sample'], R['Oxium']],
	earth: [R['Ferrite'], R['Rubedo'], R['Neurodes'], R['Detonite Ampule']],
	mars: [R['Gallium'], R['Morphics'], R['Salvage'], R['Fieldron Sample'], R['Oxium']],
	phobos: [R['Rubedo'], R['Morphics'], R['Plastids'], R['Alloy Plate']],
	ceres: [R['Alloy Plate'], R['Circuits'], R['Orokin Cell'], R['Detonite Ampule'], R['Carbides']],
	jupiter: [R['Salvage'], R['Hexenon'], R['Neural Sensors'], R['Alloy Plate'], R['Oxium']],
	europa: [
		R['Morphics'],
		R['Rubedo'],
		R['Fieldron Sample'],
		R['Control Module'],
		R['Cubic Diodes'],
		R['Oxium'],
	],
	saturn: [R['Nano Spores'], R['Plastids'], R['Orokin Cell'], R['Detonite Ampule']],
	uranus: [R['Gallium'], R['Plastids'], R['Polymer Bundle'], R['Detonite Ampule'], R['Tellurium']],
	neptune: [R['Nano Spores'], R['Ferrite'], R['Control Module'], R['Fieldron Sample'], R['Oxium']],
	pluto: [
		R['Rubedo'],
		R['Morphics'],
		R['Plastids'],
		R['Alloy Plate'],
		R['Fieldron Sample'],
		R['Oxium'],
	],
	eris: [R['Nano Spores'], R['Plastids'], R['Neurodes'], R['Mutagen Sample'], R['Oxium']],
	sedna: [R['Alloy Plate'], R['Rubedo'], R['Salvage'], R['Detonite Ampule']],
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
			nodeLabel: 'Earth — Mantle (Capture, Grineer cave containers)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Breaking the green-glowing resource containers in the Grineer cave tileset on this quick Capture run guarantees Neurodes, no boss or high level required.',
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
			boostersApply: false,
			note: 'Quick low-level Grineer Exterminate on one of Gallium’s two signature planets. Gallium comes from mission-completion rewards and resource caches rather than an enemy drop table, so boosters do not increase it.',
			source: 'https://wiki.warframe.com/w/Gallium',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Uranus — Titania (Assassination, Tyl Regor, Steel Path)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Tyl Regor drops Gallium as an assassination reward on top of Uranus’ signature-resource bonus; Steel Path repeat runs scale well for squads. Gallium is reward/cache-based, not an enemy drop table, so boosters do not increase it.',
			source: 'https://wiki.warframe.com/w/Gallium',
			lastVerified: '2026-07-05',
		},
	],
	[R['Control Module']]: [
		{
			phase: 'early',
			nodeLabel: 'Void — Hepit (Capture)',
			nodeId: undefined,
			boostersApply: false,
			note: 'The wiki flags the Void as having a higher Control Module drop chance than any main planet; Hepit is a short, low-level Capture. Control Modules come from mission-completion/rotation rewards, so boosters and the Steel Path passive do not increase them.',
			source: 'https://wiki.warframe.com/w/Control_Module',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Void — Mot (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: false,
			note: 'Extrapolated from the wiki’s general "Void has better odds" guidance (no distinct late-game node is called out on the resource page): an endless Void Survival gives Steel Path squads the longest uninterrupted stream of completion/rotation rewards. Those rewards are not boosted.',
			source: 'https://wiki.warframe.com/w/Control_Module',
			lastVerified: '2026-07-05',
		},
	],
	[R['Rubedo']]: [
		{
			phase: 'early',
			nodeLabel: 'Phobos — Zeugma (Dark Sector Survival)',
			nodeId: undefined,
			boostersApply: false,
			note: 'The wiki cites roughly 250 Rubedo per 5 minutes here, among the best yields available to newer players on a signature Rubedo planet. Rubedo drops from containers and lockers rather than an enemy drop table, so boosters do not increase it.',
			source: 'https://wiki.warframe.com/w/Rubedo',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Void — Ani (Survival, Steel Path)',
			nodeId: undefined,
			boostersApply: false,
			note: 'The wiki recommends Orokin Void Survival/Defense generically for 1,000+ Rubedo per 20 minutes at endgame; Ani is a standard Void Survival node for that squad farm. Rubedo comes from containers/lockers, not an enemy drop table, so boosters do not increase it.',
			source: 'https://wiki.warframe.com/w/Rubedo',
			lastVerified: '2026-07-05',
		},
	],
};
