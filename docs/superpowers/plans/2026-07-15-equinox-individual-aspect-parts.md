# Equinox Individually-Trackable Aspect Blueprints — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Equinox's two aspect checkboxes into eight individually-trackable sub-blueprints (Day/Night × {Aspect Blueprint, Neuroptics, Chassis, Systems}) rendered as collapsible aspect groups with per-aspect progress.

**Architecture:** Aspect leaves become real `WarframePart`s carrying an `aspect: 'day' | 'night'` tag and aspect-scoped ids (`equinox:day:bp`). The build script expands the raw @wfcd Day/Night Aspect component drops into four leaves each. A shared `PartRow.svelte` owns the interactive checkbox wrapper; a new `AspectGroup.svelte` renders the collapsible header + leaves; `FrameCard.svelte` partitions a frame's parts into ungrouped rows and aspect groups. Completion counting is unchanged — it already counts `frame.parts.length`, so Equinox naturally becomes 0/9.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Vitest + @testing-library/svelte, tsx build scripts, oxlint/oxfmt/prettier.

## Global Constraints

- Svelte 5 runes only (`$props`, `$state`, `$derived`, `$derived.by`); no legacy stores/`export let`.
- Part ids: aspect leaves are `${frameId}:${aspect}:${slot}`; all other parts stay `${frameId}:${slot}`. Always build ids via `partId(...)`, never string-concatenate at call sites.
- Drop chances render via `formatChance` (exact 2-decimals, no tilde). Aspect BP chance = 22.56%; components = 25.81%.
- No migration of persisted localStorage keys (no users yet).
- Every commit compiles and keeps the full unit suite green (`pnpm test:unit --run`).
- Bottom note copy (verbatim): `Each Tyl Regor kill drops one Day and one Night component.` — supplied per-boss from RegionPanel, not hardcoded in FrameCard.
- Aspect glyphs: Day `☀`, Night `☾`.

---

### Task 1: `partId` gains aspect scoping

**Files:**

- Modify: `src/lib/model/completion.ts:3-5`
- Test: `src/lib/model/completion.test.ts:29-34`

**Interfaces:**

- Produces: `partId(frameId: string, slot: Slot, aspect?: 'day' | 'night'): string` — returns `${frameId}:${aspect}:${slot}` when `aspect` is given, else `${frameId}:${slot}`.

- [ ] **Step 1: Update the failing test**

Replace the existing `it('builds stable part ids for Equinox day/night aspect slots', ...)` block (currently at `src/lib/model/completion.test.ts:29-33`) with:

```ts
it('scopes aspect leaf part ids under their aspect', () => {
	expect(partId('equinox', 'bp', 'day')).toBe('equinox:day:bp');
	expect(partId('equinox', 'neuroptics', 'night')).toBe('equinox:night:neuroptics');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/model/completion.test.ts`
Expected: FAIL — `partId('equinox','bp','day')` returns `'equinox:bp'` (third arg ignored), not `'equinox:day:bp'`.

- [ ] **Step 3: Implement**

Replace `src/lib/model/completion.ts:3-5` with:

```ts
export function partId(frameId: string, slot: Slot, aspect?: 'day' | 'night'): string {
	return aspect ? `${frameId}:${aspect}:${slot}` : `${frameId}:${slot}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit --run src/lib/model/completion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/model/completion.ts src/lib/model/completion.test.ts
git commit -m "feat(model): partId supports aspect-scoped ids"
```

---

### Task 2: Model gains `aspect` field; validation accepts aspect ids

**Files:**

- Modify: `src/lib/model/types.ts:3-28`
- Modify: `scripts/data/assemble.ts:1` (add import), `scripts/data/assemble.ts:108`
- Test: `scripts/data/assemble.test.ts`

**Interfaces:**

- Consumes: `partId(frameId, slot, aspect?)` from Task 1.
- Produces: `WarframePart.aspect?: 'day' | 'night'`. `validateDataset` accepts a part whose id equals `partId(frameId, slot, aspect)`.

- [ ] **Step 1: Write the failing test**

Add to `scripts/data/assemble.test.ts` (inside the file's top-level `describe`, or append a new `describe('validateDataset aspect ids', ...)`):

```ts
import { validateDataset } from './assemble';
import type { Dataset } from '../../src/lib/model/types';

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
```

(If `validateDataset`/`Dataset` are already imported at the top of the file, do not duplicate the imports — reuse them.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run scripts/data/assemble.test.ts`
Expected: FAIL — reports `bad part id equinox:day:bp` because line 108 compares against `${f.id}:${p.slot}` = `equinox:bp`.

- [ ] **Step 3: Implement — add the field**

In `src/lib/model/types.ts`, inside `WarframePart` (keep `subDrops` for now — it is removed in Task 8), add after the `subDrops` field (line 27):

```ts
	/** For a composite frame assembled from sub-aspects (only Equinox), the
	 * aspect this leaf belongs to. Day and Night each contribute an Aspect
	 * Blueprint plus Neuroptics/Chassis/Systems. Absent on all normal parts. */
	aspect?: 'day' | 'night';
```

- [ ] **Step 4: Implement — aspect-aware validation**

In `scripts/data/assemble.ts`, add to the import block at the top (after the existing `./build` import, line 9):

```ts
import { partId } from '../../src/lib/model/completion';
```

Replace line 108:

```ts
for (const p of f.parts) if (p.id !== `${f.id}:${p.slot}`) problems.push(`bad part id ${p.id}`);
```

with:

```ts
for (const p of f.parts)
	if (p.id !== partId(f.id, p.slot, p.aspect)) problems.push(`bad part id ${p.id}`);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/assemble.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/model/types.ts scripts/data/assemble.ts scripts/data/assemble.test.ts
git commit -m "feat(model): add aspect field + aspect-aware part-id validation"
```

---

### Task 3: Build pipeline emits 9 aspect-leaf parts for Equinox

**Files:**

