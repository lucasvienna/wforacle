# Assassination Frame Credit + Drop-Rate Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show component drop rates (`~X%`) and Market blueprint credit amounts (`Market (35,000cr)`) on assassination frame cards, reaching parity with open-world cards, and correctly source the three non-market blueprints (Wisp, Atlas, Mesa).

**Architecture:** Capture two new blueprint facts in the data pipeline — a Market credit cost (`@wfcd/items` `bpCost`) and a blueprint's own assassination drop — onto the `bp` `WarframePart`, plus a small curated map for the two sources `@wfcd` can't supply. The `RegionPanel` render layer then formats these by a fixed precedence (drop → curated → market → bare "Market").

**Tech Stack:** SvelteKit 5 (runes), TypeScript, Vitest + @testing-library/svelte, tsx data-build script, `@wfcd/items`, oxlint/oxfmt/prettier.

## Global Constraints

- Package manager is **pnpm**. Tests: `pnpm test:unit --run`. Data build: `pnpm data:build`. Lint: `pnpm lint`. Format check: `pnpm format:check`.
- Follow existing patterns; the open-world path (`owSourceText`, `OpenWorldFarm.bpSource`) is the reference for wording/format.
- Credit format matches the open-world curated string exactly: `Market (50,000cr)` — comma thousands separator, no space, lowercase `cr`.
- Chance rounding matches `owSourceText`: `~${Math.round(chance)}%`.
- `.svelte` edits: use the Svelte MCP server tools / `svelte-file-editor` to validate the component after editing.

---

### Task 1: Data model + build pipeline (blueprint sourcing)

**Files:**

- Modify: `src/lib/model/types.ts` (`WarframePart` interface, ~lines 3-14)
- Modify: `scripts/data/curated.ts` (append new export)
- Modify: `scripts/data/build.ts` (`RawWarframe` type ~lines 77-83; `buildFrames` ~lines 165-229; new helper)
- Modify: `scripts/data/fixtures/warframes.sample.json` (Rhino entry)
- Test: `scripts/data/build.test.ts`

**Interfaces:**

- Consumes: existing `partId(frameId, slot)`, `slugify`, `resolveDropLocation`, `nodeByKey` (all already in `build.ts`).
- Produces:
  - `WarframePart.marketCost?: number` and `WarframePart.bpSource?: string`.
  - `ASSASSINATION_BP_SOURCE: Record<string, string>` in `curated.ts`.
  - `RawWarframe.bpCost?: number`.
  - `buildFrames` now emits a `bp` part carrying exactly one of: `{dropSourceNodeId, chance}` (bp-drop) | `{bpSource}` (curated) | `{marketCost}` (market) | none.

- [ ] **Step 1: Add the two model fields**

In `src/lib/model/types.ts`, add to the `WarframePart` interface (after the existing `rotation?` field):

```ts
	/** Credit cost of buying this blueprint from the Market (`@wfcd/items`
	 * `bpCost`). Set only on `bp` parts that are a Market purchase; absent for
	 * drop-sourced, curated, and open-world blueprints. */
	marketCost?: number;
	/** Curated blueprint source label overriding the default rendering, for
	 * blueprints that are neither a Market purchase nor a resolvable
	 * assassination drop (quest / key-boss frames — Atlas, Mesa). Mirrors the
	 * required `OpenWorldFarm.bpSource`. */
	bpSource?: string;
```

- [ ] **Step 2: Add the curated blueprint-source map**

In `scripts/data/curated.ts`, append at the end of the file:

```ts
// Frames whose main blueprint is neither a Market credit purchase nor a
// blueprint drop `@wfcd/items` can resolve. Wisp's blueprint IS a resolvable
// Ropalolyst drop and is handled automatically by buildFrames; only these two
// need a curated label. Keyed by frame id (slugified name).
export const ASSASSINATION_BP_SOURCE: Record<string, string> = {
	atlas: 'The Jordas Precept (quest)',
	mesa: 'Mutalist Alad V',
};
```

- [ ] **Step 3: Add `bpCost` to the `RawWarframe` type**

In `scripts/data/build.ts`, update the `RawWarframe` type (add `bpCost` after `imageName`):

