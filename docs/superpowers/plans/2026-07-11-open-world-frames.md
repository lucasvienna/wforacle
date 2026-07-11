# Open-World Frames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the seven open-world Warframes (Gara, Revenant, Caliban on Plains; Garuda, Hildryn, Caliban on Orb Vallis; Xaku, Qorvex on Deimos) to the tracker, each shown under its zone with its bounty source, best bounty stage (tier + rotation), and drop chance.

**Architecture:** A curated `openworld.ts` declares the zone→frame farm table plus one pseudo-node (Albrecht's Laboratories). The build pipeline pulls each frame's parts/image/drops from `@wfcd/items`, computes each component's best bounty stage with a pure `bestBountyStage` helper, and attaches an `openWorldFarms` array to the dataset. `RegionPanel.svelte` renders open-world zones inside the existing frames section, reusing a shared frame-card snippet.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Vitest + `@testing-library/svelte`, `tsx` data pipeline over `@wfcd/items` + `warframe-worldstate-data`, Tailwind, pnpm.

## Global Constraints

- Node 24 (`.node-version`); package manager is **pnpm**.
- Run unit tests with `pnpm test:unit --run` (Vitest). Type-check with `pnpm check`.
- Formatting: `pnpm format` (`oxfmt` for TS/JS, `prettier` for `.svelte`). Lint: `pnpm lint` (`oxlint`). A commit must pass `pnpm format:check` and `pnpm lint`.
- Use **tabs** for indentation (oxfmt/prettier config), matching existing files.
- Svelte components use **Svelte 5 runes** (`$props`, `$derived`, `{#snippet}`/`{@render}`). When editing `.svelte`, prefer the `svelte:svelte-file-editor` agent / svelte MCP tools per project convention.
- Conventional-commit messages (`feat:`, `test:`, `docs:`, `chore(data):`).
- Do **not** hand-edit `static/data/dataset.json`; regenerate via `pnpm data:build`.
- Spec: `docs/superpowers/specs/2026-07-11-open-world-frames-design.md`.

---

### Task 1: Data model — `OpenWorldFarm`, part stage fields, seed field

**Files:**

- Modify: `src/lib/model/types.ts`
- Modify: `src/lib/data/seed.ts`
- Test: `src/lib/data/seed.test.ts` (add one assertion)

**Interfaces:**

- Produces: `OpenWorldFarm { frameId: string; nodeId: string; regionId: string; componentSource: string; bpSource: string }`; `WarframePart` gains optional `bountyTier?: string` and `rotation?: string`; `Dataset` gains `openWorldFarms: OpenWorldFarm[]`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/data/seed.test.ts` inside the existing `describe('seed dataset', ...)`:

```ts
it('carries an openWorldFarms array (empty in the seed)', () => {
	expect(Array.isArray(seed.openWorldFarms)).toBe(true);
	expect(seed.openWorldFarms).toHaveLength(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/data/seed.test.ts`
Expected: FAIL — `seed.openWorldFarms` is `undefined` (and a type error on `seed`).

- [ ] **Step 3: Add the types**

In `src/lib/model/types.ts`, extend `WarframePart` (add the two optional fields after `chance?`):

```ts
export interface WarframePart {
	id: string;
	frameId: string;
	slot: Slot;
	dropSourceNodeId?: string;
	chance?: number;
	/** Open-world bounty stage the component drops at, e.g. "L20–40". Absent for
	 * assassination parts and non-bounty sources (Exploiter Orb). */
	bountyTier?: string;
	/** Bounty rotation: "A" | "B" | "C" | "any" | joined like "A/B". Absent when N/A. */
	rotation?: string;
}
```

Add the new interface (after `Quest`):

```ts
export interface OpenWorldFarm {
	frameId: string;
	nodeId: string;
	regionId: string;
	componentSource: string;
	bpSource: string;
}
```

Add the field to `Dataset`:

```ts
export interface Dataset {
	regions: Region[];
	nodes: StarNode[];
	bosses: Boss[];
	warframes: Warframe[];
	resources: Resource[];
	quests: Quest[];
	openWorldFarms: OpenWorldFarm[];
}
```

- [ ] **Step 4: Update the seed**

In `src/lib/data/seed.ts`, change the closing fields of the `seed` object from:

```ts
	resources: [],
	quests: [],
};
```

to:

```ts
	resources: [],
	quests: [],
	openWorldFarms: [],
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/data/seed.test.ts && pnpm check`
Expected: PASS; type-check clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/model/types.ts src/lib/data/seed.ts src/lib/data/seed.test.ts
git commit -m "feat(model): add OpenWorldFarm + part bounty-stage fields"
```

---

### Task 2: `bestBountyStage` pure helper

**Files:**

- Modify: `scripts/data/build.ts` (add exported helper + `BountyStage` type)
- Test: `scripts/data/build.test.ts` (new `describe` block)

**Interfaces:**

- Produces: `interface BountyStage { chance: number; bountyTier?: string; rotation?: string }` and `bestBountyStage(drops: { location: string; chance?: number }[]): BountyStage | null`.
- Selection rule: sum chances per exact location string; group those by (zone, tier); a group's chance is its best rotation and it records the rotations achieving that max; the winning group is the highest chance, ties broken by **lowest** tier level; rotation label is `"any"` when all of A/B/C tie, `undefined` when there is no rotation, else the tied rotations sorted and joined with `/`. Drops whose location contains "Plague Star" are excluded (time-limited event).

- [ ] **Step 1: Write the failing tests**

Add to the end of `scripts/data/build.test.ts`:

```ts
import { bestBountyStage } from './build';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run scripts/data/build.test.ts -t bestBountyStage`
Expected: FAIL — `bestBountyStage` is not exported.

- [ ] **Step 3: Implement the helper**

In `scripts/data/build.ts`, add at module scope (e.g. just above `buildFrames`):

```ts
export interface BountyStage {
	chance: number;
	bountyTier?: string;
	rotation?: string;
}

/** Pick the single best bounty stage (tier + rotation) a component drops at.
 * See the plan's Task 2 for the full selection rule. */
export function bestBountyStage(
	drops: { location: string; chance?: number }[],
): BountyStage | null {
	const eligible = drops.filter((d) => d.location && !/Plague Star/i.test(d.location));
	if (!eligible.length) return null;

	// 1. Sum chances per exact location string (collapses a stage's sub-rewards;
	//    keeps different zones/tiers/rotations separate).
	const byLoc = new Map<string, number>();
	for (const d of eligible) byLoc.set(d.location, (byLoc.get(d.location) ?? 0) + (d.chance ?? 0));

	// 2. Group by (zone, tier); a group's chance is its best rotation, and it
	//    records the rotations achieving that max.
	type Group = { tier?: string; lo: number; chance: number; rots: string[] };
	const groups = new Map<string, Group>();
	for (const [loc, chance] of byLoc) {
		const zone = loc.split('(')[0].trim();
		const lvl = loc.match(/Level\s*(\d+)\s*-\s*(\d+)/);
		const tier = lvl ? `L${lvl[1]}–${lvl[2]}` : undefined;
		const lo = lvl ? Number(lvl[1]) : 0;
		const rotM = loc.match(/Rotation ([A-C])/);
		const rot = rotM ? rotM[1] : undefined;
		const key = `${zone}|${tier ?? ''}`;
		const g = groups.get(key);
		if (!g) {
			groups.set(key, { tier, lo, chance, rots: rot ? [rot] : [] });
		} else if (chance > g.chance) {
			g.chance = chance;
			g.rots = rot ? [rot] : [];
		} else if (chance === g.chance && rot) {
			g.rots.push(rot);
		}
	}

	// 3. Winner: highest chance, tie → lowest tier level.
	let best: Group | null = null;
	for (const g of groups.values()) {
		if (!best || g.chance > best.chance || (g.chance === best.chance && g.lo < best.lo)) best = g;
	}
	if (!best) return null;

	// 4. Rotation label: all three → "any"; none → undefined; else sorted join.
	const rots = [...new Set(best.rots)].sort();
	const rotation = rots.length === 0 ? undefined : rots.length === 3 ? 'any' : rots.join('/');
	return { chance: best.chance, bountyTier: best.tier, rotation };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/build.test.ts -t bestBountyStage`
Expected: PASS (all 8 cases).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/build.ts scripts/data/build.test.ts
git commit -m "feat(data): bestBountyStage helper for open-world drop stages"
```

---

### Task 3: `buildOpenWorldFrames`

**Files:**

- Modify: `scripts/data/build.ts` (extract `ORDER` to module scope; add `buildOpenWorldFrames`)
- Test: `scripts/data/build.test.ts` (new `describe` block)

**Interfaces:**

- Consumes: `bestBountyStage` (Task 2); existing `SLOT_BY_COMPONENT`, `slugify`, `partId`, `RawWarframe`, `Slot`, `WarframePart`, `Warframe`; `OpenWorldFarm` (Task 1).
- Produces: `buildOpenWorldFrames(warframes: RawWarframe[], farms: OpenWorldFarm[]): Warframe[]` — one `Warframe` per unique `farms[].frameId` found (by `slugify(name)`), `nodeId` = that frame's first-listed farm node, component parts carry `dropSourceNodeId` (= primary node), `chance`, `bountyTier`, `rotation`; bp part carries none.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/data/build.test.ts`:

```ts
import { buildOpenWorldFrames } from './build';
import type { OpenWorldFarm } from '../../src/lib/model/types';

describe('buildOpenWorldFrames', () => {
	const gara: RawWarframe = {
		name: 'Gara',
		uniqueName: '/Lotus/Powersuits/Gara/Gara',
		type: 'Warframe',
		imageName: 'gara.png',
		components: [
			{ name: 'Blueprint', drops: [] },
			{
				name: 'Chassis',
				drops: [{ location: 'Earth/Cetus (Level 5 - 15 Cetus Bounty), Rotation A', chance: 45.45 }],
			},
			{
				name: 'Neuroptics',
				drops: [{ location: 'Earth/Cetus (Level 20 - 40 Cetus Bounty), Rotation C', chance: 46.7 }],
			},
			{
				name: 'Systems',
				drops: [{ location: 'Earth/Cetus (Level 10 - 30 Cetus Bounty), Rotation A', chance: 44.8 }],
			},
		],
	};
	const caliban: RawWarframe = {
		name: 'Caliban',
		uniqueName: '/Lotus/Powersuits/Caliban/Caliban',
		type: 'Warframe',
		components: [
			{ name: 'Blueprint', drops: [] },
			{
				name: 'Chassis',
				drops: [
					{ location: 'Earth/Cetus (Level 50 - 70 Cetus Bounty), Rotation B', chance: 21.1 },
					{
						location: 'Venus/Orb Vallis (Level 50 - 70 Orb Vallis Bounty), Rotation B',
						chance: 21.1,
					},
				],
			},
		],
	};
	const farms: OpenWorldFarm[] = [
		{
			frameId: 'gara',
			nodeId: 'SolNode228',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: "Complete Saya's Vigil",
		},
		{
			frameId: 'caliban',
			nodeId: 'SolNode228',
			regionId: 'earth',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
		{
			frameId: 'caliban',
			nodeId: 'SolNode129',
			regionId: 'venus',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
	];

	it('builds one frame per farmed id, linked to its primary (first) node', () => {
		const frames = buildOpenWorldFrames([gara, caliban], farms);
		expect(frames.map((f) => f.id).sort()).toEqual(['caliban', 'gara']);
		expect(frames.find((f) => f.id === 'caliban')!.nodeId).toBe('SolNode228');
		expect(frames.find((f) => f.id === 'gara')!.image).toBe('gara.png');
	});

	it('sets chance/tier/rotation on component parts and nothing on the bp part', () => {
		const gaEntry = buildOpenWorldFrames([gara], farms).find((f) => f.id === 'gara')!;
		const chassis = gaEntry.parts.find((p) => p.slot === 'chassis')!;
		expect(chassis).toMatchObject({
			dropSourceNodeId: 'SolNode228',
			bountyTier: 'L5–15',
			rotation: 'A',
		});
		expect(chassis.chance).toBeCloseTo(45.45, 1);
		const bp = gaEntry.parts.find((p) => p.slot === 'bp')!;
		expect(bp.chance).toBeUndefined();
		expect(bp.bountyTier).toBeUndefined();
		expect(bp.dropSourceNodeId).toBeUndefined();
	});

	it('does not double-count a part that drops in two zones (Caliban)', () => {
		const cal = buildOpenWorldFrames([caliban], farms).find((f) => f.id === 'caliban')!;
		expect(cal.parts.find((p) => p.slot === 'chassis')!.chance).toBeCloseTo(21.1, 1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run scripts/data/build.test.ts -t buildOpenWorldFrames`
Expected: FAIL — `buildOpenWorldFrames` not exported.

- [ ] **Step 3: Extract `ORDER` and implement**

In `scripts/data/build.ts`, move the slot order out of `buildFrames` to module scope (just below `SLOT_BY_COMPONENT`):

```ts
const ORDER: Slot[] = ['bp', 'neuroptics', 'chassis', 'systems', 'dayaspect', 'nightaspect'];
```

Then delete the local `const ORDER: Slot[] = [...]` line inside `buildFrames` (it now uses the module-scoped one).

Add the import for `OpenWorldFarm` to the existing `types` import at the top of `build.ts`:

```ts
import type {
	Region,
	StarNode,
	Warframe,
	Boss,
	Slot,
	WarframePart,
	OpenWorldFarm,
} from '../../src/lib/model/types';
```

Add the builder (e.g. after `buildFrames`):

```ts
export function buildOpenWorldFrames(warframes: RawWarframe[], farms: OpenWorldFarm[]): Warframe[] {
	const byId = new Map(warframes.map((w) => [slugify(w.name), w]));
	// Primary node = the first farm listed for each frame (drives Warframe.nodeId
	// and the command palette's region for the frame).
	const primaryNode = new Map<string, string>();
	for (const f of farms) if (!primaryNode.has(f.frameId)) primaryNode.set(f.frameId, f.nodeId);

	const frames: Warframe[] = [];
	for (const [frameId, nodeId] of primaryNode) {
		const wf = byId.get(frameId);
		if (!wf?.components) continue;
		const present = new Set<Slot>(['bp']);
		const stageBySlot = new Map<Slot, BountyStage | null>();
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (!slot) continue;
			present.add(slot);
			if (slot !== 'bp') stageBySlot.set(slot, bestBountyStage(c.drops ?? []));
		}
		const parts: WarframePart[] = ORDER.filter((s) => present.has(s)).map((slot) => {
			if (slot === 'bp') return { id: partId(frameId, slot), frameId, slot };
			const stage = stageBySlot.get(slot);
			return {
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: nodeId,
				chance: stage?.chance,
				bountyTier: stage?.bountyTier,
				rotation: stage?.rotation,
			};
		});
		frames.push({ id: frameId, name: wf.name, nodeId, image: wf.imageName, parts });
	}
	return frames;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: PASS (all build.test cases, including the pre-existing Equinox/Rhino/Mesa ones — the `ORDER` extraction must not change their output).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/build.ts scripts/data/build.test.ts
git commit -m "feat(data): buildOpenWorldFrames builds frames from bounty drops"
```

---

### Task 4: Curated open-world data (`openworld.ts`)

**Files:**

- Create: `scripts/data/openworld.ts`
- Test: `scripts/data/openworld.test.ts`

**Interfaces:**

- Produces: `OPEN_WORLD_SOLNODES: SolNodes` (the curated Albrecht's Laboratories pseudo-node) and `OPEN_WORLD_FARMS: OpenWorldFarm[]` (8 entries — Caliban twice).

- [ ] **Step 1: Write the failing tests**

Create `scripts/data/openworld.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS } from './openworld';

const ZONE_NODES = new Set(['SolNode228', 'SolNode129', 'SolNode229', 'CuratedAlbrechtLabs']);

describe('OPEN_WORLD_FARMS', () => {
	it('has 8 entries covering all seven frames', () => {
		expect(OPEN_WORLD_FARMS).toHaveLength(8);
		expect(new Set(OPEN_WORLD_FARMS.map((f) => f.frameId))).toEqual(
			new Set(['gara', 'revenant', 'caliban', 'garuda', 'hildryn', 'xaku', 'qorvex']),
		);
	});
	it('places Caliban in both Plains (earth) and Orb Vallis (venus)', () => {
		const cal = OPEN_WORLD_FARMS.filter((f) => f.frameId === 'caliban');
		expect(cal.map((f) => f.regionId).sort()).toEqual(['earth', 'venus']);
	});
	it('references only declared zone nodes', () => {
		for (const f of OPEN_WORLD_FARMS) expect(ZONE_NODES.has(f.nodeId)).toBe(true);
	});
	it('has no duplicate (frame, node) pair', () => {
		const keys = OPEN_WORLD_FARMS.map((f) => `${f.frameId}@${f.nodeId}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
	it('every farm has non-empty source labels', () => {
		for (const f of OPEN_WORLD_FARMS) {
			expect(f.componentSource.length).toBeGreaterThan(0);
			expect(f.bpSource.length).toBeGreaterThan(0);
		}
	});
});

describe('OPEN_WORLD_SOLNODES', () => {
	it('declares Albrecht’s Laboratories as a Free Roam node on Deimos', () => {
		const n = OPEN_WORLD_SOLNODES.CuratedAlbrechtLabs;
		expect(n.type).toBe('Free Roam');
		expect(n.value).toMatch(/\(Deimos\)$/);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run scripts/data/openworld.test.ts`
Expected: FAIL — module `./openworld` does not exist.

- [ ] **Step 3: Create the curated module**

Create `scripts/data/openworld.ts`:

```ts
import type { OpenWorldFarm } from '../../src/lib/model/types';
import type { SolNodes } from './build';

// Qorvex's components drop at Deimos' Albrecht's Laboratories (Sanctum
// Anatomica / Cavia) bounties, which have no star-chart SolNode. Injected as a
// curated pseudo-node (same pattern as curated.ts's Eris key-boss nodes) so
// buildNodes/buildRegions place it on Deimos as a Free Roam zone.
export const OPEN_WORLD_SOLNODES: SolNodes = {
	CuratedAlbrechtLabs: {
		value: "Albrecht's Laboratories (Deimos)",
		enemy: 'Infested',
		type: 'Free Roam',
	},
};

// Curated frame → open-world zone table. The three real Free Roam zones reuse
// their existing SolNode ids (Plains of Eidolon = SolNode228 / Earth, Orb Vallis
// = SolNode129 / Venus, Cambion Drift = SolNode229 / Deimos). Parts, images, and
// drop chances are pulled from @wfcd/items by buildOpenWorldFrames; only the
// zone placement and the source/blueprint labels are curated here. bpSource
// values verified against the Warframe wiki (see the design spec).
export const OPEN_WORLD_FARMS: OpenWorldFarm[] = [
	{
		frameId: 'gara',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Cetus Bounty',
		bpSource: "Complete Saya's Vigil",
	},
	{
		frameId: 'revenant',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Cetus Bounty',
		bpSource: 'Complete Mask of the Revenant',
	},
	{
		frameId: 'caliban',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Narmer Bounty',
		bpSource: 'Market (50,000cr)',
	},
	{
		frameId: 'garuda',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Orb Vallis Bounty',
		bpSource: 'Complete Vox Solaris',
	},
	{
		frameId: 'hildryn',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Exploiter Orb',
		bpSource: 'Little Duck (Vox Solaris standing)',
	},
	{
		frameId: 'caliban',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Narmer Bounty',
		bpSource: 'Market (50,000cr)',
	},
	{
		frameId: 'xaku',
		nodeId: 'SolNode229',
		regionId: 'deimos',
		componentSource: 'Cambion Drift Bounty',
		bpSource: 'Complete Heart of Deimos',
	},
	{
		frameId: 'qorvex',
		nodeId: 'CuratedAlbrechtLabs',
		regionId: 'deimos',
		componentSource: "Albrecht's Laboratories Bounty",
		bpSource: 'Complete Whispers in the Walls',
	},
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/openworld.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/openworld.ts scripts/data/openworld.test.ts
git commit -m "feat(data): curated open-world zone/frame table"
```

---

### Task 5: Assemble integration + validation

**Files:**

- Modify: `scripts/data/assemble.ts`
- Test: `scripts/data/assemble.test.ts`

**Interfaces:**

- Consumes: `buildOpenWorldFrames` (Task 3), `OPEN_WORLD_SOLNODES`/`OPEN_WORLD_FARMS` (Task 4).
- Produces: `assembleDataset(...)` result now includes open-world frames in `warframes`, the Albrecht's Laboratories node on Deimos, and a populated `openWorldFarms`; `validateDataset` reports dangling `openWorldFarms` refs.

- [ ] **Step 1: Write the failing tests**

In `scripts/data/assemble.test.ts`:

1. Add three Free Roam zone nodes to the inline `solNodes` object (so the real farm nodeIds resolve):

```ts
	SolNode228: { value: 'Plains of Eidolon (Earth)', enemy: 'Grineer', type: 'Free Roam' },
	SolNode129: { value: 'Orb Vallis (Venus)', enemy: 'Corpus', type: 'Free Roam' },
	SolNode229: { value: 'Cambion Drift (Deimos)', enemy: 'Infested', type: 'Free Roam' },
```

2. Add a helper + open-world warframes and fold them into the shared `ds`. Replace the line `const ds = assembleDataset(solNodes, warframes, rawResources);` inside `describe('assembleDataset', ...)` with:

```ts
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
const owWarframes = ['Gara', 'Revenant', 'Garuda', 'Hildryn', 'Xaku', 'Qorvex', 'Caliban'].map(ow);
const ds = assembleDataset(solNodes, [...warframes, ...owWarframes], rawResources);
```

3. Add assertions inside the same `describe`:

```ts
it('attaches the 8 open-world farms and builds their frames', () => {
	expect(ds.openWorldFarms).toHaveLength(8);
	for (const id of ['gara', 'xaku', 'caliban', 'qorvex']) {
		expect(ds.warframes.some((f) => f.id === id)).toBe(true);
	}
});
it('injects Albrecht’s Laboratories as a Free Roam node on Deimos', () => {
	const n = ds.nodes.find((x) => x.id === 'CuratedAlbrechtLabs')!;
	expect(n).toMatchObject({ regionId: 'deimos', missionType: 'Free Roam', isAssassination: false });
});
it('detects a dangling open-world farm frame', () => {
	const broken = structuredClone(ds);
	broken.openWorldFarms[0].frameId = 'ghostframe';
	expect(validateDataset(broken).join(' ')).toMatch(/ghostframe/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run scripts/data/assemble.test.ts`
Expected: FAIL — `openWorldFarms` undefined / dangling-farm not detected / Albrecht node missing.

- [ ] **Step 3: Wire assemble.ts**

In `scripts/data/assemble.ts`:

Add imports:

```ts
import {
	buildRegions,
	buildNodes,
	buildFrames,
	buildOpenWorldFrames,
	type SolNodes,
	type RawWarframe,
} from './build';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS } from './openworld';
```

(Extend the existing `./build` import to add `buildOpenWorldFrames`; add the new `./openworld` import line.)

In `assembleDataset`, change the solNodes merge and the return. Replace:

```ts
const allSolNodes = { ...solNodes, ...KEY_BOSS_SOLNODES };
```

with:

```ts
const allSolNodes = { ...solNodes, ...KEY_BOSS_SOLNODES, ...OPEN_WORLD_SOLNODES };
```

Before the `return`, build the open-world frames:

```ts
const openWorldFrames = buildOpenWorldFrames(warframes, OPEN_WORLD_FARMS);
```

Replace the return with:

```ts
return {
	regions,
	nodes,
	bosses,
	warframes: [...frames, ...openWorldFrames],
	resources,
	quests: QUESTS,
	openWorldFarms: OPEN_WORLD_FARMS,
};
```

In `validateDataset`, after the quest checks (before `return problems;`), add:

```ts
for (const f of ds.openWorldFarms) {
	if (!frameIds.has(f.frameId)) problems.push(`open-world farm → missing frame ${f.frameId}`);
	if (!nodeIds.has(f.nodeId)) problems.push(`open-world farm → missing node ${f.nodeId}`);
	if (!regionIds.has(f.regionId)) problems.push(`open-world farm → missing region ${f.regionId}`);
}
```

(`frameIds`, `nodeIds`, `regionIds` are already declared at the top of `validateDataset`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/assemble.test.ts`
Expected: PASS (new cases plus all pre-existing ones — `passes integrity validation` must still return `[]`).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/assemble.ts scripts/data/assemble.test.ts
git commit -m "feat(data): assemble open-world frames + farms, validate refs"
```

---

### Task 6: Pipeline sanity checks + regenerate dataset

**Files:**

- Modify: `scripts/build-data.ts`
- Regenerate: `static/data/dataset.json`

**Interfaces:**

- Consumes: the full pipeline (Tasks 1–5). No new exported symbols.

- [ ] **Step 1: Add sanity floors**

In `scripts/build-data.ts`, after the resources floor block (`if (data.resources.length < 27) { … }`) and before `mkdirSync(...)`, add:

```ts
// Open-world frames floor: the 7 curated bounty frames must be built and all
// 8 farms attached (Gara/Revenant/Caliban on Plains, Garuda/Hildryn/Caliban
// on Orb Vallis, Xaku on Cambion Drift, Qorvex on Albrecht's Laboratories).
if (data.openWorldFarms.length < 8) {
	console.error(
		`Sanity check failed (expected >=8 open-world farms, got ${data.openWorldFarms.length})`,
	);
	process.exit(1);
}
for (const id of ['gara', 'xaku', 'caliban', 'qorvex']) {
	if (!data.warframes.some((f) => f.id === id)) {
		console.error(`Sanity check failed: open-world frame ${id} not built`);
		process.exit(1);
	}
}
```

- [ ] **Step 2: Regenerate the dataset**

Run: `pnpm data:build`
Expected: prints `Regions: …, nodes: …, node-linked frames: …` (frame count up by 7 vs before), no `Sanity check failed`, ends with `Wrote static/data/dataset.json`.

- [ ] **Step 3: Spot-check the output**

Run:

```bash
node -e "const d=require('./static/data/dataset.json').data; console.log('farms', d.openWorldFarms.length); const x=d.warframes.find(f=>f.id==='xaku'); console.log('xaku', x && x.parts.map(p=>[p.slot,p.bountyTier,p.rotation,p.chance&&Math.round(p.chance)])); console.log('caliban regions', d.openWorldFarms.filter(f=>f.frameId==='caliban').map(f=>f.regionId));"
```

Expected: `farms 8`; Xaku shows `chassis/neuroptics/systems` with tiers/rotations/chances (bp all undefined); `caliban regions [ 'earth', 'venus' ]`.

- [ ] **Step 4: Run the full unit suite + type-check**

Run: `pnpm test:unit --run && pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data.ts static/data/dataset.json
git commit -m "chore(data): rebuild dataset with open-world frames"
```

---

### Task 7: RegionPanel renders open-world zones

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: `dataset.openWorldFarms` (may be `undefined` in hand-built fixtures — guard with `?? []`), `WarframePart.bountyTier`/`rotation`/`chance`, existing `tracker` API (`frameCount`, `isOwned`, `togglePart`, `toggleFrame`).
- Produces: open-world zones grouped by node and rendered below assassination blocks; each component part row shows `{componentSource} · {tier} · Rot {rotation} · ~{chance}%` (Exploiter Orb rows omit tier/rotation); bp row shows `{bpSource}`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/panel/RegionPanel.svelte.test.ts` (after the existing fixtures, before or inside the `describe('RegionPanel', …)` block add a fixture and tests):

```ts
// Open-world fixture: Caliban farmed on BOTH earth (Plains) and venus (Orb
// Vallis), plus Hildryn on venus via Exploiter Orb (no bounty tier/rotation).
const openWorld: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['plains'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'venus',
			name: 'Venus',
			kind: 'planet',
			progressionOrder: 2,
			factions: ['Corpus'],
			nodeIds: ['vallis'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
		{
			id: 'vallis',
			regionId: 'venus',
			name: 'Orb Vallis',
			missionType: 'Free Roam',
			faction: 'Corpus',
			isAssassination: false,
		},
	],
	bosses: [],
	warframes: [
		{
			id: 'caliban',
			name: 'Caliban',
			nodeId: 'plains',
			parts: [
				{ id: 'caliban:bp', frameId: 'caliban', slot: 'bp' },
				{
					id: 'caliban:chassis',
					frameId: 'caliban',
					slot: 'chassis',
					dropSourceNodeId: 'plains',
					chance: 21.1,
					bountyTier: 'L50–70',
					rotation: 'B',
				},
			],
		},
		{
			id: 'hildryn',
			name: 'Hildryn',
			nodeId: 'vallis',
			parts: [
				{ id: 'hildryn:bp', frameId: 'hildryn', slot: 'bp' },
				{
					id: 'hildryn:chassis',
					frameId: 'hildryn',
					slot: 'chassis',
					dropSourceNodeId: 'vallis',
					chance: 38.72,
				},
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'caliban',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
		{
			frameId: 'caliban',
			nodeId: 'vallis',
			regionId: 'venus',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
		{
			frameId: 'hildryn',
			nodeId: 'vallis',
			regionId: 'venus',
			componentSource: 'Exploiter Orb',
			bpSource: 'Little Duck (Vox Solaris standing)',
		},
	],
};

describe('RegionPanel — open world', () => {
	it('renders a Free Roam zone with its frame and a stage-labelled part row', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		expect(screen.getByText('Plains of Eidolon')).toBeInTheDocument();
		expect(screen.getByText(/Grineer · Free Roam/)).toBeInTheDocument();
		expect(document.querySelector('[data-part="caliban:chassis"]')).toBeInTheDocument();
		expect(screen.getByText(/Narmer Bounty · L50–70 · Rot B · ~21%/)).toBeInTheDocument();
	});

	it('shows Caliban under BOTH earth and venus', () => {
		const t1 = createTracker(openWorld.warframes);
		const { unmount } = render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker: t1 });
		expect(screen.getByText('Caliban')).toBeInTheDocument();
		unmount();
		const t2 = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'venus', tracker: t2 });
		expect(screen.getByText('Caliban')).toBeInTheDocument();
	});

	it('omits tier/rotation for a non-bounty (Exploiter Orb) source', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'venus', tracker });
		const row = document.querySelector('[data-part="hildryn:chassis"]') as HTMLElement;
		expect(row.textContent).toMatch(/Exploiter Orb · ~39%/);
		expect(row.textContent).not.toMatch(/Rot /);
	});

	it('toggles an open-world part on click', async () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		const row = document.querySelector('[data-part="caliban:chassis"]') as HTMLElement;
		await row.click();
		expect(tracker.isOwned('caliban:chassis')).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts -t "open world"`
Expected: FAIL — open-world content not rendered.

- [ ] **Step 3: Implement the component changes**

Edit `src/lib/panel/RegionPanel.svelte`. (Use the `svelte:svelte-file-editor` agent / svelte MCP tools per project convention.)

3a. Extend the `<script>` imports and derivations. Add `OpenWorldFarm` and `WarframePart` to the type import:

```ts
import type {
	Boss,
	Dataset,
	OpenWorldFarm,
	StarNode,
	Warframe,
	WarframePart,
} from '$lib/model/types';
```

Add, after the existing `entries` derivation:

```ts
// Open-world zones for this region: group the region's farms by zone node,
// joined to the node + frame. Guarded for hand-built fixtures without farms.
type OWEntry = { frame: Warframe; farm: OpenWorldFarm };
type OWZone = { node: StarNode; entries: OWEntry[] };
let openWorldZones = $derived.by<OWZone[]>(() => {
	const farms = (dataset.openWorldFarms ?? []).filter((f) => f.regionId === regionId);
	const byNode = new Map<string, OWZone>();
	for (const farm of farms) {
		const node = dataset.nodes.find((n) => n.id === farm.nodeId);
		const frame = dataset.warframes.find((w) => w.id === farm.frameId);
		if (!node || !frame) continue;
		const zone = byNode.get(node.id) ?? { node, entries: [] };
		zone.entries.push({ frame, farm });
		byNode.set(node.id, zone);
	}
	return [...byNode.values()];
});

// Source label for an open-world part row: bp shows its bpSource; components
// show "{source} · {tier} · Rot {rotation} · ~{chance}%", omitting the tier /
// rotation for non-bounty sources (Exploiter Orb) that carry neither.
function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
	if (part.slot === 'bp') return farm.bpSource;
	const rot =
		part.rotation === 'any' ? 'any rot' : part.rotation ? `Rot ${part.rotation}` : undefined;
	const chance = part.chance != null ? `~${Math.round(part.chance)}%` : undefined;
	return [farm.componentSource, part.bountyTier, rot, chance].filter(Boolean).join(' · ');
}
```

3b. Extract a shared `frameCard` snippet. Inside the assassination `{#each entries …}` block, the existing markup renders: the frame avatar + name + owned count, the "Blueprint from Market · components from {boss}" sub-line, the dual-aspect note, the part-rows list, and the "Toggle whole frame" button. Wrap that reusable part in a snippet defined in the template (Svelte 5 `{#snippet}`), parameterised by the sub-line text and a per-part source function:

```svelte
{#snippet frameCard(frame: Warframe, subLine: string, sourceText: (part: WarframePart) => string)}
	{@const count = tracker.frameCount(frame.id)}
	<div class="mb-4 flex items-center gap-3">
		<div
			class="flex h-11 w-11 items-center justify-center rounded-lg border border-wf-edge bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
			aria-hidden="true"
		>
			{frame.name[0]}
		</div>
		<div>
			<div class="font-semibold text-slate-100">
				{frame.name}
				<span class="text-xs font-normal {count.owned === count.total ? 'text-emerald-400' : 'text-wf-muted'}">
					· {count.owned}/{count.total} owned
				</span>
			</div>
			<div class="text-xs text-wf-muted">{subLine}</div>
		</div>
	</div>

	{#if frame.parts.some((p) => p.slot === 'dayaspect' || p.slot === 'nightaspect')}
		<p class="mb-2 text-xs text-wf-muted">Assembled from its Day and Night aspects.</p>
	{/if}

	<div class="space-y-1">
		{#each frame.parts as part (part.id)}
			{@const owned = tracker.isOwned(part.id)}
			<div
				data-part={part.id}
				data-owned={owned}
				role="button"
				tabindex="0"
				class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {owned ? 'border-emerald-500/30 bg-emerald-500/10' : ''}"
				onclick={() => tracker.togglePart(part.id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						if (e.key === ' ') e.preventDefault();
						tracker.togglePart(part.id);
					}
				}}
			>
				<span class="flex h-4 w-4 items-center justify-center rounded border text-[11px] {owned ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-wf-edge text-transparent'}">✓</span>
				<span class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}">
					{#if SLOT_ICON[part.slot]}<span aria-hidden="true" class="mr-1 text-wf-gold">{SLOT_ICON[part.slot]}</span>{/if}{SLOT_LABEL[part.slot]}
				</span>
				<span class="ml-auto text-xs text-wf-muted">{sourceText(part)}</span>
			</div>
		{/each}
	</div>

	<button class="mt-3 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80" onclick={() => tracker.toggleFrame(frame.id)}>
		✓ Toggle whole frame
	</button>
{/snippet}
```

Then, in the assassination `{#each entries as { node, boss, frame } (node.id)}` block, replace the avatar/parts/toggle markup (everything from the `<div class="mb-4 flex items-center gap-3">` avatar block through the "Toggle whole frame" `</button>`) with:

```svelte
					{@render frameCard(frame, `Blueprint from Market · components from ${boss.name}`, (part) => sourceLabel(part.slot, boss.name))}
```

(Keep the surrounding node header — `<h3>{node.name}</h3>`, the "Boss: … drops Warframe components" line, and the faction/Assassination tag — unchanged.)

Also delete the now-unused `{@const count = tracker.frameCount(frame.id)}` line at the top of the assassination `{#each entries …}` block — the count now lives inside `frameCard`. Leaving it triggers an unused-const warning from `svelte-check`.

3c. Change the empty-state guard and add the open-world section. Change the frames-section opening condition from:

```svelte
		{#if entries.length > 0}
```

to:

```svelte
		{#if entries.length > 0 || openWorldZones.length > 0}
```

Immediately after the assassination `{#each entries …}{/each}` loop (still inside the same `<div class="space-y-6">`), add the open-world zones:

```svelte
				{#each openWorldZones as zone (zone.node.id)}
					<div>
						<div class="mb-4 flex items-start justify-between gap-3">
							<h3 class="text-base font-semibold text-slate-100">{zone.node.name}</h3>
							<span class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[zone.node.faction] ?? 'border-wf-edge text-wf-muted'}">
								{zone.node.faction} · Free Roam
							</span>
						</div>
						<div class="space-y-6">
							{#each zone.entries as { frame, farm } (frame.id)}
								{@render frameCard(frame, `Blueprint: ${farm.bpSource}`, (part) => owSourceText(part, farm))}
							{/each}
						</div>
					</div>
				{/each}
```

The existing `{:else}` empty-state (`no Assassination frame here yet.`) stays — it now shows only when a region has neither assassination nor open-world frames.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: PASS — the new open-world cases and all pre-existing assassination/resource cases (the `frameCard` extraction must not change assassination output: Rhino, Equinox glyphs, key hint, toggle).

- [ ] **Step 5: Format, lint, type-check**

Run: `pnpm format && pnpm lint && pnpm check`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(ui): render open-world frames with bounty stage in RegionPanel"
```

---

### Task 8: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite + type-check + lint + format check**

Run: `pnpm test:unit --run && pnpm check && pnpm lint && pnpm format:check`
Expected: all PASS/clean.

- [ ] **Step 2: Drive the app (verification-before-completion)**

Run: `pnpm dev` and open the app; select **Earth** → confirm Gara/Revenant/Caliban appear under a "Plains of Eidolon — … Free Roam" zone with stage-labelled rows; select **Venus** → Garuda/Hildryn/Caliban (Hildryn via Exploiter Orb, no tier); toggling a part persists. (Or drive via Playwright MCP.)

- [ ] **Step 3: Commit any fixups**

```bash
git add -A && git commit -m "chore: open-world frames verification fixups" || echo "nothing to fix"
```

---

## Self-Review

**Spec coverage:**

- Frames covered (7, Caliban twice) → Tasks 4 (farms), 3 (build), 6 (regenerate). ✓
- `OpenWorldFarm` + part `bountyTier`/`rotation` + `Dataset.openWorldFarms` → Task 1. ✓
- Curated zones incl. Albrecht's Laboratories pseudo-node → Task 4; injected on Deimos → Task 5. ✓
- `buildOpenWorldFrames` pulls parts/image from WFCD, best chance per part → Task 3; `bestBountyStage` rule → Task 2. ✓
- Best-stage tier/rotation, "any"/partial collapse, tie→lowest tier, Plague Star excluded, Exploiter Orb non-bounty → Task 2 tests. ✓
- Assemble merge + validation → Task 5; sanity floors → Task 6. ✓
- UI inside frames section, `{#snippet}` reuse, source+tier+rotation+chance, Exploiter Orb degrades, Caliban in both regions, empty-state guard, `?? []` fixture guard → Task 7. ✓
- No quest gating; bpSource note only → Task 7 (`Blueprint: {bpSource}`), no reveal wiring. ✓
- Palette inclusion via `Warframe.nodeId` = primary node → Task 3. ✓
- Regenerate dataset.json → Task 6. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has expected output. ✓

**Type consistency:** `BountyStage`/`bestBountyStage` (Task 2) consumed unchanged in Task 3; `OpenWorldFarm` shape identical across Tasks 1/3/4/5/7; `buildOpenWorldFrames` signature identical in Tasks 3/5; `owSourceText`/`openWorldZones`/`frameCard` names consistent within Task 7; tracker API (`frameCount`/`isOwned`/`togglePart`/`toggleFrame`) matches existing usage. ✓
