import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
	bestBountyStage,
	buildRegions,
	buildNodes,
	buildFrames,
	resolveDropLocation,
	type SolNodes,
	type RawWarframe,
} from './build';
import { KEY_BOSS_SOLNODES } from './curated';

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

describe('buildFrames (Equinox: dual-aspect parts derived from components)', () => {
	const uranusNodes: SolNodes = {
		SolNodeTitania: { value: 'Titania (Uranus)', enemy: 'Grineer', type: 'Assassination' },
	};
	const nodes = buildNodes(uranusNodes);
	const equinoxWarframes: RawWarframe[] = [
		{
			name: 'Equinox',
			uniqueName: '/Lotus/Powersuits/Equinox/Equinox',
			type: 'Warframe',
			components: [
				{ name: 'Blueprint', drops: [] },
				{
					name: 'Day Aspect',
					drops: [
						{ location: 'Uranus/Titania (Assassination)', rarity: 'Uncommon', chance: 22.56 },
					],
				},
				{
					name: 'Night Aspect',
					drops: [
						{ location: 'Uranus/Titania (Assassination)', rarity: 'Uncommon', chance: 22.56 },
					],
				},
			],
		},
	];

	it('links Equinox to Titania with dayaspect/nightaspect parts (not chassis/neuroptics/systems)', () => {
		const { frames } = buildFrames(equinoxWarframes, nodes);
		const equinox = frames.find((f) => f.id === 'equinox')!;
		expect(equinox).toBeDefined();
		expect(equinox.nodeId).toBe('SolNodeTitania');
		expect(equinox.parts.map((p) => p.slot)).toEqual(['bp', 'dayaspect', 'nightaspect']);
		const bp = equinox.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBeUndefined();
		const day = equinox.parts.find((p) => p.slot === 'dayaspect')!;
		expect(day.dropSourceNodeId).toBe('SolNodeTitania');
		expect(day.chance).toBe(22.56);
		const night = equinox.parts.find((p) => p.slot === 'nightaspect')!;
		expect(night.dropSourceNodeId).toBe('SolNodeTitania');
	});

	it('still yields exactly 4 standard parts for a regular frame (Rhino) in the same run', () => {
		const rhinoNodes = buildNodes(solNodes);
		const { frames } = buildFrames(warframes, rhinoNodes);
		const rhino = frames.find((f) => f.id === 'rhino')!;
		expect(rhino.parts.map((p) => p.slot)).toEqual(['bp', 'neuroptics', 'chassis', 'systems']);
	});
});

describe('curated Eris key-boss nodes (Mesa, Atlas)', () => {
	const keyBossNodes = buildNodes(KEY_BOSS_SOLNODES);

	it('creates the two curated nodes on eris, marked Assassination', () => {
		expect(keyBossNodes.map((n) => n.id).sort()).toEqual([
			'CuratedJordasGolem',
			'CuratedMutalistAladV',
		]);
		for (const n of keyBossNodes) {
			expect(n.regionId).toBe('eris');
			expect(n.isAssassination).toBe(true);
		}
	});

	const mesa: RawWarframe = {
		name: 'Mesa',
		uniqueName: '/Lotus/Powersuits/Mesa/Mesa',
		type: 'Warframe',
		components: [
			{ name: 'Blueprint', drops: [] },
			{
				name: 'Neuroptics',
				drops: [
					{ location: 'Mutalist Alad V Assassinate, Rotation C', rarity: 'Rare', chance: 38.72 },
				],
			},
			{
				name: 'Chassis',
				drops: [
					{ location: 'Mutalist Alad V Assassinate, Rotation C', rarity: 'Rare', chance: 38.72 },
				],
			},
			{
				name: 'Systems',
				drops: [
					{ location: 'Mutalist Alad V Assassinate, Rotation C', rarity: 'Rare', chance: 22.56 },
				],
			},
		],
	};
	const atlas: RawWarframe = {
		name: 'Atlas',
		uniqueName: '/Lotus/Powersuits/Atlas/Atlas',
		type: 'Warframe',
		components: [
			{ name: 'Blueprint', drops: [] },
			{
				name: 'Neuroptics',
				drops: [
					{ location: 'Jordas Golem Assassinate, Rotation C', rarity: 'Rare', chance: 38.72 },
				],
			},
			{
				name: 'Chassis',
				drops: [
					{ location: 'Jordas Golem Assassinate, Rotation C', rarity: 'Rare', chance: 38.72 },
				],
			},
			{
				name: 'Systems',
				drops: [
					{ location: 'Jordas Golem Assassinate, Rotation C', rarity: 'Rare', chance: 22.56 },
				],
			},
		],
	};

	it('links Mesa to Mutalist Alad V and Atlas to Jordas Golem, each with 4 parts and a named boss', () => {
		const { frames, bosses } = buildFrames([mesa, atlas], keyBossNodes);
		const mesaFrame = frames.find((f) => f.id === 'mesa')!;
		const atlasFrame = frames.find((f) => f.id === 'atlas')!;
		expect(mesaFrame).toBeDefined();
		expect(atlasFrame).toBeDefined();
		expect(mesaFrame.nodeId).toBe('CuratedMutalistAladV');
		expect(atlasFrame.nodeId).toBe('CuratedJordasGolem');
		expect(mesaFrame.parts.map((p) => p.slot)).toEqual(['bp', 'neuroptics', 'chassis', 'systems']);
		expect(atlasFrame.parts.map((p) => p.slot)).toEqual(['bp', 'neuroptics', 'chassis', 'systems']);
		const mesaBoss = bosses.find((b) => b.nodeId === 'CuratedMutalistAladV')!;
		const atlasBoss = bosses.find((b) => b.nodeId === 'CuratedJordasGolem')!;
		expect(mesaBoss.name).toBe('Mutalist Alad V');
		expect(atlasBoss.name).toBe('Jordas Golem');
	});
});