- Modify: `scripts/data/curated.ts:98-124`
- Modify: `scripts/data/build.ts:12-17` (import), `:102-109` (`SLOT_BY_COMPONENT`), `:111` (`ORDER`), `:189-242` (`buildFrames`)
- Modify: `scripts/data/build-data.ts:60-66` (stale comment)
- Modify: `src/lib/import/parseProfile.test.ts:85`
- Test: `scripts/data/build.test.ts:182-256`
- Regenerate: `static/data/dataset.json`

**Interfaces:**

- Consumes: `partId(frameId, slot, aspect)`, `WarframePart.aspect`.
- Produces: Equinox `parts` array of 9 entries in order `[bp, day:bp, day:neuroptics, day:chassis, day:systems, night:bp, night:neuroptics, night:chassis, night:systems]`; each Day/Night leaf carries `aspect`, `dropSourceNodeId`, and `chance`; `ASSASSINATION_ASPECTS` export replaces `ASSASSINATION_PART_DETAIL`.

- [ ] **Step 1: Replace the curated aspect data**

In `scripts/data/curated.ts`, replace the entire `ASSASSINATION_PART_DETAIL` block (lines 98-124) with:

```ts
// frameId → per-aspect components (the sub-blueprints @wfcd/items flattens
// away). Equinox is the only such frame: each aspect (Day/Night) is assembled
// from its Aspect Blueprint — whose drop chance the build supplies from the
// @wfcd Day/Night Aspect component drop — plus these three 25.81% components.
// Post-Update-42 (2026) Tyl Regor drops one guaranteed component from each side
// per kill; the old Rotation A/B gating is gone, but these within-side weights
// are unchanged. Keyed by frame id (slugified name).
export const ASSASSINATION_ASPECTS: Record<
	string,
	{ day: { slot: Slot; chance: number }[]; night: { slot: Slot; chance: number }[] }
> = {
	equinox: {
		day: [
			{ slot: 'neuroptics', chance: 25.81 },
			{ slot: 'chassis', chance: 25.81 },
			{ slot: 'systems', chance: 25.81 },
		],
		night: [
			{ slot: 'neuroptics', chance: 25.81 },
			{ slot: 'chassis', chance: 25.81 },
			{ slot: 'systems', chance: 25.81 },
		],
	},
};
```

- [ ] **Step 2: Update the failing build test**

In `scripts/data/build.test.ts`, replace the two Equinox tests at lines 210-256 (the `it('links Equinox to Titania ...')` and `it('attaches curated subDrops ...')` blocks) with:

```ts
it('expands Equinox into 9 parts: main bp + 4 Day leaves + 4 Night leaves', () => {
	const { frames } = buildFrames(equinoxWarframes, nodes);
	const equinox = frames.find((f) => f.id === 'equinox')!;
	expect(equinox).toBeDefined();
	expect(equinox.nodeId).toBe('SolNodeTitania');
	expect(equinox.parts.map((p) => p.id)).toEqual([
		'equinox:bp',
		'equinox:day:bp',
		'equinox:day:neuroptics',
		'equinox:day:chassis',
		'equinox:day:systems',
		'equinox:night:bp',
		'equinox:night:neuroptics',
		'equinox:night:chassis',
		'equinox:night:systems',
	]);
});

it('tags leaves with their aspect and sources them from Titania with chances', () => {
	const { frames } = buildFrames(equinoxWarframes, nodes);
	const equinox = frames.find((f) => f.id === 'equinox')!;
	const mainBp = equinox.parts.find((p) => p.id === 'equinox:bp')!;
	expect(mainBp.aspect).toBeUndefined();
	expect(mainBp.dropSourceNodeId).toBeUndefined();

	const dayBp = equinox.parts.find((p) => p.id === 'equinox:day:bp')!;
	expect(dayBp.aspect).toBe('day');
	expect(dayBp.dropSourceNodeId).toBe('SolNodeTitania');
	expect(dayBp.chance).toBe(22.56); // Aspect Blueprint drop chance

	const dayNeuro = equinox.parts.find((p) => p.id === 'equinox:day:neuroptics')!;
	expect(dayNeuro.aspect).toBe('day');
	expect(dayNeuro.chance).toBe(25.81);

	const nightSystems = equinox.parts.find((p) => p.id === 'equinox:night:systems')!;
	expect(nightSystems.aspect).toBe('night');
	expect(nightSystems.chance).toBe(25.81);
});

it('still yields exactly 4 standard parts for a regular frame (Rhino) in the same run', () => {
	const rhinoNodes = buildNodes(solNodes);
	const { frames } = buildFrames(warframes, rhinoNodes);
	const rhino = frames.find((f) => f.id === 'rhino')!;
	expect(rhino.parts.map((p) => p.slot)).toEqual(['bp', 'neuroptics', 'chassis', 'systems']);
	expect(rhino.parts.every((p) => p.aspect === undefined)).toBe(true);
});
```

(This removes all references to `subDrops` and the `dayaspect`/`nightaspect` slots from the test.)

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: FAIL — Equinox still builds `['bp','dayaspect','nightaspect']`; `equinox:day:bp` is not found.

- [ ] **Step 4: Implement — component/slot tables + aspect handling in `build.ts`**

In `scripts/data/build.ts`:

(a) Update the import from `./curated` (lines 12-17) to swap `ASSASSINATION_PART_DETAIL` for `ASSASSINATION_ASPECTS`:

```ts
import {
	PLANETS,
	BOSS_BY_NODE,
	KEY_BOSS_DROP_LOCATIONS,
	ASSASSINATION_BP_SOURCE,
	ASSASSINATION_ASPECTS,
} from './curated';
```

(b) Replace `SLOT_BY_COMPONENT` (lines 102-109) and `ORDER` (line 111) with:

```ts
const SLOT_BY_COMPONENT: Record<string, Slot> = {
	Blueprint: 'bp',
	Neuroptics: 'neuroptics',
	Chassis: 'chassis',
	Systems: 'systems',
};

// Raw @wfcd component name → aspect side. Equinox's Day/Night Aspect components
// each expand into four trackable leaves (Aspect Blueprint + 3 components); the
// raw component supplies the node link and the Aspect Blueprint's drop chance.
const ASPECT_BY_COMPONENT: Record<string, 'day' | 'night'> = {
	'Day Aspect': 'day',
	'Night Aspect': 'night',
};

const ORDER: Slot[] = ['bp', 'neuroptics', 'chassis', 'systems'];
```

(c) Add a leaf-builder helper just above `buildFrames` (before line 189):

```ts
/** Expand one aspect side into its trackable leaves: the Aspect Blueprint
 * (slot `bp`, chance from the raw Day/Night Aspect drop) followed by the curated
 * components. All share the boss node and carry the `aspect` tag; ids are
 * aspect-scoped so Day and Night never collide. */
function buildAspectLeaves(
	frameId: string,
	aspect: 'day' | 'night',
	nodeId: string,
	aspectChance: number | undefined,
	components: { slot: Slot; chance: number }[],
): WarframePart[] {
	const leaf = (slot: Slot, chance: number | undefined): WarframePart => ({
		id: partId(frameId, slot, aspect),
		frameId,
		slot,
		aspect,
		dropSourceNodeId: nodeId,
		chance,
	});
	return [leaf('bp', aspectChance), ...components.map((c) => leaf(c.slot, c.chance))];
}
```

(d) In `buildFrames`, add an aspect-chance map next to `chanceBySlot` (line 205):

```ts
const chanceBySlot = new Map<Slot, number>();
const aspectChance = new Map<'day' | 'night', number>();
```

(e) Replace the component-scanning loop (lines 207-223) with one that also recognizes aspect components:

```ts
for (const c of wf.components) {
	const slot = SLOT_BY_COMPONENT[c.name];
	const aspect = ASPECT_BY_COMPONENT[c.name];
	if (!slot && !aspect) continue;
	for (const d of c.drops ?? []) {
		const loc = resolveDropLocation(d.location);
		if (!loc || loc.type !== 'Assassination') continue;
		const key = `${slugify(loc.planet)}:${slugify(loc.node)}`;
		const n = nodeByKey.get(key);
		if (!n) continue;
		if (slot === 'bp') {
			bpDrop = { nodeId: n.id, chance: d.chance ?? undefined };
		} else if (aspect) {
			node = n;
			if (d.chance != null) aspectChance.set(aspect, d.chance);
		} else {
			node = n;
			if (d.chance != null) chanceBySlot.set(slot!, d.chance);
		}
	}
}
```

(f) Replace the parts construction (lines 232-242) with the standard parts plus appended aspect leaves:

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
const aspects = ASSASSINATION_ASPECTS[frameId];
if (aspects) {
	for (const side of ['day', 'night'] as const) {
		parts.push(
			...buildAspectLeaves(frameId, side, node!.id, aspectChance.get(side), aspects[side]),
		);
	}
}
```

(The `present`-set loop at lines 227-231 is unchanged: aspect components are absent from `SLOT_BY_COMPONENT`, so they no longer add slots — Equinox's `present` is just `{bp}`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: PASS.

- [ ] **Step 6: Update the stale build-data comment**

In `scripts/data/build-data.ts`, replace the comment fragment at lines 60-64 that reads "Equinox now links via its Day Aspect / Night Aspect components at Uranus/Titania (buildFrames generalized to handle non-standard slot names, Task 3);" with:

```ts
// node-linked frames. Nekros links at Deimos/Magnacidium; Equinox links via
// its Day Aspect / Night Aspect components at Uranus/Titania, each expanded
// into four trackable leaves (buildAspectLeaves);
```

(Keep the surrounding sentence about Mesa/Atlas intact.)

- [ ] **Step 7: Regenerate the shipped dataset**

Run: `pnpm data:build`
Expected: prints `Wrote static/data/dataset.json` with no "Sanity check failed" lines (Equinox/Mesa/Atlas still linked).

Sanity-check the output contains the new leaves:

Run: `grep -c 'equinox:day:' static/data/dataset.json`
Expected: `4` (day bp + neuroptics + chassis + systems).

Run: `grep -c 'equinox:dayaspect' static/data/dataset.json`
Expected: `0`.

- [ ] **Step 8: Fix the parseProfile fixture assertion**

In `src/lib/import/parseProfile.test.ts`, replace the equinox fixture line (line 18):

```ts
	frame('equinox', '/Lotus/Powersuits/YinYang/YinYang', ['bp', 'dayaspect', 'nightaspect']),
