import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	assembleDataset,
	validateDataset,
	buildResources,
	recRegionId,
	validateRecommendationLabels,
	staleRecommendations,
} from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';
import type { Dataset } from '../../src/lib/model/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);
// Inline solNodes with one node on every main planet the curated
// PLANET_RESOURCES map references, so assembleDataset builds all 14 regions
// and every resource's regionIds resolves legitimately against ds.regions
// (no production-side intersection needed). Fossa/Venus + Oro/Earth stay
// Assassination so the frame-backfill assertions (Rhino/Mesa) still link.
const solNodes: SolNodes = {
	SolNode104: { value: 'Fossa (Venus)', enemy: 'Corpus', type: 'Assassination' },
	SolNode14: { value: 'Oro (Earth)', enemy: 'Grineer', type: 'Assassination' },
	SolNodeMercury: { value: 'Apollodorus (Mercury)', enemy: 'Grineer', type: 'Survival' },
	SolNodeMars: { value: 'Wahiba (Mars)', enemy: 'Grineer', type: 'Survival' },
	SolNodePhobos: { value: 'Gulliver (Phobos)', enemy: 'Corpus', type: 'Defense' },
	SolNodeCeres: { value: 'Gabii (Ceres)', enemy: 'Grineer', type: 'Survival' },
	SolNodeJupiter: { value: 'Elara (Jupiter)', enemy: 'Corpus', type: 'Survival' },
	SolNodeEuropa: { value: 'Ose (Europa)', enemy: 'Corpus', type: 'Defense' },
	SolNodeSaturn: { value: 'Piscinas (Saturn)', enemy: 'Grineer', type: 'Survival' },
	SolNodeUranus: { value: 'Ophelia (Uranus)', enemy: 'Grineer', type: 'Survival' },
	SolNodeNeptune: { value: 'Yursa (Neptune)', enemy: 'Corpus', type: 'Survival' },
	SolNodePluto: { value: 'Hieracon (Pluto)', enemy: 'Corpus', type: 'Excavation' },
	SolNodeEris: { value: 'Akkad (Eris)', enemy: 'Infested', type: 'Defense' },
	SolNodeSedna: { value: 'Kelpie (Sedna)', enemy: 'Grineer', type: 'Survival' },
	// Special regions: present so QUESTS' revealsRegionIds all resolve and
	// validateDataset's spoilerGated→questId check passes for each.
	SolNodeDeimos: { value: 'Magnacidium (Deimos)', enemy: 'Infested', type: 'Assassination' },
	SolNodeVoid: { value: 'Hepit (Void)', enemy: 'Orokin', type: 'Capture' },
	SolNodeLua: { value: 'Tycho (Lua)', enemy: 'Corpus', type: 'Survival' },
	SolNodeKuva: { value: 'Taveuni (Kuva Fortress)', enemy: 'Grineer', type: 'Survival' },
	SolNodeZariman: {
		value: 'Halako Perimeter (Zariman)',
		enemy: 'Crossfire',
		type: 'Extermination',
	},
	SolNode228: { value: 'Plains of Eidolon (Earth)', enemy: 'Grineer', type: 'Free Roam' },
	SolNode129: { value: 'Orb Vallis (Venus)', enemy: 'Corpus', type: 'Free Roam' },
	SolNode229: { value: 'Cambion Drift (Deimos)', enemy: 'Infested', type: 'Free Roam' },
	// Mission-node farm nodes (Task: mission-node frames)
	SolNode450: { value: 'Tyana Pass (Mars)', enemy: 'Crossfire', type: 'Mirror Defense' },
	SolNode721: { value: 'Armatus (Deimos)', enemy: 'The Murmur', type: 'Disruption' },
	SolNode177: { value: 'Kappa (Sedna)', enemy: 'Grineer', type: 'Disruption' },
	SolNode310: { value: 'Circulus (Lua)', enemy: 'Grineer', type: 'Survival' },
	SolNode167: { value: 'Oestrus (Eris)', enemy: 'Infested', type: 'Infested Salvage' },
	SolNode723: { value: 'Brutus (Uranus)', enemy: 'Corpus', type: 'Ascension' },
	ZarimanHub: { value: 'Chrysalith (Zariman)', enemy: 'Tenno', type: 'Relay' },
};

