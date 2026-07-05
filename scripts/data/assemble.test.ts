import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleDataset, validateDataset, buildResources } from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const solNodes: SolNodes = JSON.parse(
	readFileSync(join(__dirname, './fixtures/solNodes.sample.json'), 'utf8'),
);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);
const rawResources = [
	{ name: 'Alloy Plate', imageName: 'AlloyPlate.png', type: 'Resource' },
	{ name: 'Orokin Cell', imageName: 'ComponentCell.png', type: 'Resource' },
];

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
