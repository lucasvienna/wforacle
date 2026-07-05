# wforacle Data Pipeline (Plan 2 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-planet hand-authored seed with a full, real dataset generated from WFCD (all 14 planets, every Assassination node/boss/frame with real drop %), fetched at runtime through a service worker, and kept fresh automatically by CI.

**Architecture:** A Node/TS build script sources `@wfcd/items` (frames, with per-component drop location + %) and `@wfcd/warframe-worldstate-data` (`solNodes.json` — the node list), parses the agreed `"Planet/Node (Type)"` / `"Node (Planet)"` strings to join them (no fuzzy matching), merges two tiny curated maps (boss names, planet order — not present in WFCD), validates referential integrity, and emits `static/data/dataset.json` conforming to the existing `Dataset` type. The app fetches that JSON client-side through a service worker (cache-first + stale-while-revalidate + offline). A scheduled GitHub Action regenerates and auto-deploys on WFCD changes.

**Tech Stack:** TypeScript, `tsx` (run TS scripts), `@wfcd/items`, `@wfcd/warframe-worldstate-data`, Vitest, SvelteKit service worker, GitHub Actions, Renovate.

## Global Constraints

- **Conform to the existing `Dataset` type** (`src/lib/model/types.ts`) — the generated JSON must satisfy `Dataset` so `StarChart`, `RegionPanel`, and the tracker work unchanged. `WarframePart.id` stays `` `${frameId}:${slot}` ``, slot ∈ `bp | neuroptics | chassis | systems`.
- **The join is a string parse, not fuzzy matching.** `solNodes` value is `"Fossa (Venus)"`; item drop location is `"Venus/Fossa (Assassination)"`. Match on `(planet, nodeName)`.
- **Machine data only** — Plan 2 generates nodes/bosses/frames. Resources, curated farming recommendations, and mdsvex guides are **Plan 3** (do not build them here). Boss _names_ and planet _order_ are the only curated inputs (small, factual).
- **Runtime data, not bundled** — the app fetches `/data/dataset.json` client-side (through the SW); it is NOT imported at build. Keep `src/lib/data/seed.ts` as the small test fixture Plan 1 tests already use.
- **Pipeline tests run on committed fixtures, never live network.** Only the real generation run (Task 7) hits WFCD.
- Package manager `pnpm`; tests `pnpm test:unit --run`. TDD; commit per green task. `pnpm lint`/`pnpm format` stay clean.

---

### Task 1: Pipeline scaffold, deps, fixtures

**Files:**

- Modify: `package.json` (deps + `data:build` script)
- Create: `scripts/data/fixtures/solNodes.sample.json`
- Create: `scripts/data/fixtures/warframes.sample.json`
- Create: `scripts/data/README.md`

**Interfaces:**

- Produces: committed sample fixtures used by all pipeline tests, and a `pnpm data:build` script entry (implemented in Task 7).

- [ ] **Step 1: Add dependencies**

```bash
pnpm add -D @wfcd/items @wfcd/warframe-worldstate-data tsx
```

- [ ] **Step 2: Add the build script placeholder to package.json**

Add to `scripts`:

```json
"data:build": "tsx scripts/build-data.ts"
```

- [ ] **Step 3: Create the solNodes fixture**

`scripts/data/fixtures/solNodes.sample.json` (real-shaped subset — Fossa is Assassination, Cytherean is not, Oro is Earth Assassination):

```json
{
	"SolNode104": { "value": "Fossa (Venus)", "enemy": "Corpus", "type": "Assassination" },
	"SolNode30": { "value": "Cytherean (Venus)", "enemy": "Corpus", "type": "Interception" },
	"SolNode14": { "value": "Oro (Earth)", "enemy": "Grineer", "type": "Assassination" },
	"SolNode0": { "value": "SolNode0", "enemy": "Sentient", "type": "Ancient Retribution" }
}
```

- [ ] **Step 4: Create the warframes fixture**

`scripts/data/fixtures/warframes.sample.json` (real-shaped subset — Rhino from Fossa, Excalibur from War (not in solNodes fixture, to test the unmatched path), plus a non-frame component "Neurodes" that must be ignored):