describe('assembleDataset', () => {
	const ow = (name: string): RawWarframe => ({
		name,
		uniqueName: `/Lotus/Powersuits/${name}/${name}`,
		type: 'Warframe',
		components: [
			{ name: 'Blueprint', drops: [] },
			{
				name: 'Chassis',
				drops: [{ location: 'Earth/Cetus (Level 5 - 15 Cetus Bounty), Rotation A', chance: 30 }],
			},
		],
	});
	const owWarframes = [
		'Gara',
		'Revenant',
		'Garuda',
		'Hildryn',
		'Xaku',
		'Qorvex',
		'Caliban',
		'Protea',
		'Koumei',
		'Citrine',
		'Dante',
		'Gauss',
		'Voruna',
		'Nidus',
		'Jade',
		'Gyre',
	].map(ow);
	const ds = assembleDataset(solNodes, [...warframes, ...owWarframes]);
	it('back-fills bossId/frameId on the assassination node', () => {
		const fossa = ds.nodes.find((n) => n.id === 'SolNode104')!;
		expect(fossa.bossId).toBe('fossa');
		expect(fossa.frameId).toBe('rhino');
	});
	it('includes built resources with populated region resourceIds', () => {
		expect(ds.resources.length).toBeGreaterThan(0);
		const venus = ds.regions.find((r) => r.id === 'venus')!;
		expect(venus.resourceIds.length).toBeGreaterThan(0);
	});
	it('passes integrity validation', () => {
		expect(validateDataset(ds)).toEqual([]);
	});
	it('detects a dangling reference', () => {
		const broken = structuredClone(ds);
		broken.nodes.find((n) => n.id === 'SolNode104')!.frameId = 'ghost';
		expect(validateDataset(broken).join(' ')).toMatch(/ghost/);
	});
	it('detects a resource pointing at a nonexistent region', () => {
		const broken = structuredClone(ds);
		broken.resources[0].regionIds = ['ghostplanet'];
		expect(validateDataset(broken).join(' ')).toMatch(/ghostplanet/);
	});
	it('includes quests', () => {
		expect(ds.quests.length).toBeGreaterThan(0);
	});
	it('links Nekros to the Deimos Assassination node', () => {
		const deimosNode = ds.nodes.find((n) => n.id === 'SolNodeDeimos')!;
		expect(deimosNode.frameId).toBe('nekros');
		expect(ds.warframes.some((f) => f.id === 'nekros')).toBe(true);
	});
	it('detects a quest revealing a nonexistent frame', () => {
		const broken = structuredClone(ds);
		broken.quests[0].revealsFrameIds = ['ghostframe'];
		expect(validateDataset(broken).join(' ')).toMatch(/ghostframe/);
	});
	it('attaches the 17 open-world farms and builds their frames', () => {
		expect(ds.openWorldFarms).toHaveLength(17);
		for (const id of [
			'gara',
			'xaku',
			'caliban',
			'qorvex',
			'protea',
			'koumei',
			'citrine',
			'dante',
			'gauss',
			'voruna',
			'nidus',
			'jade',
			'gyre',
		]) {
			expect(ds.warframes.some((f) => f.id === id)).toBe(true);
		}
	});
	it('injects Albrecht’s Laboratories as a Free Roam node on Deimos', () => {
		const n = ds.nodes.find((x) => x.id === 'CuratedAlbrechtLabs')!;
		expect(n).toMatchObject({
			regionId: 'deimos',
			missionType: 'Free Roam',
			isAssassination: false,
		});
	});
	it("injects Saya's Visions (earth) and Granum Void (venus) as mission-farm nodes", () => {
		expect(ds.nodes.find((x) => x.id === 'CuratedSayasVisions')).toMatchObject({
			regionId: 'earth',
			missionType: 'Shrine Defense',
			isAssassination: false,
		});
		expect(ds.nodes.find((x) => x.id === 'CuratedGranumVoid')).toMatchObject({
			regionId: 'venus',
			missionType: 'Granum Void',
			isAssassination: false,
		});
	});
	it('detects a dangling open-world farm frame', () => {
		const broken = structuredClone(ds);
		broken.openWorldFarms[0].frameId = 'ghostframe';
		expect(validateDataset(broken).join(' ')).toMatch(/ghostframe/);
	});
});