```

with an explicit 9-part frame (the generic `frame()` helper can't build aspect ids). Add this constant just below the `frames` array (after line 19) and reference it:

Replace the whole `const frames: Warframe[] = [...]` block (lines 15-19) with:

```ts
const equinoxParts = [
	{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp' as never },
	{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp' as never, aspect: 'day' },
	{ id: 'equinox:day:neuroptics', frameId: 'equinox', slot: 'neuroptics' as never, aspect: 'day' },
	{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis' as never, aspect: 'day' },
	{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems' as never, aspect: 'day' },
	{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp' as never, aspect: 'night' },
	{
		id: 'equinox:night:neuroptics',
		frameId: 'equinox',
		slot: 'neuroptics' as never,
		aspect: 'night',
	},
	{ id: 'equinox:night:chassis', frameId: 'equinox', slot: 'chassis' as never, aspect: 'night' },
	{ id: 'equinox:night:systems', frameId: 'equinox', slot: 'systems' as never, aspect: 'night' },
];

const frames: Warframe[] = [
	frame('rhino', '/Lotus/Powersuits/Rhino/Rhino', ['bp', 'neuroptics', 'chassis', 'systems']),
	frame('mesa', '/Lotus/Powersuits/Cowgirl/Cowgirl', ['bp', 'neuroptics', 'chassis', 'systems']),
	{
		id: 'equinox',
		name: 'equinox',
		uniqueName: '/Lotus/Powersuits/YinYang/YinYang',
		parts: equinoxParts,
	} as unknown as Warframe,
];
```

Then replace the assertion at line 85:

```ts
expect(res.partIds.sort()).toEqual(['equinox:bp', 'equinox:dayaspect', 'equinox:nightaspect']);
```

with:

```ts
expect(res.partIds.sort()).toEqual([
	'equinox:bp',
	'equinox:day:bp',
	'equinox:day:chassis',
	'equinox:day:neuroptics',
	'equinox:day:systems',
	'equinox:night:bp',
	'equinox:night:chassis',
	'equinox:night:neuroptics',
	'equinox:night:systems',
]);
```

- [ ] **Step 9: Run the full suite**

Run: `pnpm test:unit --run`
Expected: PASS (build, assemble, parseProfile, completion all green).

- [ ] **Step 10: Commit**

```bash
git add scripts/data/curated.ts scripts/data/build.ts scripts/data/build.test.ts scripts/data/build-data.ts src/lib/import/parseProfile.test.ts static/data/dataset.json
git commit -m "feat(data): expand Equinox aspects into individually-trackable leaves"
```

---

### Task 4: Remove now-dead subDrops rendering

**Files:**

- Modify: `src/lib/panel/FrameCard.svelte:4` (import), `:175-177` (subDrops block)
- Modify: `src/lib/panel/RegionPanel.svelte:57`
- Delete: `src/lib/panel/AspectBreakdown.svelte`, `src/lib/panel/AspectBreakdown.svelte.test.ts`

**Interfaces:**

- Consumes: nothing new. After Task 3 no part carries `subDrops`, so this rendering is dead.

- [ ] **Step 1: Delete the AspectBreakdown component and its test**

```bash
git rm src/lib/panel/AspectBreakdown.svelte src/lib/panel/AspectBreakdown.svelte.test.ts
```

- [ ] **Step 2: Remove its usage in FrameCard**

In `src/lib/panel/FrameCard.svelte`, delete the import at line 4:

```ts
import AspectBreakdown from './AspectBreakdown.svelte';
```

and delete the block at lines 175-177:

```svelte
						{#if part.subDrops}
							<AspectBreakdown {part} {owned} />
						{/if}
```

- [ ] **Step 3: Remove the subDrops branch in RegionPanel**

In `src/lib/panel/RegionPanel.svelte`, delete line 57:

```ts
if (part.subDrops) return `${bossName} · guaranteed each kill`;
```

(The next two lines already fall through to the `[bossName, chance].join(' · ')` return, which now applies to aspect leaves too — leaves will temporarily render `Tyl Regor · 22.56%` until Task 6 gives them the compact chance-only layout.)

- [ ] **Step 4: Run tests**

Run: `pnpm test:unit --run src/lib/panel/`
Expected: PASS — FrameCard and RegionPanel suites green (their Equinox fixtures use `dayaspect`/`nightaspect` parts with no `subDrops`, so removing the dead branch changes nothing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/FrameCard.svelte src/lib/panel/RegionPanel.svelte
git commit -m "refactor(panel): drop dead subDrops rendering + AspectBreakdown"
```

---

### Task 5: Extract shared `PartRow.svelte`

**Files:**

- Create: `src/lib/panel/PartRow.svelte`
- Create: `src/lib/panel/PartRow.svelte.test.ts`
- Modify: `src/lib/panel/FrameCard.svelte:130-180` (use `PartRow`)

**Interfaces:**

- Produces: `PartRow` component. Props: `{ part: WarframePart; tracker: Tracker; children: Snippet<[boolean]> }`. Renders the interactive `role="checkbox"` wrapper (`data-part`, `data-owned`, keyboard Enter/Space toggle via `tracker.togglePart`, owned styling, the ✓ box) and calls `children(owned)` for the content area. Consumed by FrameCard (Task 5) and AspectGroup (Task 6).

- [ ] **Step 1: Write the failing test**

Create `src/lib/panel/PartRow.svelte.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import PartRow from './PartRow.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe } from '$lib/model/types';

const frame: Warframe = {
	id: 'rhino',
	name: 'Rhino',
	nodeId: 'fossa',
	parts: [{ id: 'rhino:bp', frameId: 'rhino', slot: 'bp' }],
};
const label = createRawSnippet(() => ({ render: () => `<span>Blueprint</span>` }));

describe('PartRow', () => {
	it('renders an accessible checkbox row bound to the part', () => {
		const tracker = createTracker([frame]);
		const { container } = render(PartRow, {
			part: frame.parts[0],
			tracker,
			children: label,
		});
		const row = container.querySelector('[data-part="rhino:bp"]')!;
		expect(row).toBeInTheDocument();
		expect(row.getAttribute('role')).toBe('checkbox');
		expect(row.getAttribute('aria-checked')).toBe('false');
	});

	it('toggles ownership on click', async () => {
		const tracker = createTracker([frame]);
		const { container } = render(PartRow, {
			part: frame.parts[0],
			tracker,
			children: label,
		});
		(container.querySelector('[data-part="rhino:bp"]') as HTMLElement).click();
		expect(tracker.isOwned('rhino:bp')).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/PartRow.svelte.test.ts`
Expected: FAIL — module `./PartRow.svelte` does not exist.

- [ ] **Step 3: Implement `PartRow.svelte`**

Create `src/lib/panel/PartRow.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';

	let {
		part,
		tracker,
		children,
	}: {
		part: WarframePart;
		tracker: Tracker;
		/** Content area; receives the current `owned` flag for styling. */
		children: Snippet<[boolean]>;
	} = $props();

	let owned = $derived(tracker.isOwned(part.id));
</script>

<div
	data-part={part.id}
	data-owned={owned}
	role="checkbox"
	aria-checked={owned}
	tabindex="0"
	class="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {owned
		? 'border-emerald-500/30 bg-emerald-500/10'
		: ''}"
	onclick={() => tracker.togglePart(part.id)}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			if (e.key === ' ') e.preventDefault();
			tracker.togglePart(part.id);
		}
	}}
>
	<span
		aria-hidden="true"
		class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] {owned
			? 'border-emerald-400 bg-emerald-400 text-slate-950'
			: 'border-wf-edge text-transparent'}"
	>
		✓
	</span>
	<div class="min-w-0 flex-1">{@render children(owned)}</div>
</div>
```

- [ ] **Step 4: Rewire FrameCard to use PartRow**

In `src/lib/panel/FrameCard.svelte`, add to the imports (after line 3):

```ts
import PartRow from './PartRow.svelte';
```

Replace the entire part-row `{#each}` body (lines 130-180, from `{#each frame.parts as part (part.id)}` through its closing `{/each}`) with:

```svelte
				{#each frame.parts as part (part.id)}
					{@const chip = avail?.(part) ?? null}
					<PartRow {part} {tracker}>
						{#snippet children(owned)}
							<div class="flex items-center gap-2">
								<span class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}">
									{#if SLOT_ICON[part.slot]}<span
											aria-hidden="true"
											class="mr-1 text-wf-gold">{SLOT_ICON[part.slot]}</span
										>{/if}{SLOT_LABEL[part.slot]}
								</span>
								{#if chip}
									<span class="ml-auto shrink-0 text-[11px] {chip.cls}">{chip.text}</span>
								{/if}
							</div>
							<div class="mt-0.5 text-xs text-wf-muted">{sourceText(part)}</div>
						{/snippet}
					</PartRow>
				{/each}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test:unit --run src/lib/panel/`
Expected: PASS — PartRow suite green; existing FrameCard/RegionPanel suites still green (same `data-part`, `role`, label text, `sourceText` subline preserved).

- [ ] **Step 6: Commit**

```bash
git add src/lib/panel/PartRow.svelte src/lib/panel/PartRow.svelte.test.ts src/lib/panel/FrameCard.svelte
git commit -m "refactor(panel): extract shared PartRow checkbox wrapper"
```

---

### Task 6: New `AspectGroup.svelte`

**Files:**

- Create: `src/lib/panel/AspectGroup.svelte`
- Create: `src/lib/panel/AspectGroup.svelte.test.ts`

**Interfaces:**

- Consumes: `PartRow` (Task 5), `formatChance` (`./format`), `Tracker`.
- Produces: `AspectGroup` component. Props: `{ aspect: 'day' | 'night'; parts: WarframePart[]; tracker: Tracker }`. Renders a collapsible header (`▾`/`▸` caret + `☀`/`☾` glyph + `Day Aspect`/`Night Aspect` + `owned/total` count) over one `PartRow` per leaf; each leaf shows its label (`bp` → `Aspect Blueprint`, else the component name) and right-aligned `formatChance(part.chance)`. Header caret toggles collapse only and `stopPropagation`s; seed collapsed when all leaves already owned.

- [ ] **Step 1: Write the failing test**

Create `src/lib/panel/AspectGroup.svelte.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import AspectGroup from './AspectGroup.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe, WarframePart } from '$lib/model/types';

const dayParts: WarframePart[] = [
	{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
	{
		id: 'equinox:day:neuroptics',
		frameId: 'equinox',
		slot: 'neuroptics',
		aspect: 'day',
		chance: 25.81,
	},
	{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'day', chance: 25.81 },
	{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems', aspect: 'day', chance: 25.81 },
];
const frame = { id: 'equinox', name: 'Equinox', nodeId: 'titania', parts: dayParts } as Warframe;

describe('AspectGroup', () => {
	it('renders the four leaves with labels and chances when expanded', () => {
		const tracker = createTracker([frame]);
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		const text = document.body.textContent ?? '';
		expect(text).toContain('Day Aspect');
		expect(text).toContain('Aspect Blueprint');
		expect(text).toContain('22.56%');
		expect(text).toContain('Neuroptics');
		expect(text).toContain('25.81%');
		expect(document.querySelector('[data-part="equinox:day:systems"]')).toBeInTheDocument();
	});

	it('shows an owned/total rollup that reflects the tracker', () => {
		const tracker = createTracker([frame]);
		tracker.togglePart('equinox:day:bp');
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		expect(document.body.textContent).toContain('1/4');
	});

	it('toggles a leaf via its checkbox without collapsing the group', () => {
		const tracker = createTracker([frame]);
		const { container } = render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		(container.querySelector('[data-part="equinox:day:chassis"]') as HTMLElement).click();
		expect(tracker.isOwned('equinox:day:chassis')).toBe(true);
	});

	it('collapses/expands on caret click without toggling any part', async () => {
		const tracker = createTracker([frame]);
		const { container } = render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		const caret = container.querySelector('button')!;
		caret.click();
		await tick();
		expect(document.body.textContent).not.toContain('Neuroptics');
		expect(tracker.isOwned('equinox:day:bp')).toBe(false);
	});

	it('seeds collapsed when every leaf is already owned', () => {
		const tracker = createTracker([frame]);
		for (const p of dayParts) tracker.togglePart(p.id);
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		expect(document.body.textContent).not.toContain('Neuroptics');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/AspectGroup.svelte.test.ts`
Expected: FAIL — module `./AspectGroup.svelte` does not exist.

- [ ] **Step 3: Implement `AspectGroup.svelte`**

Create `src/lib/panel/AspectGroup.svelte`:

```svelte
<script lang="ts">
	import type { WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import PartRow from './PartRow.svelte';
	import { formatChance } from './format';

	let {
		aspect,
		parts,
		tracker,
	}: {
		aspect: 'day' | 'night';
		parts: WarframePart[];
		tracker: Tracker;
	} = $props();

	const HEAD = {
		day: { glyph: '☀', name: 'Day Aspect' },
		night: { glyph: '☾', name: 'Night Aspect' },
	} as const;

	// Leaf label: the aspect's own blueprint reads "Aspect Blueprint"; the three
	// components keep their component names.
	const LEAF_LABEL: Record<string, string> = {
		bp: 'Aspect Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
	};

	let ownedCount = $derived(parts.filter((p) => tracker.isOwned(p.id)).length);

	// Seed collapse ONCE: collapsed if the whole aspect is already owned, open
	// while anything is missing. Mirrors FrameCard's seed-once expand pattern;
	// toggling a leaf must not snap the group shut mid-interaction.
	// svelte-ignore state_referenced_locally
	let open = $state(parts.some((p) => !tracker.isOwned(p.id)));
</script>

<div class="mt-1">
	<button
		type="button"
		class="flex w-full items-center gap-2 text-left text-sm text-slate-200 hover:text-slate-100"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
		onkeydown={(e) => e.stopPropagation()}
	>
		<span aria-hidden="true" class="text-wf-muted">{open ? '▾' : '▸'}</span>
		<span aria-hidden="true" class="text-wf-gold">{HEAD[aspect].glyph}</span>
		<span class="font-medium">{HEAD[aspect].name}</span>
		<span class="ml-auto shrink-0 text-xs text-wf-muted">{ownedCount}/{parts.length}</span>
	</button>
	{#if open}
		<div class="mt-1 space-y-1 pl-4">
			{#each parts as part (part.id)}
				<PartRow {part} {tracker}>
					{#snippet children(owned)}
						<div class="flex items-center gap-2">
							<span class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}">
								{LEAF_LABEL[part.slot] ?? part.slot}
							</span>
							{#if part.chance != null}
								<span class="ml-auto shrink-0 text-[11px] text-wf-muted"
									>{formatChance(part.chance)}</span
								>
							{/if}
						</div>
					{/snippet}
				</PartRow>
			{/each}
		</div>
	{/if}
</div>
```

- [ ] **Step 4: Validate with the Svelte MCP server**

Use the `svelte-file-editor` skill / Svelte MCP autofixer to check `src/lib/panel/AspectGroup.svelte` (and `PartRow.svelte` from Task 5) for Svelte 5 correctness; apply any fixes it reports, then re-check until clean.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/AspectGroup.svelte.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/panel/AspectGroup.svelte src/lib/panel/AspectGroup.svelte.test.ts
git commit -m "feat(panel): collapsible AspectGroup with per-aspect rollup"
```

---

### Task 7: FrameCard groups aspect parts + bottom note

**Files:**

- Modify: `src/lib/panel/FrameCard.svelte` (imports, `SLOT_LABEL`, render partition, `aspectNote` prop, bottom note)
- Modify: `src/lib/panel/RegionPanel.svelte` (pass `aspectNote`)
- Modify: `src/lib/panel/FrameCard.svelte.test.ts`
- Modify: `src/lib/panel/RegionPanel.svelte.test.ts:83-127` (fixture) and `:495-510` (aspect tests)

**Interfaces:**

- Consumes: `AspectGroup` (Task 6), `PartRow` (Task 5).
- Produces: FrameCard renders ungrouped parts as `PartRow`s and each aspect side as an `AspectGroup`, preserving `frame.parts` order; adds optional `aspectNote?: string` prop rendered as an info line when the frame has aspect parts; `SLOT_LABEL` renders `bp` as `Aspect Blueprint` when `part.aspect` is set.

- [ ] **Step 1: Write the failing FrameCard test**

Add to `src/lib/panel/FrameCard.svelte.test.ts` a describe block. First check the file's existing imports/helpers and reuse them; this block assumes `render` from `@testing-library/svelte` and `createTracker` are available (import them if the file doesn't already):

```ts
import type { Warframe } from '$lib/model/types';

const equinox: Warframe = {
	id: 'equinox',
	name: 'Equinox',
	nodeId: 'titania',
	parts: [
		{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp', marketCost: 25000 },
		{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
		{
			id: 'equinox:day:neuroptics',
			frameId: 'equinox',
			slot: 'neuroptics',
			aspect: 'day',
			chance: 25.81,
		},
		{
			id: 'equinox:day:chassis',
			frameId: 'equinox',
			slot: 'chassis',
			aspect: 'day',
			chance: 25.81,
		},
		{
			id: 'equinox:day:systems',
			frameId: 'equinox',
			slot: 'systems',
			aspect: 'day',
			chance: 25.81,
		},
		{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp', aspect: 'night', chance: 22.56 },
		{
			id: 'equinox:night:neuroptics',
			frameId: 'equinox',
			slot: 'neuroptics',
			aspect: 'night',
			chance: 25.81,
		},
		{
			id: 'equinox:night:chassis',
			frameId: 'equinox',
			slot: 'chassis',
			aspect: 'night',
			chance: 25.81,
		},
		{
			id: 'equinox:night:systems',
			frameId: 'equinox',
			slot: 'systems',
			aspect: 'night',
			chance: 25.81,
		},
	],
};

describe('FrameCard (Equinox aspect groups)', () => {
	it('renders a Day and Night aspect group plus the market blueprint', () => {
		const tracker = createTracker([equinox]);
		render(FrameCard, {
			frame: equinox,
			tracker,
			subLine: 'Titania · Boss: Tyl Regor',
			faction: 'Grineer',
			kindLabel: 'Assassination',
			sourceText: () => 'Market (25,000cr)',
			aspectNote: 'Each Tyl Regor kill drops one Day and one Night component.',
		});
		expect(screen.getByText('Day Aspect')).toBeInTheDocument();
		expect(screen.getByText('Night Aspect')).toBeInTheDocument();
		// Day BP leaf is labelled "Aspect Blueprint", not "Blueprint".
		expect(screen.getAllByText('Aspect Blueprint').length).toBe(2);
		expect(document.querySelector('[data-part="equinox:day:systems"]')).toBeInTheDocument();
	});

	it('shows the per-kill bottom note when the frame has aspects', () => {
		const tracker = createTracker([equinox]);
		render(FrameCard, {
			frame: equinox,
			tracker,
			subLine: 'Titania · Boss: Tyl Regor',
			faction: 'Grineer',
			kindLabel: 'Assassination',
			sourceText: () => 'Market (25,000cr)',
			aspectNote: 'Each Tyl Regor kill drops one Day and one Night component.',
		});
		expect(
			screen.getByText('Each Tyl Regor kill drops one Day and one Night component.'),
		).toBeInTheDocument();
	});
});
```

(Match the file's existing import style — if `render`, `screen`, `describe`, `it`, `expect`, `createFrameCard`-style helpers already exist, reuse them rather than re-importing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/FrameCard.svelte.test.ts`
Expected: FAIL — no `Day Aspect` group header (parts currently render as flat `PartRow`s labelled `Blueprint`), and `aspectNote` is not rendered.

- [ ] **Step 3: Implement FrameCard grouping**

In `src/lib/panel/FrameCard.svelte`:

(a) Add the import (after the `PartRow` import from Task 5):

```ts
import AspectGroup from './AspectGroup.svelte';
```

(b) Add `aspectNote` to the props type/destructure (add to the `$props()` object, after `summary`):

```ts
		aspectNote,
```

and in the type annotation:

```ts
		aspectNote?: string;
```

(c) Change `SLOT_LABEL` usage for the aspect blueprint. Replace the `SLOT_LABEL` const (lines 30-37) so the leaf renderer can special-case it — simplest is a helper below the existing consts:

```ts
function slotLabel(part: WarframePart): string {
	if (part.slot === 'bp' && part.aspect) return 'Aspect Blueprint';
	return SLOT_LABEL[part.slot];
}
```

(d) Add a derived render list in the `<script>` (after the `pct` derived, ~line 62):

```ts
type Row =
	| { kind: 'part'; part: WarframePart }
	| { kind: 'aspect'; aspect: 'day' | 'night'; parts: WarframePart[] };

// Partition parts into ungrouped rows and Day/Night aspect groups, preserving
// order: the first leaf of an aspect emits the whole group; later leaves of
// the same aspect are folded in and skipped.
let rows = $derived.by<Row[]>(() => {
	const out: Row[] = [];
	const seen = new Set<'day' | 'night'>();
	for (const p of frame.parts) {
		if (p.aspect) {
			if (seen.has(p.aspect)) continue;
			seen.add(p.aspect);
			out.push({
				kind: 'aspect',
				aspect: p.aspect,
				parts: frame.parts.filter((q) => q.aspect === p.aspect),
			});
		} else {
			out.push({ kind: 'part', part: p });
		}
	}
	return out;
});
```

(e) Replace the `{#each frame.parts ...}` block (the PartRow loop from Task 5) with a loop over `rows`:

```svelte
				{#each rows as row (row.kind === 'aspect' ? row.aspect : row.part.id)}
					{#if row.kind === 'aspect'}
						<AspectGroup aspect={row.aspect} parts={row.parts} {tracker} />
					{:else}
						{@const part = row.part}
						{@const chip = avail?.(part) ?? null}
						<PartRow {part} {tracker}>
							{#snippet children(owned)}
								<div class="flex items-center gap-2">
									<span class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}">
										{slotLabel(part)}
									</span>
									{#if chip}
										<span class="ml-auto shrink-0 text-[11px] {chip.cls}">{chip.text}</span>
									{/if}
								</div>
								<div class="mt-0.5 text-xs text-wf-muted">{sourceText(part)}</div>
							{/snippet}
						</PartRow>
					{/if}
				{/each}
```

(f) Add the bottom note after the parts `<div>` group but before the "Toggle whole frame" button (i.e. between the closing `</div>` of the `role="group"` block and the toggle `<button>`, ~line 181):

```svelte
			{#if aspectNote && frame.parts.some((p) => p.aspect)}
				<p class="mt-2 text-[11px] text-wf-muted">ⓘ {aspectNote}</p>
			{/if}
```

- [ ] **Step 4: Pass `aspectNote` from RegionPanel**

In `src/lib/panel/RegionPanel.svelte`, find the assassination `<FrameCard ... />` usage (~line 176-186, where `sourceText={(part) => assassinationSourceText(part, bossName)}` is passed). Add an `aspectNote` prop alongside it:

```svelte
									aspectNote={`Each ${bossName} kill drops one Day and one Night component.`}
```

(`bossName` is already in scope at this call site — it is the same value passed to `assassinationSourceText`. If it is computed inline, hoist it to a `const bossName = ...` above the `<FrameCard>` so both props can use it.)

- [ ] **Step 5: Update the RegionPanel Equinox fixture + tests**

In `src/lib/panel/RegionPanel.svelte.test.ts`, replace the comment + `warframes` array of `equinoxRegion` (lines 83-127 region: the `parts` currently listing `equinox:dayaspect`/`equinox:nightaspect`) so Equinox has the 9-part model:

```ts
// linking Equinox, whose parts include eight aspect leaves (Day/Night ×
// {Aspect Blueprint, Neuroptics, Chassis, Systems}) plus the market blueprint.
```

and the `warframes` entry's `parts`:

```ts
			parts: [
				{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp', marketCost: 25000 },
				{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
				{ id: 'equinox:day:neuroptics', frameId: 'equinox', slot: 'neuroptics', aspect: 'day', chance: 25.81 },
				{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'day', chance: 25.81 },
				{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems', aspect: 'day', chance: 25.81 },
				{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp', aspect: 'night', chance: 22.56 },
				{ id: 'equinox:night:neuroptics', frameId: 'equinox', slot: 'neuroptics', aspect: 'night', chance: 25.81 },
				{ id: 'equinox:night:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'night', chance: 25.81 },
				{ id: 'equinox:night:systems', frameId: 'equinox', slot: 'systems', aspect: 'night', chance: 25.81 },
			],
```

Then replace the two aspect tests (lines 495-510):

```ts
it('renders Equinox as collapsible Day/Night aspect groups', () => {
	const tracker = createTracker(equinoxRegion.warframes);
	render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
	expect(screen.getByText('Day Aspect')).toBeInTheDocument();
	expect(screen.getByText('Night Aspect')).toBeInTheDocument();
	expect(document.querySelector('[data-part="equinox:day:bp"]')).toBeInTheDocument();
});
it('prefixes Equinox aspect group headers with sun/moon glyphs', () => {
	const tracker = createTracker(equinoxRegion.warframes);
	render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
	expect(screen.getByText('☀')).toBeInTheDocument();
	expect(screen.getByText('☾')).toBeInTheDocument();
});
it('shows the per-kill note naming the boss', () => {
	const tracker = createTracker(equinoxRegion.warframes);
	render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
	expect(
		screen.getByText('Each Tyl Regor kill drops one Day and one Night component.'),
	).toBeInTheDocument();
});
```

- [ ] **Step 6: Validate Svelte components**

Use the `svelte-file-editor` skill / Svelte MCP autofixer on `src/lib/panel/FrameCard.svelte`; apply fixes and re-check until clean.

- [ ] **Step 7: Run the panel suite**

Run: `pnpm test:unit --run src/lib/panel/`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/panel/FrameCard.svelte src/lib/panel/RegionPanel.svelte src/lib/panel/FrameCard.svelte.test.ts src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(panel): render Equinox aspect groups + per-kill note"
```

---

### Task 8: Remove the retired model surface + final gates

**Files:**

- Modify: `src/lib/model/types.ts` (remove `subDrops`, narrow `Slot`)
- Modify: `src/lib/panel/format.ts` (remove `aspectBreakdownLines`)
- Modify: `src/lib/panel/format.test.ts` (remove its tests)
- Modify: `src/lib/panel/FrameCard.svelte` (drop unused `SLOT_ICON` + aspect entries in `SLOT_LABEL`)

**Interfaces:**

- Consumes: nothing — this task deletes now-unreferenced surface. Verified by full typecheck + suite.

- [ ] **Step 1: Remove `aspectBreakdownLines` and its tests**

In `src/lib/panel/format.ts`, delete the `aspectBreakdownLines` function (lines 10-19) and its doc comment, leaving only `formatChance`.

In `src/lib/panel/format.test.ts`, delete the entire `describe('aspectBreakdownLines', ...)` block and remove `aspectBreakdownLines` from the import so only `formatChance` remains:

```ts
import { formatChance } from './format';
```

- [ ] **Step 2: Narrow the model**

In `src/lib/model/types.ts`:

Replace the `Slot` type (line 1):

```ts
export type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems';
```

Delete the `subDrops` field (the doc-commented `subDrops?: { label: string; chance: number }[];`, lines 23-27).

- [ ] **Step 3: Drop dead FrameCard slot decoration**

In `src/lib/panel/FrameCard.svelte`:

Remove the `dayaspect`/`nightaspect` entries from `SLOT_LABEL` so it reads:

```ts
const SLOT_LABEL = {
	bp: 'Blueprint',
	neuroptics: 'Neuroptics',
	chassis: 'Chassis',
	systems: 'Systems',
} as const;
```

Delete the now-unused `SLOT_ICON` const entirely (the sun/moon glyphs live in `AspectGroup` now; no ungrouped part uses an icon).

- [ ] **Step 4: Typecheck**

Run: `pnpm check`
Expected: PASS — no references to `subDrops`, `dayaspect`, `nightaspect`, `SLOT_ICON`, or `aspectBreakdownLines` remain. If `svelte-check` flags any leftover, fix it inline.

- [ ] **Step 5: Full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS (all suites).

- [ ] **Step 6: Lint + format**

Run: `pnpm lint`
Then: `pnpm format`
Expected: no lint errors; formatter rewrites any touched files. Stage the formatted result.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(model): retire subDrops + aspect slots after leaf migration"
```

---

## Self-Review

**Spec coverage:**

- Fully-trackable sub-blueprints replacing single aspect checkboxes → Tasks 1-3 (ids, model, build), Task 7 (UI). ✓
- Collapsible aspect groups with `n/4` rollup → Task 6. ✓
- Bottom note "Each Tyl Regor kill drops one Day and one Night component." → Task 7 (via `aspectNote`). ✓
- Remove `subDrops`, remove aspect slots, add `aspect` field → Tasks 2 (add) + 8 (remove). ✓
- Aspect-scoped ids `equinox:day:bp` → Task 1 + validation Task 2 + build Task 3. ✓
- Completion 0/9 with no counting change → relies on existing `frame.parts.length`; verified by Task 3 (9 parts) + Task 7 UI. ✓
- Delete `AspectBreakdown` + `aspectBreakdownLines` → Task 4 + Task 8. ✓
- Remove RegionPanel `subDrops`/"guaranteed each kill" branch → Task 4. ✓
- No migration → nothing done, per Global Constraints. ✓
- Rebuild shipped dataset → Task 3 Step 7. ✓

**Type consistency:** `partId(frameId, slot, aspect?)` defined Task 1, used Tasks 2/3. `WarframePart.aspect: 'day' | 'night'` defined Task 2, used Tasks 3/6/7. `PartRow` props `{ part, tracker, children: Snippet<[boolean]> }` defined Task 5, consumed Tasks 5/6. `AspectGroup` props `{ aspect, parts, tracker }` defined Task 6, consumed Task 7. `FrameCard` gains `aspectNote?: string` Task 7, passed by RegionPanel Task 7. Consistent.

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. Clean.