```json
[
	{
		"name": "Rhino",
		"uniqueName": "/Lotus/Powersuits/Rhino/Rhino",
		"type": "Warframe",
		"imageName": "rhino.png",
		"components": [
			{ "name": "Blueprint", "drops": [] },
			{ "name": "Neurodes", "drops": [] },
			{
				"name": "Chassis",
				"drops": [
					{ "location": "Venus/Fossa (Assassination)", "rarity": "Common", "chance": 38.72 }
				]
			},
			{
				"name": "Neuroptics",
				"drops": [
					{ "location": "Venus/Fossa (Assassination)", "rarity": "Common", "chance": 38.72 }
				]
			},
			{
				"name": "Systems",
				"drops": [
					{ "location": "Venus/Fossa (Assassination)", "rarity": "Uncommon", "chance": 22.56 }
				]
			}
		]
	},
	{
		"name": "Mesa",
		"uniqueName": "/Lotus/Powersuits/Mesa/Mesa",
		"type": "Warframe",
		"imageName": "mesa.png",
		"components": [
			{ "name": "Blueprint", "drops": [] },
			{
				"name": "Chassis",
				"drops": [{ "location": "Earth/Oro (Assassination)", "rarity": "Common", "chance": 12.5 }]
			},
			{
				"name": "Neuroptics",
				"drops": [{ "location": "Earth/Oro (Assassination)", "rarity": "Common", "chance": 12.5 }]
			},
			{
				"name": "Systems",
				"drops": [{ "location": "Earth/Oro (Assassination)", "rarity": "Uncommon", "chance": 7.69 }]
			}
		]
	},
	{
		"name": "Volt",
		"uniqueName": "/Lotus/Powersuits/Shock/Shock",
		"type": "Warframe",
		"imageName": "volt.png",
		"components": [{ "name": "Blueprint", "drops": [] }]
	}
]
```

(Volt has no Assassination drop → must be excluded from node-linked frames. Mesa's node "Oro" IS in the solNodes fixture → links to Earth.)

- [ ] **Step 5: Document the pipeline**

`scripts/data/README.md`: one paragraph — "Generates `static/data/dataset.json` from WFCD (`@wfcd/items`, `@wfcd/warframe-worldstate-data`). Run `pnpm data:build`. Pure logic in `parse.ts`/`build.ts` is unit-tested on `fixtures/`. Curated inputs (boss names, planet order) live in `curated.ts`."

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/data
git commit -m "chore: data-pipeline scaffold, deps, and WFCD fixtures"
```

---

### Task 2: Location-string parser

**Files:**

- Create: `scripts/data/parse.ts`
- Test: `scripts/data/parse.test.ts`

**Interfaces:**

- Produces:
  - `parseNodeValue(value: string): { node: string; planet: string } | null` — parses `"Fossa (Venus)"` → `{ node: 'Fossa', planet: 'Venus' }`; returns `null` for placeholders like `"SolNode0"` (no parens).
  - `parseDropLocation(loc: string): { planet: string; node: string; type: string } | null` — parses `"Venus/Fossa (Assassination)"` → `{ planet: 'Venus', node: 'Fossa', type: 'Assassination' }`; `null` if it doesn't match the shape.
  - `slugify(s: string): string` — lowercases, trims, replaces non-alphanumerics with nothing (e.g., `slugify('Kuva Fortress')` → `'kuvafortress'`, `slugify('Fossa')` → `'fossa'`).

- [ ] **Step 1: Write the failing test**

`scripts/data/parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseNodeValue, parseDropLocation, slugify } from './parse';

describe('parse', () => {
	it('parses a solNodes value', () => {
		expect(parseNodeValue('Fossa (Venus)')).toEqual({ node: 'Fossa', planet: 'Venus' });
	});
	it('returns null for placeholder node values', () => {
		expect(parseNodeValue('SolNode0')).toBeNull();
	});
	it('parses a drop location', () => {
		expect(parseDropLocation('Venus/Fossa (Assassination)')).toEqual({
			planet: 'Venus',
			node: 'Fossa',
			type: 'Assassination',
		});
	});
	it('returns null for a non-node drop location', () => {
		expect(parseDropLocation('Cetus Bounty Rewards')).toBeNull();
	});
	it('slugifies names', () => {
		expect(slugify('Kuva Fortress')).toBe('kuvafortress');
		expect(slugify('Fossa')).toBe('fossa');
	});
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run scripts/data/parse.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`scripts/data/parse.ts`:

```ts
export function slugify(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseNodeValue(value: string): { node: string; planet: string } | null {
	const m = value.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (!m) return null;
	return { node: m[1].trim(), planet: m[2].trim() };
}

export function parseDropLocation(
	loc: string,
): { planet: string; node: string; type: string } | null {
	const m = loc.match(/^([^/]+)\/(.+?)\s*\(([^)]+)\)\s*$/);
	if (!m) return null;
	return { planet: m[1].trim(), node: m[2].trim(), type: m[3].trim() };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm vitest run scripts/data/parse.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/parse.ts scripts/data/parse.test.ts
git commit -m "feat(pipeline): location-string parsers"
```

---

### Task 3: Curated maps (boss names, planet metadata)

**Files:**

- Create: `scripts/data/curated.ts`
- Test: `scripts/data/curated.test.ts`

**Interfaces:**

- Consumes: `slugify` from Task 2.
- Produces:
  - `PLANETS: { name: string; order: number; faction: string; spoilerGated: boolean }[]` — the 14 main planets in progression order (Earth first). Kind is always `'planet'` here.
  - `BOSS_BY_NODE: Record<string, string>` — keyed by `slugify(nodeName)` → boss display name (e.g., `fossa` → `'Jackal'`, `oro` → `'Councilor Vay Hek'`). ~18 Assassination entries.
  - `planetOrder(planetName: string): number` — order for a planet name, or `999` if unknown (so unknown planets sort last, never crash).

- [ ] **Step 1: Write the failing test**

`scripts/data/curated.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PLANETS, BOSS_BY_NODE, planetOrder } from './curated';
import { slugify } from './parse';

describe('curated', () => {
	it('lists 14 planets, Earth first, distinct orders', () => {
		expect(PLANETS).toHaveLength(14);
		const byOrder = [...PLANETS].sort((a, b) => a.order - b.order);
		expect(byOrder[0].name).toBe('Earth');
		expect(new Set(PLANETS.map((p) => p.order)).size).toBe(14);
	});
	it('maps known assassination nodes to boss names', () => {
		expect(BOSS_BY_NODE[slugify('Fossa')]).toBe('Jackal');
		expect(BOSS_BY_NODE[slugify('Oro')]).toBe('Councilor Vay Hek');
	});
	it('returns 999 for an unknown planet', () => {
		expect(planetOrder('Nowhere')).toBe(999);
	});
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run scripts/data/curated.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`scripts/data/curated.ts` — fill from research (Star Chart order + Assassination table):

```ts
import { slugify } from './parse';

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
];

const PLANET_ORDER = new Map(PLANETS.map((p) => [p.name, p.order]));
export function planetOrder(planetName: string): number {
	return PLANET_ORDER.get(planetName) ?? 999;
}

// node slug → boss display name (the ~18 node-linked Assassination frames)
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
	[slugify('Magnacidium')]: 'Lephantis',
	[slugify('Cameria')]: 'Alad V',
};
```

(Fill any additional node-linked frames surfaced by the real data in Task 7; unknown nodes fall back to the node name — see Task 5.)

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm vitest run scripts/data/curated.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/curated.ts scripts/data/curated.test.ts
git commit -m "feat(pipeline): curated planet order + boss-name maps"
```

