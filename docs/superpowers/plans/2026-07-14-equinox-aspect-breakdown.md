# Equinox Aspect Sub-Blueprint Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each Equinox aspect's real 4-blueprint sub-build (Aspect + Neuroptics/Chassis/Systems) in a collapsible per-aspect breakdown, drop the obsolete Rotation A/B, and convey Tyl Regor's post-Update-42 "guaranteed each kill" drop.

**Architecture:** Curate the sub-blueprints `@wfcd` flattens away onto the aspect `WarframePart`s via a new `subDrops` field, applied in the build. The panel renders composite (aspect) rows with a "guaranteed each kill" label and a small collapsible `AspectBreakdown` child of `FrameCard`. Completion stays at 3 tracked parts.

**Tech Stack:** SvelteKit 5 (runes), TypeScript, Vitest + @testing-library/svelte, tsx data-build, `@wfcd/items`, oxlint/oxfmt/prettier.

## Global Constraints

- Package manager is **pnpm**. Tests: `pnpm test:unit --run`. Data build: `pnpm data:build`. Lint: `pnpm lint`. Format check: `pnpm format:check`. Before committing/pushing run `pnpm format` (not just `format:check`).
- This branch is **stacked on `fix/exact-drop-rate`** (PR #12), which already added `formatChance` inside `RegionPanel.svelte`. Percentages render via `formatChance` → e.g. `22.56%`, `25.81%` (2 decimals, trailing zeros trimmed, no `~`).
- **Guardrail:** assassination `FrameCard`s must stay `avail`-less. Equinox must NOT get a `rotation` value or any world-state availability chip — assassination rotation is not world-state driven, and a stray `rotation: 'A'` would make `partAvailability('A','C')` falsely render "not this rotation".
- Verified data: each Equinox aspect side is a 100% table — Aspect Blueprint **22.56%** (the aspect part's own `chance`, from `@wfcd`) + Neuroptics/Chassis/Systems **25.81%** each. Update 42 removed the A/B gating (now one guaranteed component per side per kill); the within-side weights are unchanged.
- `.svelte` edits: validate with the Svelte MCP server tools / `svelte-file-editor` after editing.

---

### Task 1: Data model + curated `subDrops` + build wiring

**Files:**

- Modify: `src/lib/model/types.ts` (`WarframePart` interface)
- Modify: `scripts/data/curated.ts` (append new export)
- Modify: `scripts/data/build.ts` (import; attach `subDrops` in `buildFrames`)
- Test: `scripts/data/build.test.ts`

**Interfaces:**

- Consumes: existing `buildFrames` component loop, `partId`, `ASSASSINATION_BP_SOURCE` import.
- Produces:
  - `WarframePart.subDrops?: { label: string; chance: number }[]`.
  - `ASSASSINATION_PART_DETAIL: Record<string, Partial<Record<Slot, { subDrops: { label: string; chance: number }[] }>>>` in `curated.ts`.
  - `buildFrames` now attaches `subDrops` to any non-bp part listed in `ASSASSINATION_PART_DETAIL[frameId]`.

- [ ] **Step 1: Add the `subDrops` model field**

In `src/lib/model/types.ts`, add to the `WarframePart` interface (after the existing `bpSource?` field from the stacked branch):

```ts
	/** Reference-only sub-blueprints of a composite part — the components you
	 * must farm to build it — that @wfcd/items flattens away. Not individually
	 * tracked. Only Equinox's Day/Night aspects use this: the aspect's own
	 * chance is the Aspect Blueprint; these are its Neuroptics/Chassis/Systems. */
	subDrops?: { label: string; chance: number }[];
```

- [ ] **Step 2: Add the curated part-detail map**

In `scripts/data/curated.ts`, append at the end of the file:

```ts
// frameId → per-slot composite sub-blueprints @wfcd/items flattens away.
// Equinox is the only such frame: each aspect is a sub-build of its Aspect
// Blueprint (the part's own 22.56% chance) + these three 25.81% components.
// Post-Update-42 (2026) Tyl Regor drops one guaranteed component from each
// side per kill; the old Rotation A/B gating is gone, but these within-side
// weights are unchanged. Keyed by frame id (slugified name).
export const ASSASSINATION_PART_DETAIL: Record<
	string,
	Partial<Record<Slot, { subDrops: { label: string; chance: number }[] }>>
> = {
	equinox: {
		dayaspect: {
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Chassis', chance: 25.81 },
				{ label: 'Systems', chance: 25.81 },
			],
		},
		nightaspect: {
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Chassis', chance: 25.81 },
				{ label: 'Systems', chance: 25.81 },
			],
		},
	},
};
```

`curated.ts` already imports `Slot` (used by other exports). If the file does not import `Slot`, add it to the existing `import type { ... } from '../../src/lib/model/types'` line.

- [ ] **Step 3: Import the map in build.ts**

In `scripts/data/build.ts`, extend the existing `./curated` import (currently ends `…, ASSASSINATION_BP_SOURCE } from './curated';`) to add `ASSASSINATION_PART_DETAIL`:

```ts
import {
	PLANETS,
	BOSS_BY_NODE,
	KEY_BOSS_DROP_LOCATIONS,
	ASSASSINATION_BP_SOURCE,
	ASSASSINATION_PART_DETAIL,
} from './curated';
```

(Match the existing import style — if it is a single line, keep it single-line.)

- [ ] **Step 4: Write the failing build test**

In `scripts/data/build.test.ts`, add inside the top-level `describe('buildFrames', ...)` block (which builds `frames` from the shared fixture — the fixture already contains Equinox, whose aspects drop at Uranus/Titania). Place it after the Equinox-related assertions if present, else at the end of that block:

```ts
it('attaches curated subDrops to Equinox aspects and nothing to normal parts', () => {
	const equinox = frames.find((f) => f.id === 'equinox')!;
	const day = equinox.parts.find((p) => p.slot === 'dayaspect')!;
	expect(day.chance).toBe(22.56); // Aspect Blueprint chance, unchanged
	expect(day.subDrops).toEqual([
		{ label: 'Neuroptics', chance: 25.81 },
		{ label: 'Chassis', chance: 25.81 },
		{ label: 'Systems', chance: 25.81 },
	]);
	const night = equinox.parts.find((p) => p.slot === 'nightaspect')!;
	expect(night.subDrops).toHaveLength(3);
	// Guardrail: no rotation leaks onto the aspect.
	expect(day.rotation).toBeUndefined();
	// A normal frame's parts carry no subDrops.
	const rhino = frames.find((f) => f.id === 'rhino')!;
	expect(rhino.parts.every((p) => p.subDrops === undefined)).toBe(true);
});
```

If the shared `frames` in this describe is not built from a fixture containing Equinox, instead build one inline like the existing tests: an Equinox `RawWarframe` with `Day Aspect`/`Night Aspect` components dropping at `Uranus/Titania (Assassination)`, passed through `buildFrames(wf, nodes)` where `nodes` includes Titania. (Check the file's existing Equinox test to reuse its fixture.)

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: FAIL — `day.subDrops` is `undefined` (field not yet attached).

- [ ] **Step 6: Attach subDrops in buildFrames**

In `scripts/data/build.ts`, inside `buildFrames`, find the non-bp branch of the `parts` construction (the `return { id: partId(frameId, slot), frameId, slot, dropSourceNodeId: node!.id, chance: chanceBySlot.get(slot) };`). Replace it so it also attaches curated `subDrops`:

```ts
const parts: WarframePart[] = ORDER.filter((slot) => present.has(slot)).map((slot) => {
	if (slot === 'bp') return buildBpPart(frameId, bpDrop, wf.bpCost);
	return {
		id: partId(frameId, slot),
		frameId,
		slot,
		dropSourceNodeId: node!.id,
		chance: chanceBySlot.get(slot),
		subDrops: ASSASSINATION_PART_DETAIL[frameId]?.[slot]?.subDrops,
	};
});
```

(The `bp` path via `buildBpPart` is unchanged. `subDrops` is `undefined` for every non-curated part, so it is simply omitted from those objects.)

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: PASS — all build tests green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/model/types.ts scripts/data/curated.ts scripts/data/build.ts scripts/data/build.test.ts
git commit -m "feat(data): curate Equinox aspect sub-blueprints (subDrops)"
```

---

### Task 2: Shared formatting helpers (`format.ts`)

**Files:**

- Create: `src/lib/panel/format.ts`
- Modify: `src/lib/panel/RegionPanel.svelte` (import `formatChance`, remove local copy)
- Test: `src/lib/panel/format.test.ts`

**Interfaces:**

- Consumes: `WarframePart` shape (`chance`, `subDrops`).
- Produces:
  - `formatChance(chance: number): string` — moved out of `RegionPanel`.
  - `aspectBreakdownText(part): string` — `"Aspect {chance}% · {grouped subDrops}"`, consecutive equal chances grouped (`Neuroptics/Chassis/Systems 25.81%`).

- [ ] **Step 1: Write the failing helper tests**

Create `src/lib/panel/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatChance, aspectBreakdownText } from './format';

describe('formatChance', () => {
	it('shows exact two-decimal values without a tilde', () => {
		expect(formatChance(38.72)).toBe('38.72%');
		expect(formatChance(45)).toBe('45%');
		expect(formatChance(12.5)).toBe('12.5%');
	});
	it('rounds float noise to two decimals', () => {
		expect(formatChance(39.42999999999999)).toBe('39.43%');
	});
});

describe('aspectBreakdownText', () => {
	it('groups equal-chance sub-blueprints after the aspect chance', () => {
		const part = {
			chance: 22.56,
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Chassis', chance: 25.81 },
				{ label: 'Systems', chance: 25.81 },
			],
		};
		expect(aspectBreakdownText(part)).toBe('Aspect 22.56% · Neuroptics/Chassis/Systems 25.81%');
	});
	it('keeps differing chances as separate segments', () => {
		const part = {
			chance: 22.56,
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Systems', chance: 10 },
			],
		};
		expect(aspectBreakdownText(part)).toBe('Aspect 22.56% · Neuroptics 25.81% · Systems 10%');
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/format.test.ts`
Expected: FAIL — `./format` module does not exist.

- [ ] **Step 3: Create the helper module**

Create `src/lib/panel/format.ts`:

```ts
import type { WarframePart } from '$lib/model/types';

/** Drop chance to 2 decimals (trailing zeros trimmed). Assassination boss
 * tables are exact 2-decimal weights that sum to 100%; open-world data carries
 * float noise (e.g. 39.4299…) that 2 decimals tidy. No approximation tilde. */
export function formatChance(chance: number): string {
	return `${Number(chance.toFixed(2))}%`;
}

/** Reference sub-blueprint lines for a composite part (Equinox aspect), one
 * entry per line: the Aspect Blueprint (the part's own chance) followed by each
 * sub-component, e.g. ["Aspect 22.56%", "Neuroptics 25.81%", "Chassis 25.81%",
 * "Systems 25.81%"]. The caller renders each on its own line. */
export function aspectBreakdownLines(part: Pick<WarframePart, 'chance' | 'subDrops'>): string[] {
	const lines: string[] = [];
	if (part.chance != null) lines.push(`Aspect ${formatChance(part.chance)}`);
	for (const d of part.subDrops ?? []) lines.push(`${d.label} ${formatChance(d.chance)}`);
	return lines;
}
```

(Post-brainstorming refinement: the breakdown lists each sub-blueprint on its
own line rather than grouping equal chances, so the helper returns `string[]`.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Point RegionPanel at the shared helper**

In `src/lib/panel/RegionPanel.svelte`:

1. Add an import (alongside the existing `$lib` imports in the `<script>`):

```ts
import { formatChance } from './format';
```

2. Delete the local `formatChance` function (the `function formatChance(chance: number): string { return \`${Number(chance.toFixed(2))}%\`; }`block added on the stacked branch, together with its leading comment).`owSourceText`and`assassinationSourceText`keep calling`formatChance(...)` — now resolved via the import.

- [ ] **Step 6: Validate the component + run the panel tests**

Validate `RegionPanel.svelte` with the Svelte MCP tools (expect no issues).
Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: PASS — behaviour unchanged (helper moved, not altered).

- [ ] **Step 7: Commit**

```bash
git add src/lib/panel/format.ts src/lib/panel/format.test.ts src/lib/panel/RegionPanel.svelte
git commit -m "refactor(panel): extract formatChance + add aspectBreakdownText helper"
```

---

### Task 3: `AspectBreakdown` component + panel wiring

**Files:**

- Create: `src/lib/panel/AspectBreakdown.svelte`
- Create: `src/lib/panel/AspectBreakdown.svelte.test.ts`
- Modify: `src/lib/panel/RegionPanel.svelte` (`assassinationSourceText` composite branch)
- Modify: `src/lib/panel/FrameCard.svelte` (render `AspectBreakdown` for parts with `subDrops`)
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: `aspectBreakdownLines(part): string[]` (Task 2 — returns one string per line: `["Aspect 22.56%", "Neuroptics 25.81%", "Chassis 25.81%", "Systems 25.81%"]`), `WarframePart.subDrops` (Task 1).
- Produces: `AspectBreakdown` component (`props: { part: WarframePart; owned: boolean }`).

- [ ] **Step 1: Write the failing AspectBreakdown test**

Create `src/lib/panel/AspectBreakdown.svelte.test.ts`:

```ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import AspectBreakdown from './AspectBreakdown.svelte';
import type { WarframePart } from '$lib/model/types';

const part: WarframePart = {
	id: 'equinox:dayaspect',
	frameId: 'equinox',
	slot: 'dayaspect',
	chance: 22.56,
	subDrops: [
		{ label: 'Neuroptics', chance: 25.81 },
		{ label: 'Chassis', chance: 25.81 },
		{ label: 'Systems', chance: 25.81 },
	],
};

describe('AspectBreakdown', () => {
	it('is expanded by default when the aspect is not owned, one line per blueprint', () => {
		render(AspectBreakdown, { part, owned: false });
		const text = document.body.textContent ?? '';
		expect(text).toContain('Aspect 22.56%');
		expect(text).toContain('Neuroptics 25.81%');
		expect(text).toContain('Chassis 25.81%');
		expect(text).toContain('Systems 25.81%');
	});

	it('is collapsed by default when the aspect is already owned', () => {
		render(AspectBreakdown, { part, owned: true });
		expect(document.body.textContent).not.toContain('Neuroptics 25.81%');
	});

	it('toggles open on caret click', async () => {
		const { container } = render(AspectBreakdown, { part, owned: true });
		const btn = container.querySelector('button')!;
		btn.click();
		await tick();
		expect(document.body.textContent).toContain('Neuroptics 25.81%');
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/AspectBreakdown.svelte.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create AspectBreakdown.svelte**

Create `src/lib/panel/AspectBreakdown.svelte`:

```svelte
<script lang="ts">
	import type { WarframePart } from '$lib/model/types';
	import { aspectBreakdownLines } from './format';

	let { part, owned }: { part: WarframePart; owned: boolean } = $props();

	// Seed collapse state ONCE: collapsed if the aspect is already owned, open
	// while unobtained. Mirrors FrameCard's seed-once defaultExpanded and its
	// rule that toggling a part must not snap sections shut mid-interaction.
	// svelte-ignore state_referenced_locally
	let open = $state(!owned);
</script>

<div class="mt-1">
	<button
		type="button"
		class="flex items-center gap-1 text-[11px] text-wf-muted hover:text-slate-300"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
		onkeydown={(e) => e.stopPropagation()}
	>
		<span aria-hidden="true">{open ? '▾' : '▸'}</span>
		Blueprints
	</button>
	{#if open}
		<div class="mt-0.5 pl-4 text-[11px] text-wf-muted">
			{#each aspectBreakdownLines(part) as line}
				<div>{line}</div>
			{/each}
		</div>
	{/if}
</div>
```

The `stopPropagation` on both `onclick` and `onkeydown` is required: the enclosing `FrameCard` part row is a `role="checkbox"` with its own `onclick`/`onkeydown` that toggle ownership — without it, opening the breakdown would also check the part. Each `aspectBreakdownLines(part)` entry renders on its own line (`Aspect 22.56%`, then `Neuroptics 25.81%`, `Chassis 25.81%`, `Systems 25.81%`).

- [ ] **Step 4: Run to verify it passes; validate component**

Run: `pnpm test:unit --run src/lib/panel/AspectBreakdown.svelte.test.ts`
Expected: PASS.
Validate `AspectBreakdown.svelte` with the Svelte MCP tools (expect no issues).

- [ ] **Step 5: Write the failing RegionPanel composite-row test**

In `src/lib/panel/RegionPanel.svelte.test.ts`, add a dataset + describe block at the end (Equinox on Uranus; the aspect parts carry `subDrops`, so the frame is unowned → card auto-expands → `AspectBreakdown` auto-expands):

```ts
const equinoxRegion: Dataset = {
	regions: [
		{
			id: 'uranus',
			name: 'Uranus',
			kind: 'planet',
			progressionOrder: 10,
			factions: ['Grineer'],
			nodeIds: ['titania'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'titania',
			regionId: 'uranus',
			name: 'Titania',
			missionType: 'Assassination',
			faction: 'Grineer',
			isAssassination: true,
			bossId: 'tylregor',
			frameId: 'equinox',
		},
	],
	bosses: [{ id: 'tylregor', name: 'Tyl Regor', nodeId: 'titania', faction: 'Grineer' }],
	warframes: [
		{
			id: 'equinox',
			name: 'Equinox',
			nodeId: 'titania',
			parts: [
				{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp', marketCost: 25000 },
				{
					id: 'equinox:dayaspect',
					frameId: 'equinox',
					slot: 'dayaspect',
					dropSourceNodeId: 'titania',
					chance: 22.56,
					subDrops: [
						{ label: 'Neuroptics', chance: 25.81 },
						{ label: 'Chassis', chance: 25.81 },
						{ label: 'Systems', chance: 25.81 },
					],
				},
				{
					id: 'equinox:nightaspect',
					frameId: 'equinox',
					slot: 'nightaspect',
					dropSourceNodeId: 'titania',
					chance: 22.56,
					subDrops: [
						{ label: 'Neuroptics', chance: 25.81 },
						{ label: 'Chassis', chance: 25.81 },
						{ label: 'Systems', chance: 25.81 },
					],
				},
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [],
};

describe('RegionPanel — Equinox aspect breakdown', () => {
	it('shows the guaranteed-each-kill mechanic on an aspect row (no bare %)', () => {
		render(RegionPanel, {
			dataset: equinoxRegion,
			regionId: 'uranus',
			tracker: createTracker(equinoxRegion.warframes),
		});
		const row = document.querySelector('[data-part="equinox:dayaspect"]') as HTMLElement;
		expect(row.textContent).toContain('Tyl Regor · guaranteed each kill');
		expect(row.textContent).not.toMatch(/Tyl Regor · 22\.56%/);
	});
	it('renders the sub-blueprint breakdown for an unobtained aspect', () => {
		render(RegionPanel, {
			dataset: equinoxRegion,
			regionId: 'uranus',
			tracker: createTracker(equinoxRegion.warframes),
		});
		const row = document.querySelector('[data-part="equinox:dayaspect"]') as HTMLElement;
		expect(row.textContent).toContain('Aspect 22.56%');
		expect(row.textContent).toContain('Neuroptics 25.81%');
		expect(row.textContent).toContain('Systems 25.81%');
	});
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: FAIL — the aspect row shows `Tyl Regor · 22.56%` and no breakdown (composite branch + FrameCard wiring not present yet).

- [ ] **Step 7: Add the composite branch to `assassinationSourceText`**

In `src/lib/panel/RegionPanel.svelte`, in `assassinationSourceText`, add a composite check immediately before the `const chance = …` line (after the `bp` block):

```ts
if (part.subDrops) return `${bossName} · guaranteed each kill`;
const chance = part.chance != null ? formatChance(part.chance) : undefined;
return [bossName, chance].filter(Boolean).join(' · ');
```

- [ ] **Step 8: Render AspectBreakdown in FrameCard**

In `src/lib/panel/FrameCard.svelte`:

1. Add the import in `<script>`:

```ts
import AspectBreakdown from './AspectBreakdown.svelte';
```

2. In the part-row markup, immediately after the source line
   `<div class="mt-0.5 text-xs text-wf-muted">{sourceText(part)}</div>`, add:

```svelte
						{#if part.subDrops}
							<AspectBreakdown {part} {owned} />
						{/if}
```

(`owned` is already in scope — `{@const owned = tracker.isOwned(part.id)}` at the top of the `{#each}`.)

- [ ] **Step 9: Run to verify it passes; validate components**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts src/lib/panel/AspectBreakdown.svelte.test.ts`
Expected: PASS.
Validate `RegionPanel.svelte` and `FrameCard.svelte` with the Svelte MCP tools (expect no issues).

- [ ] **Step 10: Full suite**

Run: `pnpm test:unit --run`
Expected: PASS — no regressions (existing FrameCard/RegionPanel tests unaffected; parts without `subDrops` render no breakdown).

- [ ] **Step 11: Commit**

```bash
git add src/lib/panel/AspectBreakdown.svelte src/lib/panel/AspectBreakdown.svelte.test.ts src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts src/lib/panel/FrameCard.svelte
git commit -m "feat(panel): collapsible Equinox aspect breakdown + guaranteed-per-kill label"
```

---

### Task 4: Regenerate dataset + full verification

**Files:**

- Modify (generated): `static/data/dataset.json`

**Interfaces:**

- Consumes: the updated `buildFrames` / `curated.ts` (Task 1).
- Produces: rebuilt `dataset.json` where Equinox's aspects carry `subDrops`.

- [ ] **Step 1: Regenerate the dataset**

Run: `pnpm data:build`
Expected: writes `static/data/dataset.json`; no errors.

- [ ] **Step 2: Spot-check Equinox**

Run:

```bash
node -e "const d=require('./static/data/dataset.json').data; const e=d.warframes.find(w=>w.id==='equinox'); for (const s of ['dayaspect','nightaspect']){const p=e.parts.find(x=>x.slot===s); console.log(s, 'chance='+p.chance, 'rotation='+p.rotation, 'subDrops='+JSON.stringify(p.subDrops));}"
```

Expected: each aspect has `chance=22.56`, `rotation=undefined`, and `subDrops` = three `{label, chance:25.81}` entries (Neuroptics/Chassis/Systems).

- [ ] **Step 3: Full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS.

- [ ] **Step 4: Format + lint**

Run: `pnpm format && pnpm lint`
Expected: no errors. `pnpm format` may reformat the regenerated JSON and the new `.svelte`/`.ts` files — include those in the commit.

- [ ] **Step 5: Commit**

```bash
git add static/data/dataset.json
git commit -m "chore(data): rebuild dataset with Equinox aspect subDrops"
```

---

## Notes for the implementer

- **`.superpowers/sdd/` is git-ignored scratch — never commit it.** Commit only the files each task's commit step lists.
- **Guardrail (repeated because it matters):** never set `rotation` on Equinox and never pass `avail` to an assassination `FrameCard`. The breakdown is informational only; there is no live availability for assassination rotation.
- **Stacked branch:** this work sits on `fix/exact-drop-rate`; `formatChance` already exists there (Task 2 moves it, not creates it). If `formatChance` is missing from `RegionPanel.svelte`, stop and report — the base branch is wrong.