```ts
export type RawWarframe = {
	name: string;
	uniqueName: string;
	type: string;
	imageName?: string;
	bpCost?: number;
	components?: { name: string; drops?: { location: string; rarity?: string; chance?: number }[] }[];
};
```

- [ ] **Step 4: Import the curated map in build.ts**

In `scripts/data/build.ts`, extend the existing import from `./curated` (currently `import { PLANETS, BOSS_BY_NODE, KEY_BOSS_DROP_LOCATIONS } from './curated';`) to include the new map:

```ts
import { PLANETS, BOSS_BY_NODE, KEY_BOSS_DROP_LOCATIONS, ASSASSINATION_BP_SOURCE } from './curated';
```

- [ ] **Step 5: Write the failing build tests**

In `scripts/data/build.test.ts`:

(a) **Replace** the existing test titled `'never attaches a chance to the bp part even if Blueprint has an Assassination drop, and the node link comes only from the component drop'` (the `it(...)` block spanning roughly lines 80-106) with:

```ts
it("captures the blueprint's own Assassination drop onto the bp part, while node-linking still comes from a component drop", () => {
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
	// bp now carries its own drop source + chance (Wisp-style Ropalolyst case)
	expect(bp.dropSourceNodeId).toBe('SolNode104');
	expect(bp.chance).toBe(50);
	expect(bp.marketCost).toBeUndefined();
	// node link still established by the component drop
	const chassis = trinity.parts.find((p) => p.slot === 'chassis')!;
	expect(chassis.dropSourceNodeId).toBe('SolNode104');
	expect(chassis.chance).toBe(25);
});
```

(b) **Add** a marketCost test inside the top-level `describe('buildFrames', ...)` block (which builds `frames` from the shared fixture at its top). Place it right after the `'links Rhino to Fossa with 4 parts and drop chances'` test:

```ts
it('sets marketCost on the bp part from the raw bpCost for a Market-purchased blueprint', () => {
	const rhino = frames.find((f) => f.id === 'rhino')!;
	const bp = rhino.parts.find((p) => p.slot === 'bp')!;
	expect(bp.marketCost).toBe(35000);
	expect(bp.dropSourceNodeId).toBeUndefined();
	expect(bp.bpSource).toBeUndefined();
});
```

(c) **Add** a curated-source test inside the existing `describe('curated Eris key-boss nodes (Mesa, Atlas)', ...)` block, right after the `'links Mesa to Mutalist Alad V and Atlas to Jordas Golem...'` test:

```ts
it('applies a curated bpSource to Mesa and Atlas blueprints (neither Market nor resolvable drop)', () => {
	const { frames } = buildFrames([mesa, atlas], keyBossNodes);
	const mesaBp = frames.find((f) => f.id === 'mesa')!.parts.find((p) => p.slot === 'bp')!;
	expect(mesaBp.bpSource).toBe('Mutalist Alad V');
	expect(mesaBp.marketCost).toBeUndefined();
	expect(mesaBp.dropSourceNodeId).toBeUndefined();
	const atlasBp = frames.find((f) => f.id === 'atlas')!.parts.find((p) => p.slot === 'bp')!;
	expect(atlasBp.bpSource).toBe('The Jordas Precept (quest)');
	expect(atlasBp.marketCost).toBeUndefined();
});
```

- [ ] **Step 6: Run the new tests to verify they fail**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: FAIL — the marketCost/bpSource/bp.chance assertions fail (fields undefined / bp has no drop), and the fixture-based marketCost test fails because Rhino has no `bpCost` yet.

- [ ] **Step 7: Add `bpCost` to the Rhino fixture**

In `scripts/data/fixtures/warframes.sample.json`, add `"bpCost": 35000` to the Rhino object (after `"imageName": "rhino.png",`):

```json
	{
		"name": "Rhino",
		"uniqueName": "/Lotus/Powersuits/Rhino/Rhino",
		"type": "Warframe",
		"imageName": "rhino.png",
		"bpCost": 35000,
		"components": [
```

(Leave Mesa without `bpCost` — it must exercise the curated path.)

- [ ] **Step 8: Rewrite the `buildFrames` blueprint logic**

In `scripts/data/build.ts`, add this helper immediately above `export function buildFrames(`:

```ts
/** Resolve a frame's blueprint `bp` part by source precedence: its own
 * Assassination drop (Wisp → Ropalolyst) → curated label (Atlas, Mesa) →
 * Market credit purchase (`bpCost`) → bare Market (no extra field). No real
 * frame has more than one source; precedence is a defensive ordering. */
function buildBpPart(
	frameId: string,
	bpDrop: { nodeId: string; chance?: number } | undefined,
	bpCost: number | undefined,
): WarframePart {
	const base = { id: partId(frameId, 'bp'), frameId, slot: 'bp' as const };
	if (bpDrop) return { ...base, dropSourceNodeId: bpDrop.nodeId, chance: bpDrop.chance };
	const bpSource = ASSASSINATION_BP_SOURCE[frameId];
	if (bpSource) return { ...base, bpSource };
	if (bpCost != null) return { ...base, marketCost: bpCost };
	return base;
}
```

Then, inside `buildFrames`, in the per-warframe loop:

Replace the node-detection block (currently declares `let node` + `chanceBySlot` and loops components skipping `bp`) with a version that also captures the blueprint's own drop:

```ts
// Find the assassination node this frame links to. Node linking comes
// ONLY from non-bp component drops (a frame's farm node is where its
// COMPONENTS drop). A blueprint's own Assassination drop (Wisp:
// Ropalolyst) is captured separately as `bpDrop` for display, and must
// never fabricate a node/frame on its own.
let node: StarNode | undefined;
const chanceBySlot = new Map<Slot, number>();
let bpDrop: { nodeId: string; chance?: number } | undefined;
for (const c of wf.components) {
	const slot = SLOT_BY_COMPONENT[c.name];
	if (!slot) continue;
	for (const d of c.drops ?? []) {
		const loc = resolveDropLocation(d.location);
		if (!loc || loc.type !== 'Assassination') continue;
		const key = `${slugify(loc.planet)}:${slugify(loc.node)}`;
		const n = nodeByKey.get(key);
		if (!n) continue;
		if (slot === 'bp') {
			bpDrop = { nodeId: n.id, chance: d.chance ?? undefined };
		} else {
			node = n;
			if (d.chance != null) chanceBySlot.set(slot, d.chance);
		}
	}
}
if (!node) continue;
```

Then replace the `parts` construction (currently maps every present slot with a ternary on `slot === 'bp'` for `dropSourceNodeId`) with:

```ts
const parts: WarframePart[] = ORDER.filter((slot) => present.has(slot)).map((slot) => {
	if (slot === 'bp') return buildBpPart(frameId, bpDrop, wf.bpCost);
	return {
		id: partId(frameId, slot),
		frameId,
		slot,
		dropSourceNodeId: node!.id,
		chance: chanceBySlot.get(slot),
	};
});
```

(The `frameId`, `present`, and `frames.push(...)` / `bossByNode` code between and after these blocks stays unchanged.)

- [ ] **Step 9: Run the build tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: PASS — all build tests green, including the rewritten Trinity, marketCost, and curated-source tests.

- [ ] **Step 10: Commit**

```bash
git add src/lib/model/types.ts scripts/data/curated.ts scripts/data/build.ts scripts/data/fixtures/warframes.sample.json scripts/data/build.test.ts
git commit -m "feat(data): source blueprint credit cost, curated + drop bp sources"
```

---