---

### Task 4: Build regions + nodes from solNodes

**Files:**

- Create: `scripts/data/build.ts`
- Test: `scripts/data/build.test.ts`

**Interfaces:**

- Consumes: `parseNodeValue`, `slugify` (Task 2); `PLANETS`, `planetOrder` (Task 3); `Region`, `StarNode` (`src/lib/model/types.ts`).
- Produces:
  - `buildRegions(solNodes: SolNodes): Region[]` — one `Region` per distinct planet that (a) appears in solNodes AND (b) is one of the 14 `PLANETS` (ignore relays/void/etc. for Plan 2). `id = slugify(name)`, `kind: 'planet'`, `progressionOrder/faction/spoilerGated` from `PLANETS`, `factions: [faction]`, `nodeIds` filled in.
  - `buildNodes(solNodes: SolNodes): StarNode[]` — one `StarNode` per parseable node whose planet is one of the 14. `id = SolNode key`, `regionId = slugify(planet)`, `name`, `missionType = type`, `faction = enemy`, `isAssassination = type === 'Assassination'`.
  - `type SolNodes = Record<string, { value: string; enemy: string; type: string }>`

- [ ] **Step 1: Write the failing test**

`scripts/data/build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRegions, buildNodes, type SolNodes } from './build';

const solNodes: SolNodes = JSON.parse(
	readFileSync(new URL('./fixtures/solNodes.sample.json', import.meta.url), 'utf8'),
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run scripts/data/build.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`scripts/data/build.ts`:

```ts
import type { Region, StarNode } from '../../src/lib/model/types';
import { parseNodeValue, slugify } from './parse';
import { PLANETS, planetOrder } from './curated';

export type SolNodes = Record<string, { value: string; enemy: string; type: string }>;

const PLANET_META = new Map(PLANETS.map((p) => [p.name, p]));

export function buildNodes(solNodes: SolNodes): StarNode[] {
	const out: StarNode[] = [];
	for (const [id, v] of Object.entries(solNodes)) {
		const parsed = parseNodeValue(v.value);
		if (!parsed || !PLANET_META.has(parsed.planet)) continue;
		out.push({
			id,
			regionId: slugify(parsed.planet),
			name: parsed.node,
			missionType: v.type,
			faction: v.enemy,
			isAssassination: v.type === 'Assassination',
		});
	}
	return out;
}