describe('buildResources', () => {
	const resources = buildResources();
	it('builds curated resources with regionIds + recs', () => {
		const alloy = resources.find((r) => r.id === 'alloyplate');
		expect(alloy?.regionIds).toContain('venus');
		expect(alloy?.recommendations.length).toBeGreaterThan(0);
	});
	it('tags each recommendation with the main-planet region parsed from its nodeLabel', () => {
		const resources = buildResources();
		const alloy = resources.find((r) => r.id === 'alloyplate')!;
		// Every rec gets a regionId (main planet) or undefined (special region) — never left unset.
		for (const rec of alloy.recommendations)
			expect(Object.prototype.hasOwnProperty.call(rec, 'regionId')).toBe(true);
	});
});

describe('recRegionId', () => {
	it('parses the main-planet region from a nodeLabel', () => {
		expect(recRegionId('Uranus — Ophelia (Survival)')).toBe('uranus');
		expect(recRegionId('Earth — Mantle (Capture, Grineer cave containers)')).toBe('earth');
	});
	it('resolves special-region nodes too (Deimos/Void)', () => {
		expect(recRegionId('Deimos — Terrorem (Survival)')).toBe('deimos');
		expect(recRegionId('Void — Hepit')).toBe('void');
	});
	it('returns undefined for an unknown leading token', () => {
		expect(recRegionId('Nowhere — Somenode')).toBeUndefined();
	});
});