### Task 2: RegionPanel display

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte` (`sourceLabel` ~lines 42-45; usage at ~line 170)
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: `WarframePart` (already imported), `marketCost` / `bpSource` / `chance` / `dropSourceNodeId` fields from Task 1, `boss.name` from the `frames.assassination` loop.
- Produces: `assassinationSourceText(part: WarframePart, bossName: string): string`.

- [ ] **Step 1: Write the failing display tests**

In `src/lib/panel/RegionPanel.svelte.test.ts`, add this dataset and describe block at the end of the file (mirrors the existing multi-node Jupiter fixture style; each frame is unowned so its card auto-expands and renders `data-part` rows):

```ts
// Assassination source-label fixture. `regionFrames` maps exactly ONE frame
// per node (via node.frameId), so each frame needs its own Assassination node.
// Three frames exercise each blueprint source — Market credit, a bp that drops
// from the boss (Wisp/Ropalolyst-style), and a curated bpSource (Mesa-style).
const bpSourceRegion: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['oro', 'ropa', 'eris'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'oro',
			regionId: 'earth',
			name: 'Oro',
			missionType: 'Assassination',
			faction: 'Grineer',
			isAssassination: true,
			bossId: 'vayhek',
			frameId: 'rhino',
		},
		{
			id: 'ropa',
			regionId: 'earth',
			name: 'The Ropalolyst',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'ropalolyst',
			frameId: 'wisp',
		},
		{
			id: 'eris',
			regionId: 'earth',
			name: 'Mutalist Alad V',
			missionType: 'Assassination',
			faction: 'Infested',
			isAssassination: true,
			bossId: 'mutalist',
			frameId: 'mesa',
		},
	],
	bosses: [
		{ id: 'vayhek', name: 'Councilor Vay Hek', nodeId: 'oro', faction: 'Grineer' },
		{ id: 'ropalolyst', name: 'Ropalolyst', nodeId: 'ropa', faction: 'Corpus' },
		{ id: 'mutalist', name: 'Mutalist Alad V', nodeId: 'eris', faction: 'Infested' },
	],
	warframes: [
		{
			id: 'rhino',
			name: 'Rhino',
			nodeId: 'oro',
			parts: [
				{ id: 'rhino:bp', frameId: 'rhino', slot: 'bp', marketCost: 35000 },
				{
					id: 'rhino:chassis',
					frameId: 'rhino',
					slot: 'chassis',
					dropSourceNodeId: 'oro',
					chance: 38.72,
				},
			],
		},
		{
			id: 'wisp',
			name: 'Wisp',
			nodeId: 'ropa',
			parts: [
				{ id: 'wisp:bp', frameId: 'wisp', slot: 'bp', dropSourceNodeId: 'ropa', chance: 22.56 },
			],
		},
		{
			id: 'mesa',
			name: 'Mesa',
			nodeId: 'eris',
			parts: [{ id: 'mesa:bp', frameId: 'mesa', slot: 'bp', bpSource: 'Mutalist Alad V' }],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [],
};

describe('RegionPanel — assassination blueprint & drop-rate labels', () => {
	it('shows the drop rate on a component row', () => {
		render(RegionPanel, {
			dataset: bpSourceRegion,
			regionId: 'earth',
			tracker: createTracker(bpSourceRegion.warframes),
		});
		const row = document.querySelector('[data-part="rhino:chassis"]') as HTMLElement;
		expect(row.textContent).toMatch(/Councilor Vay Hek · ~39%/);
	});
	it('shows the Market credit amount on a purchased blueprint row', () => {
		render(RegionPanel, {
			dataset: bpSourceRegion,
			regionId: 'earth',
			tracker: createTracker(bpSourceRegion.warframes),
		});
		const row = document.querySelector('[data-part="rhino:bp"]') as HTMLElement;
		expect(row.textContent).toMatch(/Market \(35,000cr\)/);
	});
	it('shows the boss + drop rate on a blueprint that drops from the boss', () => {
		render(RegionPanel, {
			dataset: bpSourceRegion,
			regionId: 'earth',
			tracker: createTracker(bpSourceRegion.warframes),
		});
		const row = document.querySelector('[data-part="wisp:bp"]') as HTMLElement;
		expect(row.textContent).toMatch(/Ropalolyst · ~23%/);
	});
	it('shows a curated bpSource verbatim', () => {
		render(RegionPanel, {
			dataset: bpSourceRegion,
			regionId: 'earth',
			tracker: createTracker(bpSourceRegion.warframes),
		});
		const row = document.querySelector('[data-part="mesa:bp"]') as HTMLElement;
		expect(row.textContent).toMatch(/Mutalist Alad V/);
	});
});
```

- [ ] **Step 2: Run the display tests to verify they fail**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: FAIL — component row shows only `Councilor Vay Hek` (no `~39%`); bp rows show bare `Market` (no credit, no curated string, no boss+% for Wisp).

- [ ] **Step 3: Replace `sourceLabel` with `assassinationSourceText`**

In `src/lib/panel/RegionPanel.svelte`, replace the current helper:

```svelte
	// The main blueprint is bought from the Market; components drop from the boss.
	function sourceLabel(slot: string, bossName: string): string {
		return slot === 'bp' ? 'Market' : bossName;
	}
```

with:

```svelte
	// Assassination source label. A `bp` bought from the Market reads
	// "Market ({credits}cr)"; a curated bp (Atlas, Mesa) reads its bpSource
	// verbatim; a component drop — and a bp that itself drops from the boss
	// (Wisp/Ropalolyst) — reads "{boss} · ~{chance}%".
	function assassinationSourceText(part: WarframePart, bossName: string): string {
		if (part.slot === 'bp' && !part.dropSourceNodeId) {
			if (part.bpSource) return part.bpSource;
			if (part.marketCost != null)
				return `Market (${part.marketCost.toLocaleString('en-US')}cr)`;
			return 'Market';
		}
		const chance = part.chance != null ? `~${Math.round(part.chance)}%` : undefined;
		return [bossName, chance].filter(Boolean).join(' · ');
	}
```

- [ ] **Step 4: Update the FrameCard `sourceText` prop for assassination cards**

In the same file, change the assassination `FrameCard` usage (currently `sourceText={(part) => sourceLabel(part.slot, boss.name)}`) to:

```svelte
										sourceText={(part) => assassinationSourceText(part, boss.name)}
```

- [ ] **Step 5: Validate the component with the Svelte MCP tools**

Use the Svelte MCP server / `svelte-file-editor` autofixer on `src/lib/panel/RegionPanel.svelte` and confirm no issues are reported.

- [ ] **Step 6: Run the display tests to verify they pass**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: PASS — all four new assassination-label tests green, and the pre-existing RegionPanel tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(panel): show credit cost + drop rate on assassination frame cards"
```

---

### Task 3: Regenerate dataset + full verification

**Files:**

- Modify (generated): `static/data/dataset.json`

**Interfaces:**

- Consumes: the updated `buildFrames` / `curated.ts` / `sources.ts` (`bpCost` flows through `loadSources`'s cast at runtime).
- Produces: a rebuilt `dataset.json` where assassination `bp` parts carry `marketCost` / `bpSource` / drop fields.

- [ ] **Step 1: Regenerate the dataset**

Run: `pnpm data:build`
Expected: writes `static/data/dataset.json`; no errors.

- [ ] **Step 2: Spot-check the regenerated data**

Run:

```bash
node -e "const d=require('./static/data/dataset.json').data; const f=id=>d.warframes.find(w=>w.id===id); const bp=w=>w.parts.find(p=>p.slot==='bp'); console.log('rhino bp', JSON.stringify(bp(f('rhino')))); console.log('wisp  bp', JSON.stringify(bp(f('wisp')))); console.log('atlas bp', JSON.stringify(bp(f('atlas')))); console.log('mesa  bp', JSON.stringify(bp(f('mesa'))));"
```

Expected:

- `rhino` bp has `marketCost: 35000`, no `dropSourceNodeId`.
- `wisp` bp has `dropSourceNodeId` (Ropalolyst node) + `chance` ~22.56, no `marketCost`.
- `atlas` bp has `bpSource: "The Jordas Precept (quest)"`.
- `mesa` bp has `bpSource: "Mutalist Alad V"`.

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS — entire suite green (no regressions in import/completion/seo tests from the new part fields).

- [ ] **Step 4: Lint and format check**

Run: `pnpm lint && pnpm format:check`
Expected: no errors. If `format:check` flags the edited files, run `pnpm format` and re-check.

- [ ] **Step 5: Commit**

```bash
git add static/data/dataset.json
git commit -m "chore(data): rebuild dataset with blueprint credit + drop-rate sources"
```

---

## Notes for the implementer

- **Why bp can now carry a chance:** Task 1 Step 8 intentionally reverses the old "bp never records a drop" behavior (the reason the Task 1 Step 5a test was rewritten). The node-linking invariant is preserved because `node` is still only assigned from non-bp component drops — the separate `'does not create a frame when only the Blueprint has an Assassination drop'` test must remain green untouched.
- **Precedence in the UI mirrors the build:** `assassinationSourceText` checks `!part.dropSourceNodeId` first so a drop-sourced bp (Wisp) falls through to the boss+`%` branch rather than the Market branch.
- **Open-world untouched:** `owSourceText` and `OpenWorldFarm.bpSource` already render credit + rate; do not modify them.