export function buildRegions(solNodes: SolNodes): Region[] {
	const nodes = buildNodes(solNodes);
	const byRegion = new Map<string, StarNode[]>();
	for (const n of nodes)
		(byRegion.get(n.regionId) ?? byRegion.set(n.regionId, []).get(n.regionId)!).push(n);
	const regions: Region[] = [];
	for (const p of PLANETS) {
		const id = slugify(p.name);
		const rn = byRegion.get(id);
		if (!rn) continue;
		regions.push({
			id,
			name: p.name,
			kind: 'planet',
			progressionOrder: p.order,
			factions: [p.faction],
			spoilerGated: p.spoilerGated,
			nodeIds: rn.map((n) => n.id),
		});
	}
	return regions.sort((a, b) => a.progressionOrder - b.progressionOrder);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm vitest run scripts/data/build.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/build.ts scripts/data/build.test.ts
git commit -m "feat(pipeline): build regions + nodes from solNodes"
```

---

### Task 5: Build frames + bosses from warframe-items

**Files:**

- Modify: `scripts/data/build.ts`
- Modify: `scripts/data/build.test.ts`

**Interfaces:**

- Consumes: `parseDropLocation`, `slugify` (Task 2); `BOSS_BY_NODE` (Task 3); `StarNode`, `Warframe`, `Boss`, `Slot`, `WarframePart` (types); `partId` (`src/lib/model/completion`).
- Produces (added to `build.ts`):
  - `type RawWarframe = { name: string; uniqueName: string; type: string; imageName?: string; components?: { name: string; drops?: { location: string; rarity?: string; chance?: number }[] }[] }`
  - `buildFrames(warframes: RawWarframe[], nodes: StarNode[]): { frames: Warframe[]; bosses: Boss[] }` — for each Warframe whose components include an Assassination-typed drop location matching a node in `nodes`, produce a `Warframe` (4 canonical parts via `partId`; the drop component's `dropSourceNodeId` + `chance` attached; Blueprint = no source) linked to that node, plus a `Boss` (`id = slugify(nodeName)`, `name` from `BOSS_BY_NODE` or the node name fallback). Frames with no Assassination drop are excluded. `frameId = slugify(warframe.name)`.
  - Extend `WarframePart` in `src/lib/model/types.ts` with an optional `chance?: number`.

- [ ] **Step 1: Extend the type**

In `src/lib/model/types.ts`, add `chance?: number` to `WarframePart`:

```ts
export interface WarframePart {
	id: string;
	frameId: string;
	slot: Slot;
	dropSourceNodeId?: string;
	chance?: number;
}
```

- [ ] **Step 2: Write the failing test**

Append to `scripts/data/build.test.ts`:

```ts
import { buildFrames, type RawWarframe } from './build';
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(new URL('./fixtures/warframes.sample.json', import.meta.url), 'utf8'),
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
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm vitest run scripts/data/build.test.ts`
Expected: FAIL (`buildFrames` not exported).

- [ ] **Step 4: Implement**

Append to `scripts/data/build.ts`:

```ts
import type { Warframe, Boss, Slot, WarframePart } from '../../src/lib/model/types';
import { partId } from '../../src/lib/model/completion';
import { parseDropLocation } from './parse';
import { BOSS_BY_NODE } from './curated';

export type RawWarframe = {
	name: string;
	uniqueName: string;
	type: string;
	imageName?: string;
	components?: { name: string; drops?: { location: string; rarity?: string; chance?: number }[] }[];
};

const SLOT_BY_COMPONENT: Record<string, Slot> = {
	Blueprint: 'bp',
	Neuroptics: 'neuroptics',
	Chassis: 'chassis',
	Systems: 'systems',
};

export function buildFrames(
	warframes: RawWarframe[],
	nodes: StarNode[],
): { frames: Warframe[]; bosses: Boss[] } {
	const nodeByKey = new Map(nodes.map((n) => [`${n.regionId}:${slugify(n.name)}`, n]));
	const frames: Warframe[] = [];
	const bossByNode = new Map<string, Boss>();

	for (const wf of warframes) {
		if (wf.type !== 'Warframe' || !wf.components) continue;
		// find the assassination node this frame links to (from any component's drops)
		let node: StarNode | undefined;
		const chanceBySlot = new Map<Slot, number>();
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (!slot) continue;
			for (const d of c.drops ?? []) {
				const loc = parseDropLocation(d.location);
				if (!loc || loc.type !== 'Assassination') continue;
				const key = `${slugify(loc.planet)}:${slugify(loc.node)}`;
				const n = nodeByKey.get(key);
				if (!n) continue;
				node = n;
				if (d.chance != null) chanceBySlot.set(slot, d.chance);
			}
		}
		if (!node) continue;

		const frameId = slugify(wf.name);
		const parts: WarframePart[] = (['bp', 'neuroptics', 'chassis', 'systems'] as Slot[]).map(
			(slot) => ({
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: slot === 'bp' ? undefined : node!.id,
				chance: chanceBySlot.get(slot),
			}),
		);
		frames.push({ id: frameId, name: wf.name, nodeId: node.id, image: wf.imageName, parts });

		if (!bossByNode.has(node.id)) {
			bossByNode.set(node.id, {
				id: slugify(node.name),
				name: BOSS_BY_NODE[slugify(node.name)] ?? node.name,
				nodeId: node.id,
				faction: node.faction,
			});
		}
	}
	return { frames, bosses: [...bossByNode.values()] };
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm vitest run scripts/data/build.test.ts`
Expected: all passing (Task 4 tests + 3 new).

- [ ] **Step 6: Commit**

```bash
git add scripts/data/build.ts scripts/data/build.test.ts src/lib/model/types.ts
git commit -m "feat(pipeline): build node-linked frames + bosses with drop chances"
```

---

### Task 6: Assemble + validate the Dataset

**Files:**

- Create: `scripts/data/assemble.ts`
- Test: `scripts/data/assemble.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 4–5; `Dataset` (types).
- Produces:
  - `assembleDataset(solNodes: SolNodes, warframes: RawWarframe[]): Dataset` — wires regions/nodes/bosses/frames; back-fills each Assassination node's `bossId`/`frameId`.
  - `validateDataset(ds: Dataset): string[]` — returns a list of integrity problems (empty = valid): every `node.bossId`/`frameId` resolves; every `frame.nodeId` resolves; every part id is `frame:slot`; no duplicate ids. Throwing is the caller's choice.

- [ ] **Step 1: Write the failing test**

`scripts/data/assemble.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { assembleDataset, validateDataset } from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';

const solNodes: SolNodes = JSON.parse(
	readFileSync(new URL('./fixtures/solNodes.sample.json', import.meta.url), 'utf8'),
);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(new URL('./fixtures/warframes.sample.json', import.meta.url), 'utf8'),
);

describe('assembleDataset', () => {
	const ds = assembleDataset(solNodes, warframes);
	it('back-fills bossId/frameId on the assassination node', () => {
		const fossa = ds.nodes.find((n) => n.id === 'SolNode104')!;
		expect(fossa.bossId).toBe('fossa');
		expect(fossa.frameId).toBe('rhino');
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run scripts/data/assemble.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`scripts/data/assemble.ts`:

```ts
import type { Dataset } from '../../src/lib/model/types';
import { buildRegions, buildNodes, buildFrames, type SolNodes, type RawWarframe } from './build';

export function assembleDataset(solNodes: SolNodes, warframes: RawWarframe[]): Dataset {
	const regions = buildRegions(solNodes);
	const nodes = buildNodes(solNodes);
	const { frames, bosses } = buildFrames(warframes, nodes);
	const bossByNode = new Map(bosses.map((b) => [b.nodeId, b]));
	const frameByNode = new Map(frames.map((f) => [f.nodeId!, f]));
	for (const n of nodes) {
		if (!n.isAssassination) continue;
		n.bossId = bossByNode.get(n.id)?.id;
		n.frameId = frameByNode.get(n.id)?.id;
	}
	return { regions, nodes, bosses, warframes: frames };
}

export function validateDataset(ds: Dataset): string[] {
	const problems: string[] = [];
	const nodeIds = new Set(ds.nodes.map((n) => n.id));
	const bossIds = new Set(ds.bosses.map((b) => b.id));
	const frameIds = new Set(ds.warframes.map((f) => f.id));
	for (const n of ds.nodes) {
		if (n.bossId && !bossIds.has(n.bossId))
			problems.push(`node ${n.id} → missing boss ${n.bossId}`);
		if (n.frameId && !frameIds.has(n.frameId))
			problems.push(`node ${n.id} → missing frame ${n.frameId}`);
	}
	for (const f of ds.warframes) {
		if (f.nodeId && !nodeIds.has(f.nodeId))
			problems.push(`frame ${f.id} → missing node ${f.nodeId}`);
		for (const p of f.parts) if (p.id !== `${f.id}:${p.slot}`) problems.push(`bad part id ${p.id}`);
	}
	const allIds = [...ds.regions.map((r) => r.id), ...frameIds];
	if (new Set(allIds).size !== allIds.length) problems.push('duplicate region/frame ids');
	return problems;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm vitest run scripts/data/assemble.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/assemble.ts scripts/data/assemble.test.ts
git commit -m "feat(pipeline): assemble + validate Dataset"
```

---

### Task 7: Orchestrator — fetch real WFCD, generate, hand-verify, commit

**Files:**

- Create: `scripts/data/sources.ts`
- Create: `scripts/build-data.ts`
- Create: `static/data/dataset.json` (generated)

**Interfaces:**

- Consumes: `assembleDataset`, `validateDataset`; `@wfcd/items`, `@wfcd/warframe-worldstate-data`.
- Produces: `loadSources(): Promise<{ solNodes: SolNodes; warframes: RawWarframe[] }>` and a runnable `pnpm data:build` that writes `static/data/dataset.json` with a `version` (WFCD `info.json` hash or timestamp) wrapper: `{ version: string, generatedAt: string, data: Dataset }`.

- [ ] **Step 1: Implement the source loader**

`scripts/data/sources.ts`:

```ts
import type { SolNodes, RawWarframe } from './build';

export async function loadSources(): Promise<{ solNodes: SolNodes; warframes: RawWarframe[] }> {
	// @wfcd/warframe-worldstate-data ships solNodes.json; @wfcd/items ships category loaders.
	const solNodes = (
		await import('@wfcd/warframe-worldstate-data/data/solNodes.json', { with: { type: 'json' } })
	).default as SolNodes;
	const items = await import('@wfcd/items');
	const Items = (items as any).default ?? items;
	const warframes = new Items(['Warframes']).filter(
		(i: RawWarframe) => i.type === 'Warframe',
	) as RawWarframe[];
	return { solNodes, warframes };
}
```

(If the exact import path/shape differs at implementation time, adapt — the goal is `solNodes` object + `warframes` array of `RawWarframe`. Verify against the installed package's README before finalizing, and note any deviation.)

- [ ] **Step 2: Implement the orchestrator**

`scripts/build-data.ts`:

```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadSources } from './data/sources';
import { assembleDataset, validateDataset } from './data/assemble';

const OUT = 'static/data/dataset.json';

async function main() {
	const { solNodes, warframes } = await loadSources();
	const data = assembleDataset(solNodes, warframes);
	const problems = validateDataset(data);
	if (problems.length) {
		console.error('Dataset invalid:\n' + problems.join('\n'));
		process.exit(1);
	}
	const nodeFrames = data.warframes.length;
	console.log(
		`Regions: ${data.regions.length}, nodes: ${data.nodes.length}, node-linked frames: ${nodeFrames}`,
	);
	if (data.regions.length < 14 || nodeFrames < 15) {
		console.error(`Sanity check failed (expected 14 planets + ~18 frames)`);
		process.exit(1);
	}
	mkdirSync('static/data', { recursive: true });
	writeFileSync(
		OUT,
		JSON.stringify(
			{ version: new Date().toISOString(), generatedAt: new Date().toISOString(), data },
			null,
			'\t',
		),
	);
	console.log(`Wrote ${OUT}`);
}
main();
```

- [ ] **Step 3: Run the real generation**

Run: `pnpm data:build`
Expected: prints `Regions: 14, nodes: ~250, node-linked frames: ~16-18`, writes `static/data/dataset.json`. If `loadSources` import paths are wrong, fix per the package README until it runs.

- [ ] **Step 4: Hand-verify the node-frame slice**

Run: `node -e "const d=require('./static/data/dataset.json').data; console.log(d.warframes.map(f=>f.name+' <- '+d.nodes.find(n=>n.id===f.nodeId).name).sort().join('\n'))"`
Expected: the ~18 node-linked frames map to sane nodes (Rhino←Fossa, Ember←Tethys, Excalibur←War, …). Add any missing boss names to `BOSS_BY_NODE` (Task 3) and re-run `pnpm data:build`. Spot-check 3 drop chances against `api.warframestat.us`.

- [ ] **Step 5: Commit generated data + scripts**

```bash
git add scripts/data/sources.ts scripts/build-data.ts static/data/dataset.json scripts/data/curated.ts
git commit -m "feat(pipeline): generate real dataset from WFCD (14 planets, node frames)"
```

---

### Task 8: App loads the dataset at runtime

**Files:**

- Create: `src/lib/data/dataset.ts`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/page.svelte.test.ts`

**Interfaces:**

- Consumes: `Dataset` (types); `createTracker`, `loadOwned`, `saveOwned` (Plan 1); `base` from `$app/paths`.
- Produces: `loadDataset(fetchFn?: typeof fetch): Promise<Dataset>` — fetches `${base}/data/dataset.json`, returns `.data`. The page renders a loading state until it resolves, then builds the tracker from the loaded frames.

- [ ] **Step 1: Write the failing test for the loader**

`src/lib/data/dataset.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { loadDataset } from './dataset';
import { seed } from './seed';

describe('loadDataset', () => {
	it('fetches and unwraps the dataset payload', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue({ json: () => Promise.resolve({ version: 'x', data: seed }) });
		const ds = await loadDataset(fetchFn as unknown as typeof fetch);
		expect(ds.regions[0].name).toBeTruthy();
		expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/data/dataset.json'));
	});
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run src/lib/data/dataset.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the loader**

`src/lib/data/dataset.ts`:

```ts
import { base } from '$app/paths';
import type { Dataset } from '$lib/model/types';

export async function loadDataset(fetchFn: typeof fetch = fetch): Promise<Dataset> {
	const res = await fetchFn(`${base}/data/dataset.json`);
	const payload = (await res.json()) as { version: string; data: Dataset };
	return payload.data;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm vitest run src/lib/data/dataset.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Rewire the page to load real data**

Replace `src/routes/+page.svelte`'s script + guard the markup. Key changes: import `loadDataset`; hold `data`/`tracker` in `$state`; build the tracker after load; show a skeleton until ready. Default `selectedId = 'venus'`.

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { loadDataset } from '$lib/data/dataset';
	import type { Dataset } from '$lib/model/types';
	import StarChart from '$lib/starchart/StarChart.svelte';
	import RegionPanel from '$lib/panel/RegionPanel.svelte';
	import { createTracker, type Tracker } from '$lib/tracker/tracker.svelte';
	import { loadOwned, saveOwned } from '$lib/tracker/persistence';

	let data = $state<Dataset | null>(null);
	let tracker = $state<Tracker | null>(null);
	let selectedId = $state('venus');
	let ready = false;

	onMount(async () => {
		const ds = await loadDataset();
		const t = createTracker(ds.warframes, (ids) => { if (browser && ready) saveOwned(ids); });
		t.load(await loadOwned());
		ready = true;
		data = ds;
		tracker = t;
	});

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		if (!data || !tracker) return 'none';
		const node = data.nodes.find((n) => n.regionId === regionId && n.isAssassination);
		if (!node?.frameId) return 'none';
		const c = tracker.frameCount(node.frameId);
		return c.owned === c.total && c.total > 0 ? 'done' : c.owned > 0 ? 'part' : 'none';
	}
</script>

<div class="mx-auto max-w-6xl p-6 text-slate-100">
	<header class="mb-4 flex items-center gap-4">
		<span class="text-lg font-bold">wf<span class="text-sky-400">oracle</span></span>
		{#if tracker}
			<span class="ml-auto text-sm text-slate-400">
				Node Frames <b class="text-slate-100">{tracker.total.owned} / {tracker.total.total}</b>
			</span>
		{/if}
	</header>

	{#if data && tracker}
		<div class="mb-4 overflow-hidden rounded-xl border border-slate-700">
			<StarChart regions={data.regions} {selectedId} {statusOf} onselect={(id) => (selectedId = id)} />
		</div>
		<RegionPanel dataset={data} regionId={selectedId} {tracker} />
	{:else}
		<div class="flex h-96 items-center justify-center text-slate-500">Loading Star Chart…</div>
	{/if}

	<footer class="mt-8 text-center text-xs text-slate-600">
		Planet art &amp; game data © Digital Extremes, via the Warframe wiki. Fan-made tool — not affiliated with Digital Extremes.
	</footer>
</div>
```

- [ ] **Step 6: Update the page smoke test (async data now)**

`src/routes/page.svelte.test.ts` — mock `loadDataset` with the seed and await render:

```ts
import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { seed } from '$lib/data/seed';

vi.mock('$lib/data/dataset', () => ({ loadDataset: () => Promise.resolve(seed) }));

import Page from './+page.svelte';

describe('home page', () => {
	it('renders brand immediately and chart+panel after data loads', async () => {
		render(Page);
		expect(
			screen.getByText((_, el) => el?.textContent?.trim().toLowerCase() === 'wforacle'),
		).toBeInTheDocument();
		await waitFor(() => expect(screen.getByText('VENUS')).toBeInTheDocument());
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 7: Run the full unit suite — expect PASS**

Run: `pnpm test:unit --run`
Expected: all green (component/tracker tests still use `seed` fixture; page test now mocks the loader).

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/dataset.ts src/lib/data/dataset.test.ts src/routes/+page.svelte src/routes/page.svelte.test.ts
git commit -m "feat: load real dataset at runtime with a loading state"
```

---

### Task 9: Service worker (cache-first + stale-while-revalidate + offline)

**Files:**

- Create: `src/service-worker.ts`
- Modify: `e2e/tracking.test.ts` (add an offline-reload assertion)

**Interfaces:**

- Consumes: SvelteKit's `$service-worker` module (`build`, `files`, `version`).
- Produces: a service worker that precaches the app shell + build assets, serves navigation/asset requests cache-first, and serves `/data/dataset.json` **stale-while-revalidate** (instant from cache, background-refreshes).

- [ ] **Step 1: Implement the service worker**

`src/service-worker.ts` (SvelteKit auto-registers `src/service-worker.ts`):

```ts
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `wforacle-${version}`;
const PRECACHE = [...build, ...files];
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', (e) => {
	e.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(PRECACHE))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim()),
	);
});

sw.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	// Data: stale-while-revalidate — instant from cache, refresh in background.
	if (url.pathname.endsWith('/data/dataset.json')) {
		e.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const cached = await cache.match(req);
				const network = fetch(req)
					.then((res) => {
						cache.put(req, res.clone());
						return res;
					})
					.catch(() => cached);
				return cached ?? network;
			}),
		);
		return;
	}

	// Everything else: cache-first, fall back to network (offline shell).
	e.respondWith(caches.match(req).then((cached) => cached ?? fetch(req)));
});
```

- [ ] **Step 2: Verify build includes the service worker**

Run: `pnpm build`
Expected: build succeeds; output includes a `service-worker.js`. (SvelteKit compiles `src/service-worker.ts` automatically.)

- [ ] **Step 3: Add an offline-reload e2e assertion**

Append to `e2e/tracking.test.ts` a second test that, after first load, goes offline and reloads, expecting the shell + data to still render from the SW cache:

```ts
test('works offline after first load (service worker)', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByText('VENUS')).toBeVisible(); // data cached by SW
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByText('VENUS')).toBeVisible(); // served from cache
	await context.setOffline(false);
});
```

(If the SW needs a beat to activate, the test may `await page.waitForTimeout(500)` before going offline — add only if the assertion is flaky.)

- [ ] **Step 4: Run the e2e — expect PASS**

Run: `pnpm exec playwright test`
Expected: both e2e tests pass (persistence + offline).

- [ ] **Step 5: Commit**

```bash
git add src/service-worker.ts e2e/tracking.test.ts
git commit -m "feat: service worker (cache-first + SWR data + offline shell)"
```

---

### Task 10: CI automation — scheduled refresh + Renovate

**Files:**

- Create: `.github/workflows/refresh-data.yml`
- Create: `renovate.json`

**Interfaces:**

- Produces: a scheduled + manually-dispatchable workflow that regenerates `static/data/dataset.json` and commits it if changed (Cloudflare Pages auto-deploys on push to `main`); a Renovate config that bot-bumps `@wfcd/*`.

- [ ] **Step 1: Write the refresh workflow**

`.github/workflows/refresh-data.yml`:

```yaml
name: Refresh WFCD data
on:
  schedule: [{ cron: '17 6 * * *' }] # daily 06:17 UTC
  workflow_dispatch:
permissions:
  contents: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm update @wfcd/items @wfcd/warframe-worldstate-data
      - run: pnpm data:build
      - run: pnpm test:unit --run
      - name: Commit if changed
        run: |
          if [ -n "$(git status --porcelain static/data/dataset.json pnpm-lock.yaml)" ]; then
            git config user.name "wforacle-bot"
            git config user.email "bot@users.noreply.github.com"
            git add static/data/dataset.json pnpm-lock.yaml
            git commit -m "chore(data): refresh WFCD dataset"
            git push
          else
            echo "No data changes."
          fi
```

- [ ] **Step 2: Write the Renovate config**

`renovate.json`:

```json
{
	"$schema": "https://docs.renovatebot.com/renovate-schema.json",
	"extends": ["config:recommended"],
	"packageRules": [
		{
			"matchPackagePatterns": ["^@wfcd/"],
			"groupName": "wfcd data",
			"schedule": ["at any time"],
			"automerge": false
		}
	]
}
```

- [ ] **Step 3: Validate the workflow syntax**

Run: `pnpm dlx @action-validator/cli .github/workflows/refresh-data.yml` (or `actionlint` if available).
Expected: no errors. (This validates YAML/schema; the scheduled run itself only exercises on GitHub.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/refresh-data.yml renovate.json
git commit -m "ci: scheduled WFCD data refresh + Renovate for @wfcd packages"
```

---

## Self-Review

**Spec coverage (Plan 2 slice):**

- CI-automated pipeline, join-in-CI-once → Tasks 1–7, 10. ✅
- Source npm `@wfcd/items` + `@wfcd/warframe-worldstate-data`, drops via items → Tasks 1, 7. ✅
- Normalize + join by `(planet, node)` string parse, no fuzzy match → Tasks 2, 4, 5. ✅
- Versioned static JSON asset, fetched at runtime (not bundled) → Tasks 7, 8. ✅
- Service worker cache-first + SWR + offline → Task 9. ✅
- Scheduled CI refresh + auto-deploy + Renovate → Task 10. ✅
- Conforms to `Dataset` type; app renders real data unchanged → Tasks 6, 8. ✅
- **Correctly deferred to Plan 3 (absent here):** resources, curated farming recommendations/badges, mdsvex guides. **Deferred to worldstate (Plan 4+):** edge Worker + KV. `seed.ts` retained as test fixture.

**Placeholder scan:** No TBD/TODO; every code step carries complete code. The two "adapt if the package shape differs" notes (Task 7 `loadSources`) are genuine external-API caveats with a concrete fallback contract (`solNodes` object + `RawWarframe[]`), not deferred work. ✅

**Type consistency:** `Dataset`/`Region`/`StarNode`/`Boss`/`Warframe`/`WarframePart` used exactly as in `src/lib/model/types.ts` (with the additive `chance?` in Task 5). `slugify`/`parseNodeValue`/`parseDropLocation` signatures consistent across Tasks 2/4/5. `SolNodes`/`RawWarframe` defined in Task 4/5 and reused in 6/7. `frameId = slugify(name)`, `node id = SolNode key`, `boss id = slugify(nodeName)` consistent throughout. `loadDataset` returns `Dataset` (unwrapped) in Tasks 8. ✅

**Note for executor:** the exact `@wfcd/items` / `@wfcd/warframe-worldstate-data` import surface is the one real unknown (Task 7 Step 1). Verify against the installed package READMEs before finalizing `sources.ts`; the pure build/parse/assemble logic (Tasks 2–6, fully tested on fixtures) is independent of that and won't change.
