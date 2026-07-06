import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildRegions, buildNodes, buildFrames, type SolNodes, type RawWarframe } from './build';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const solNodes: SolNodes = JSON.parse(
	readFileSync(join(__dirname, './fixtures/solNodes.sample.json'), 'utf8'),
);

describe('buildNodes', () => {
	const nodes = buildNodes(solNodes);
	it('includes only parseable nodes on the 14 planets', () => {
		// SolNode0 (placeholder) excluded; Fossa/Cytherean (Venus) + Oro (Earth) included
		expect(nodes.map((n) => n.id).sort()).toEqual(['SolNode104', 'SolNode14', 'SolNode30']);
	});
	it('marks assassination nodes and sets region/faction', () => {
		const fossa = nodes.find((n) => n.id === 'SolNode104')!;
		expect(fossa).toMatchObject({
			name: 'Fossa',
			regionId: 'venus',
			faction: 'Corpus',
			isAssassination: true,
		});
		const cyth = nodes.find((n) => n.id === 'SolNode30')!;
		expect(cyth.isAssassination).toBe(false);
	});
});

describe('buildRegions', () => {
	const regions = buildRegions(solNodes);
	it('creates a region per present planet with metadata', () => {
		expect(regions.map((r) => r.id).sort()).toEqual(['earth', 'venus']);
		const venus = regions.find((r) => r.id === 'venus')!;
		expect(venus).toMatchObject({ name: 'Venus', progressionOrder: 2, kind: 'planet' });
		expect(venus.nodeIds.sort()).toEqual(['SolNode104', 'SolNode30']);
	});
});

const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);

describe('buildFrames', () => {
	const nodes = buildNodes(solNodes);
	const { frames, bosses } = buildFrames(warframes, nodes);
	it('includes only node-linked frames (Rhino, Mesa), excludes Volt', () => {
		expect(frames.map((f) => f.id).sort()).toEqual(['mesa', 'rhino']);
	});
	it('links Rhino to Fossa with 4 parts and drop chances', () => {
		const rhino = frames.find((f) => f.id === 'rhino')!;
		expect(rhino.nodeId).toBe('SolNode104');
		expect(rhino.parts).toHaveLength(4);
		const chassis = rhino.parts.find((p) => p.slot === 'chassis')!;
		expect(chassis).toMatchObject({
			id: 'rhino:chassis',
			dropSourceNodeId: 'SolNode104',
			chance: 38.72,
		});
		const bp = rhino.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBeUndefined();
	});
	it('emits a boss per linked node from the curated map', () => {
		const jackal = bosses.find((b) => b.nodeId === 'SolNode104')!;
		expect(jackal).toMatchObject({ id: 'fossa', name: 'Jackal', faction: 'Corpus' });
	});
	it('never attaches a chance to the bp part even if Blueprint has an Assassination drop, and the node link comes only from the component drop', () => {
		const wf: RawWarframe[] = [
			{
				name: 'Trinity',
				uniqueName: '/Lotus/Powersuits/Trinity/Trinity',
				type: 'Warframe',
				components: [
					{
						name: 'Blueprint',
						drops: [{ location: 'Venus/Fossa (Assassination)', rarity: 'Common', chance: 50 }],
					},
					{
						name: 'Chassis',
						drops: [{ location: 'Venus/Fossa (Assassination)', rarity: 'Common', chance: 25 }],
					},
				],
			},
		];
		const { frames } = buildFrames(wf, nodes);
		const trinity = frames.find((f) => f.id === 'trinity')!;
		const bp = trinity.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBeUndefined();
		expect(bp.chance).toBeUndefined();
		const chassis = trinity.parts.find((p) => p.slot === 'chassis')!;
		expect(chassis.dropSourceNodeId).toBe('SolNode104');
		expect(chassis.chance).toBe(25);
	});
	it('does not create a frame when only the Blueprint has an Assassination drop (no component drop to link a node)', () => {
		const wf: RawWarframe[] = [
			{
				name: 'Loki',
				uniqueName: '/Lotus/Powersuits/Loki/Loki',
				type: 'Warframe',
				components: [
					{
						name: 'Blueprint',
						drops: [{ location: 'Venus/Fossa (Assassination)', rarity: 'Common', chance: 50 }],
					},
				],
			},
		];
		const { frames } = buildFrames(wf, nodes);
		expect(frames.find((f) => f.id === 'loki')).toBeUndefined();
	});
});

describe('special regions (Deimos)', () => {
	const deimosNodes: SolNodes = {
		SolNodeMag: { value: 'Magnacidium (Deimos)', enemy: 'Infested', type: 'Assassination' },
		SolNodeRelay: { value: 'Necralisk (Deimos)', enemy: 'Tenno', type: 'Relay' },
	};

	it('buildRegions includes deimos as a special region, unfiltered relay node included', () => {
		const regions = buildRegions(deimosNodes);
		const deimos = regions.find((r) => r.id === 'deimos')!;
		expect(deimos).toMatchObject({
			kind: 'special',
			spoilerGated: true,
			questId: 'heartofdeimos',
		});
		expect(deimos.nodeIds.sort()).toEqual(['SolNodeMag', 'SolNodeRelay']);
	});

	it('buildFrames links Nekros to the Deimos Assassination node', () => {
		const nekrosWarframes: RawWarframe[] = [
			{
				name: 'Nekros',
				uniqueName: '/Lotus/Powersuits/Nekros/Nekros',
				type: 'Warframe',
				components: [
					{ name: 'Blueprint', drops: [] },
					{
						name: 'Chassis',
						drops: [
							{ location: 'Deimos/Magnacidium (Assassination)', rarity: 'Common', chance: 33.33 },
						],
					},
				],
			},
		];
		const nodes = buildNodes(deimosNodes);
		const { frames } = buildFrames(nekrosWarframes, nodes);
		const nekros = frames.find((f) => f.id === 'nekros')!;
		expect(nekros).toBeDefined();
		expect(nekros.nodeId).toBe('SolNodeMag');
	});
});