describe('validateDataset aspect ids', () => {
	it('accepts an aspect-scoped leaf part id', () => {
		const ds = {
			regions: [],
			nodes: [{ id: 'titania' }],
			bosses: [],
			warframes: [
				{
					id: 'equinox',
					name: 'Equinox',
					nodeId: 'titania',
					parts: [
						{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp' },
						{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day' },
					],
				},
			],
			resources: [],
			quests: [],
			openWorldFarms: [],
		} as unknown as Dataset;
		expect(validateDataset(ds)).toEqual([]);
	});
});

/** Minimal dataset carrying just the nodes and recommendations under test. */
function withRecs(
	nodes: { id: string; name: string; regionId: string }[],
	recs: { nodeLabel: string; lastVerified?: string; nodeId?: string }[],
): Dataset {
	return {
		regions: [],
		nodes,
		bosses: [],
		warframes: [],
		quests: [],
		openWorldFarms: [],
		resources: [
			{
				id: 'testresource',
				name: 'Test Resource',
				regionIds: [],
				recommendations: recs.map((r) => ({
					phase: 'early' as const,
					nodeLabel: r.nodeLabel,
					nodeId: r.nodeId,
					boostersApply: true,
					note: '',
					source: 'https://wiki.warframe.com/x',
					lastVerified: r.lastVerified ?? '2026-07-01',
				})),
			},
		],
	} as unknown as Dataset;
}

const CERES = [
	{ id: 'n1', name: 'Seimeni', regionId: 'ceres' },
	{ id: 'n2', name: 'Gabii', regionId: 'ceres' },
];

describe('validateRecommendationLabels', () => {
	it('accepts a label naming a real node on a real region', () => {
		expect(
			validateRecommendationLabels(
				withRecs(CERES, [{ nodeLabel: 'Ceres — Gabii (Dark Sector Survival)' }]),
			),
		).toEqual([]);
	});

	it('rejects a label whose node no longer exists', () => {
		// D1, the whole point: a game update renames a node, the curated label
		// keeps pointing at the old name, and the build currently stays green
		// while the site goes quietly wrong.
		const problems = validateRecommendationLabels(
			withRecs(CERES, [{ nodeLabel: 'Ceres — Gabbii (Dark Sector Survival)' }]),
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/no node "Gabbii" on ceres/);
	});

	it('rejects a label on a region that has no nodes', () => {
		const problems = validateRecommendationLabels(
			withRecs(CERES, [{ nodeLabel: 'Nowhere — Somenode (Survival)' }]),
		);
		expect(problems[0]).toMatch(/unknown region "Nowhere"/);
	});

	it('validates BOTH nodes of a "A / B" shorthand label', () => {
		// 'Ceres — Seimeni / Gabii' names two real nodes; allowlisting it would
		// have been the lazy fix and would have lost drift coverage on both.
		expect(
			validateRecommendationLabels(
				withRecs(CERES, [{ nodeLabel: 'Ceres — Seimeni / Gabii (Dark Sector)' }]),
			),
		).toEqual([]);
		const problems = validateRecommendationLabels(
			withRecs(CERES, [{ nodeLabel: 'Ceres — Seimeni / Gabbii (Dark Sector)' }]),
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/Gabbii/);
	});

	it('rejects a dash-less label that is not allowlisted', () => {
		const problems = validateRecommendationLabels(
			withRecs(CERES, [{ nodeLabel: 'Some Game Mode (somewhere)' }]),
		);
		expect(problems[0]).toMatch(/no "Planet — Node" prefix/);
	});

	it.each([
		'Anywhere — Daily First Win Bonus',
		'Sanctuary Onslaught (Cephalon Simaris)',
		'Elite Sanctuary Onslaught (Cephalon Simaris)',
		'Excavation Void Fissures (rotating nodes)',
		'Höllvania — Legacyte Harvest (Techrot Safes)',
		'Neptune Proxima — Nu-gua Mines (Railjack)',
		'Venus — Profit-Taker Orb (Heist Phase 4)',
		'Neptune — The Index (High Risk)',
		'Zariman — Void Cascade (Steel Path)',
	])('allowlists the intentional non-node label %s', (nodeLabel) => {
		expect(validateRecommendationLabels(withRecs(CERES, [{ nodeLabel }]))).toEqual([]);
	});

	it.each([
		'Ceres — Gabbii (Excavation Void Fissures (rotating nodes))',
		'Ceres — Gabbii (better than Sanctuary Onslaught)',
		'Ceres — Gabbii (nearer than Neptune Proxima — Nu-gua Mines)',
	])('does not allowlist a real label that merely mentions an exception: %s', (nodeLabel) => {
		// Every allowlist pattern is anchored for this reason. An unanchored one
		// would let any label *containing* the phrase skip node validation —
		// silently re-opening the exact hole this module closes.
		const problems = validateRecommendationLabels(withRecs(CERES, [{ nodeLabel }]));
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/Gabbii/);
	});
});

describe('validateDataset recommendation nodeId', () => {
	it('reports a recommendation pointing at a node that does not exist', () => {
		// This check existed but was dead: every curated rec has
		// nodeId: undefined, so nothing ever exercised it. Kept (rather than
		// deleted) because it is correct the moment a rec does carry a nodeId —
		// this test is what makes it live code.
		const ds = withRecs(CERES, [{ nodeLabel: 'Ceres — Gabii', nodeId: 'ghostnode' }]);
		expect(validateDataset(ds).join(' ')).toMatch(/missing node ghostnode/);
	});
});

describe('staleRecommendations', () => {
	const now = new Date('2026-07-25T00:00:00Z');

	it('ignores recommendations verified within six months', () => {
		expect(
			staleRecommendations(withRecs(CERES, [{ nodeLabel: 'x', lastVerified: '2026-07-01' }]), now),
		).toEqual([]);
	});

	it('flags one verified more than six months ago', () => {
		const stale = staleRecommendations(
			withRecs(CERES, [{ nodeLabel: 'x', lastVerified: '2025-01-01' }]),
			now,
		);
		expect(stale).toHaveLength(1);
		expect(stale[0]).toMatchObject({ resourceId: 'testresource', lastVerified: '2025-01-01' });
	});
});
