import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleDataset, validateDataset, buildResources, recRegionId } from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);
const rawResources = [
	{ name: 'Alloy Plate', imageName: 'AlloyPlate.png' },
	{ name: 'Orokin Cell', imageName: 'ComponentCell.png' },
];

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
	const owWarframes = ['Gara', 'Revenant', 'Garuda', 'Hildryn', 'Xaku', 'Qorvex', 'Caliban'].map(
		ow,
	);
	const ds = assembleDataset(solNodes, [...warframes, ...owWarframes], rawResources);
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
	it('attaches the 8 open-world farms and builds their frames', () => {
		expect(ds.openWorldFarms).toHaveLength(8);
		for (const id of ['gara', 'xaku', 'caliban', 'qorvex']) {
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
	it('detects a dangling open-world farm frame', () => {
		const broken = structuredClone(ds);
		broken.openWorldFarms[0].frameId = 'ghostframe';
		expect(validateDataset(broken).join(' ')).toMatch(/ghostframe/);
	});
});

describe('buildResources', () => {
	const resources = buildResources(rawResources);
	it('builds curated resources with image + regionIds + recs', () => {
		const alloy = resources.find((r) => r.id === 'alloyplate');
		expect(alloy?.image).toBe('AlloyPlate.png');
		expect(alloy?.regionIds).toContain('venus');
		expect(alloy?.recommendations.length).toBeGreaterThan(0);
	});
	it('tags each recommendation with the main-planet region parsed from its nodeLabel', () => {
		const resources = buildResources(rawResources);
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