describe('resolveDropLocation', () => {
	it('resolves a curated raw WFCD assassination string with a rotation suffix', () => {
		expect(resolveDropLocation('Mutalist Alad V Assassinate, Rotation C')).toEqual({
			planet: 'Eris',
			node: 'Mutalist Alad V',
			type: 'Assassination',
		});
		expect(resolveDropLocation('Jordas Golem Assassinate, Rotation C')).toEqual({
			planet: 'Eris',
			node: 'Jordas Golem',
			type: 'Assassination',
		});
	});
	it('still parses a standard "Planet/Node (Type)" string', () => {
		expect(resolveDropLocation('Venus/Fossa (Assassination)')).toEqual({
			planet: 'Venus',
			node: 'Fossa',
			type: 'Assassination',
		});
	});
	it('returns null for a bogus string', () => {
		expect(resolveDropLocation('nonsense')).toBeNull();
	});
});

describe('bestBountyStage', () => {
	// Gara Chassis shape: L5–15, three sub-rewards per rotation, A/B/C equal.
	const garaChassis = ['A', 'B', 'C'].flatMap((rot) =>
		[30.56, 7.37, 7.52].map((chance) => ({
			location: `Earth/Cetus (Level 5 - 15 Cetus Bounty), Rotation ${rot}`,
			chance,
		})),
	);
	it('sums sub-rewards per stage and collapses equal A/B/C to "any"', () => {
		const s = bestBountyStage(garaChassis)!;
		expect(s.bountyTier).toBe('L5–15');
		expect(s.rotation).toBe('any');
		expect(s.chance).toBeCloseTo(45.45, 1);
	});

	it('picks the single best rotation when rotations differ', () => {
		const drops = [
			{ location: 'Earth/Cetus (Level 20 - 40 Cetus Bounty), Rotation A', chance: 42.5 },
			{ location: 'Earth/Cetus (Level 20 - 40 Cetus Bounty), Rotation B', chance: 41.9 },
			{ location: 'Earth/Cetus (Level 20 - 40 Cetus Bounty), Rotation C', chance: 46.7 },
		];
		const s = bestBountyStage(drops)!;
		expect(s.rotation).toBe('C');
		expect(s.bountyTier).toBe('L20–40');
		expect(s.chance).toBeCloseTo(46.7, 1);
	});

	it('breaks a tie toward the lower tier', () => {
		const drops = [
			{
				location: 'Deimos/Cambion Drift (Level 100 - 100 Cambion Drift Bounty), Rotation A',
				chance: 28.3,
			},
			{
				location: 'Deimos/Cambion Drift (Level 40 - 60 Cambion Drift Bounty), Rotation A',
				chance: 28.3,
			},
		];
		const s = bestBountyStage(drops)!;
		expect(s.bountyTier).toBe('L40–60');
		expect(s.rotation).toBe('A');
	});

	it('joins partial tied rotations (A/B, no C)', () => {
		const drops = [
			{
				location: 'Deimos/Cambion Drift (Level 30 - 40 Cambion Drift Bounty), Rotation A',
				chance: 26,
			},
			{
				location: 'Deimos/Cambion Drift (Level 30 - 40 Cambion Drift Bounty), Rotation B',
				chance: 26,
			},
		];
		expect(bestBountyStage(drops)!.rotation).toBe('A/B');
	});

	it('does not merge identical tiers across different zones (Caliban)', () => {
		const drops = [
			{ location: 'Earth/Cetus (Level 50 - 70 Cetus Bounty), Rotation B', chance: 21.1 },
			{ location: 'Venus/Orb Vallis (Level 50 - 70 Orb Vallis Bounty), Rotation B', chance: 21.1 },
		];
		expect(bestBountyStage(drops)!.chance).toBeCloseTo(21.1, 1);
	});

	it('returns chance only (no tier/rotation) for a non-bounty source', () => {
		const s = bestBountyStage([{ location: 'Exploiter Orb', chance: 38.72 }])!;
		expect(s.chance).toBeCloseTo(38.72, 2);
		expect(s.bountyTier).toBeUndefined();
		expect(s.rotation).toBeUndefined();
	});

	it('ignores Plague Star event drops in favour of the recurring bounty', () => {
		const drops = [
			{ location: 'Earth/Cetus (Level 15 - 25 Plague Star), Rotation A', chance: 40.3 },
			{ location: 'Earth/Cetus (Level 30 - 50 Cetus Bounty), Rotation A', chance: 39.4 },
		];
		expect(bestBountyStage(drops)!.bountyTier).toBe('L30–50');
	});

	it('returns null when there are no eligible drops', () => {
		expect(bestBountyStage([])).toBeNull();
		expect(
			bestBountyStage([{ location: 'Earth/Cetus (Level 15 - 25 Plague Star)', chance: 5 }]),
		).toBeNull();
	});
});
