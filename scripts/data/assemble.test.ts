import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleDataset, validateDataset, buildResources } from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);
const rawResources = [
	{ name: 'Alloy Plate', imageName: 'AlloyPlate.png', type: 'Resource' },
	{ name: 'Orokin Cell', imageName: 'ComponentCell.png', type: 'Resource' },
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
};

describe('assembleDataset', () => {
	const ds = assembleDataset(solNodes, warframes, rawResources);
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
});

describe('buildResources', () => {
	const resources = buildResources(rawResources);
	it('builds curated resources with image + regionIds + recs', () => {
		const alloy = resources.find((r) => r.id === 'alloyplate');
		expect(alloy?.image).toBe('AlloyPlate.png');
		expect(alloy?.regionIds).toContain('venus');
		expect(alloy?.recommendations.length).toBeGreaterThan(0);
	});
});
