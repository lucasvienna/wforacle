# RegionPanel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `RegionPanel` so a 4-frame planet is scannable — frames become collapsible, progress-aware cards grouped by acquisition type in a full-width band, with resources moved to a compact side rail.

**Architecture:** Split the ~418-line `RegionPanel.svelte` monolith into a layout shell (`RegionPanel.svelte`), a pure grouping helper (`regionFrames.ts`), a collapsible frame card (`FrameCard.svelte`), and a resource rail (`ResourceRail.svelte`). Existing pure helpers (`resourcesForRegion`, `bestPhaseRec`, `partAvailability`, `nextActiveAt`, `formatCountdown`) are reused unchanged. Expand state is smart-auto (collapse done / expand rest), derived from tracker progress at card construction and reset per visit via region-prefixed `{#each}` keys.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Tailwind (`wf-*` tokens), Vitest + `@testing-library/svelte`, Playwright (e2e).

## Global Constraints

- Svelte 5 runes only (`$props`, `$state`, `$derived`, `$derived.by`) — match existing components. **When touching any `.svelte` file, use the `svelte:svelte-file-editor` agent / Svelte MCP tools per repo convention.**
- Preserve these DOM test hooks exactly: `data-part`, `data-owned` (part rows), `data-key` (key-boss hint), `data-zone-cycle` (zone cycle line). Add new hooks: `data-frame`, `data-expanded` (card root), `data-region-band`, `data-resource-rail`.
- Keep `RegionPanel`'s public props unchanged: `{ dataset, regionId, tracker, worldState?, now? }` — `src/routes/+page.svelte` must not need edits.
- Source-tag copy stays literal: `"{faction} · Assassination"` and `"{faction} · Free Roam"` (existing tests assert these substrings).
- No new dataset fields, no new dependencies, no persistence of expand state.
- Minimal deps / Svelte-native / oxc tooling (project preference). Lint gate: `pnpm lint:check`. Type gate: `pnpm check`.
- Commit after each task. Never use `--no-verify`.

---

### Task 1: Extract `regionFrames.ts` pure grouping helper

Lift the assassination-entry and open-world-zone derivations out of `RegionPanel` into a pure, unit-testable module. No UI or behavior change.

**Files:**

- Create: `src/lib/panel/regionFrames.ts`
- Create: `src/lib/panel/regionFrames.test.ts`
- Modify: `src/lib/panel/RegionPanel.svelte` (replace inline derivations with a call)

**Interfaces:**

- Produces:
  - `interface AssassinationEntry { node: StarNode; boss: Boss; frame: Warframe }`
  - `interface OpenWorldEntry { frame: Warframe; farm: OpenWorldFarm }`
  - `interface OpenWorldZone { node: StarNode; entries: OpenWorldEntry[] }`
  - `interface RegionFrames { assassination: AssassinationEntry[]; zones: OpenWorldZone[] }`
  - `function regionFrames(dataset: Dataset, regionId: string): RegionFrames`

- [ ] **Step 1: Write the failing test**

Create `src/lib/panel/regionFrames.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { regionFrames } from './regionFrames';
import type { Dataset } from '$lib/model/types';

function frame(id: string) {
	return { id, name: id, parts: [{ id: `${id}:bp`, frameId: id, slot: 'bp' as const }] };
}

const ds: Dataset = {
	regions: [],
	nodes: [
		// jupiter: TWO assassination nodes → two frames
		{
			id: 'themisto',
			regionId: 'jupiter',
			name: 'Themisto',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'aladv',
			frameId: 'valkyr',
		},
		{
			id: 'ropalolyst',
			regionId: 'jupiter',
			name: 'The Ropalolyst',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'ropa',
			frameId: 'wisp',
		},
		// earth: one free-roam zone (Plains) with two frames
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
	],
	bosses: [
		{ id: 'aladv', name: 'Alad V', nodeId: 'themisto', faction: 'Corpus' },
		{ id: 'ropa', name: 'Ropalolyst', nodeId: 'ropalolyst', faction: 'Corpus' },
	],
	warframes: [frame('valkyr'), frame('wisp'), frame('gara'), frame('revenant')],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'gara',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: 'X',
		},
		{
			frameId: 'revenant',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: 'Y',
		},
	],
} as unknown as Dataset;

describe('regionFrames', () => {
	it('returns one assassination entry per node in a multi-boss region (Jupiter)', () => {
		const r = regionFrames(ds, 'jupiter');
		expect(r.assassination.map((e) => e.frame.id)).toEqual(['valkyr', 'wisp']);
		expect(r.zones).toEqual([]);
	});

	it('groups multiple free-roam frames under a single zone node (Earth)', () => {
		const r = regionFrames(ds, 'earth');
		expect(r.assassination).toEqual([]);
		expect(r.zones).toHaveLength(1);
		expect(r.zones[0].node.name).toBe('Plains of Eidolon');
		expect(r.zones[0].entries.map((e) => e.frame.id)).toEqual(['gara', 'revenant']);
	});

	it('returns empty groups for a region with no frames', () => {
		const r = regionFrames(ds, 'mercury');
		expect(r.assassination).toEqual([]);
		expect(r.zones).toEqual([]);
	});

	it('drops assassination nodes whose boss or frame is missing', () => {
		const broken = { ...ds, bosses: [] } as unknown as Dataset;
		expect(regionFrames(broken, 'jupiter').assassination).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/regionFrames.test.ts`
Expected: FAIL — `Failed to resolve import "./regionFrames"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/panel/regionFrames.ts`:

```ts
import type { Boss, Dataset, OpenWorldFarm, StarNode, Warframe } from '$lib/model/types';

export interface AssassinationEntry {
	node: StarNode;
	boss: Boss;
	frame: Warframe;
}

export interface OpenWorldEntry {
	frame: Warframe;
	farm: OpenWorldFarm;
}

export interface OpenWorldZone {
	node: StarNode;
	entries: OpenWorldEntry[];
}

export interface RegionFrames {
	assassination: AssassinationEntry[];
	zones: OpenWorldZone[];
}

// Groups a region's farmable frames by acquisition type. A region can have
// MULTIPLE assassination nodes (e.g. Jupiter: Themisto→Valkyr, The
// Ropalolyst→Wisp), and a single open-world zone node can yield several frames.
export function regionFrames(dataset: Dataset, regionId: string): RegionFrames {
	const assassination = dataset.nodes
		.filter((n) => n.regionId === regionId && n.isAssassination && n.frameId)
		.map((node) => ({
			node,
			boss: dataset.bosses.find((b) => b.id === node.bossId),
			frame: dataset.warframes.find((w) => w.id === node.frameId),
		}))
		.filter((e): e is AssassinationEntry => !!e.boss && !!e.frame);

	const byNode = new Map<string, OpenWorldZone>();
	for (const farm of dataset.openWorldFarms ?? []) {
		if (farm.regionId !== regionId) continue;
		const node = dataset.nodes.find((n) => n.id === farm.nodeId);
		const frame = dataset.warframes.find((w) => w.id === farm.frameId);
		if (!node || !frame) continue;
		const zone = byNode.get(node.id) ?? { node, entries: [] };
		zone.entries.push({ frame, farm });
		byNode.set(node.id, zone);
	}

	return { assassination, zones: [...byNode.values()] };
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/regionFrames.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Refactor `RegionPanel.svelte` to use the helper**

In `src/lib/panel/RegionPanel.svelte`:

Replace the import block's model-types line and add the helper import. Change:

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

to:

```ts
import type { Dataset, OpenWorldFarm, Warframe, WarframePart } from '$lib/model/types';
import { regionFrames } from './regionFrames';
```

Delete the local `FrameEntry` type + `entries` derivation (currently lines ~67–77) and the `OWEntry`/`OWZone` types + `openWorldZones` derivation (currently lines ~86–102). Replace both with a single derivation next to the existing `resources` derivation:

```ts
let frames = $derived(regionFrames(dataset, regionId));
```

In the template, change the assassination loop header from:

```svelte
			{#if entries.length > 0 || openWorldZones.length > 0}
```

to:

```svelte
			{#if frames.assassination.length > 0 || frames.zones.length > 0}
```

and:

```svelte
				{#each entries as { node, boss, frame } (node.id)}
```

to:

```svelte
				{#each frames.assassination as { node, boss, frame } (node.id)}
```

and:

```svelte
				{#each openWorldZones as zone (zone.node.id)}
```

to:

```svelte
				{#each frames.zones as zone (zone.node.id)}
```

- [ ] **Step 6: Run the full unit suite to verify no regression**

Run: `pnpm test:unit --run`
Expected: PASS — every existing `RegionPanel.svelte.test.ts` case still green (behavior unchanged), plus the 4 new `regionFrames` tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/panel/regionFrames.ts src/lib/panel/regionFrames.test.ts src/lib/panel/RegionPanel.svelte
git commit -m "refactor(panel): extract pure regionFrames grouping helper"
```

---

### Task 2: Extract `ResourceRail.svelte`

Move the resource `<section>` verbatim into its own component so it can become the side rail later and be tested in isolation.

**Files:**

- Create: `src/lib/panel/ResourceRail.svelte`
- Create: `src/lib/panel/ResourceRail.svelte.test.ts`
- Modify: `src/lib/panel/RegionPanel.svelte` (replace the right `<section>` with `<ResourceRail>`)

**Interfaces:**

- Consumes: `resourcesForRegion` (from Task-independent existing helper), `bestPhaseRec`.
- Produces: `ResourceRail` component with props `{ resources: Resource[]; regionId: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/panel/ResourceRail.svelte.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ResourceRail from './ResourceRail.svelte';
import type { Resource } from '$lib/model/types';

const resources: Resource[] = [
	{
		id: 'alloyplate',
		name: 'Alloy Plate',
		image: 'AlloyPlate.png',
		regionIds: ['venus'],
		recommendations: [
			{
				phase: 'early',
				nodeLabel: 'Venus — Tessera',
				regionId: 'venus',
				boostersApply: false,
				note: '',
				source: '',
				lastVerified: '2026-07-05',
			},
			{
				phase: 'late',
				nodeLabel: 'Uranus — Assur',
				regionId: 'uranus',
				boostersApply: true,
				note: '',
				source: '',
				lastVerified: '2026-07-05',
			},
		],
	},
];

describe('ResourceRail', () => {
	it('badges the phase whose best node is on this region, muting the other', () => {
		render(ResourceRail, { resources, regionId: 'venus' });
		expect(screen.getByText('Alloy Plate')).toBeInTheDocument();
		expect(screen.getByText('⚡ early best')).toBeInTheDocument();
		expect(screen.queryByText('💀 late best')).toBeNull();
		expect(screen.getByText(/⚡ Early: Venus — Tessera/)).toBeInTheDocument();
		expect(screen.getByText(/💀 Late: Uranus — Assur/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /farming/i })).toHaveAttribute(
			'href',
			'/guides/alloyplate',
		);
	});

	it('renders an empty state when there are no resources', () => {
		render(ResourceRail, { resources: [], regionId: 'venus' });
		expect(screen.getByText('No notable resources.')).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/ResourceRail.svelte.test.ts`
Expected: FAIL — cannot resolve `./ResourceRail.svelte`.

- [ ] **Step 3: Create the component (markup lifted verbatim from RegionPanel's right section)**

Create `src/lib/panel/ResourceRail.svelte`:

```svelte
<script lang="ts">
	import type { Resource } from '$lib/model/types';
	import { bestPhaseRec } from '$lib/model/resources';
	import { base } from '$app/paths';

	let { resources, regionId }: { resources: Resource[]; regionId: string } = $props();
</script>

<section
	class="rounded-xl border border-wf-edge bg-wf-panel p-5 lg:sticky lg:top-4"
	data-resource-rail
>
	<h2 class="text-lg font-semibold text-wf-gold">Resources</h2>
	<p class="mt-0.5 mb-4 text-xs text-wf-muted">
		Informational · best farm spots badged by game phase
	</p>
	{#if resources.length > 0}
		<ul class="space-y-2">
			{#each resources as r (r.id)}
				{@const early = bestPhaseRec(r, 'early')}
				{@const late = bestPhaseRec(r, 'late')}
				{@const earlyHere = !!early && early.regionId === regionId}
				{@const lateHere = !!late && late.regionId === regionId}
				<li class="flex items-start gap-3 rounded-lg border border-wf-edge px-3 py-2">
					<img
						src="{base}/resources/{r.id}.webp"
						alt=""
						class="mt-0.5 h-8 w-8 shrink-0 rounded"
						loading="lazy"
					/>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm font-medium text-slate-200">{r.name}</span>
							{#if earlyHere}
								<span
									class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
								>
									⚡ early best
								</span>
							{/if}
							{#if lateHere}
								<span
									class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
								>
									💀 late best
								</span>
							{/if}
						</div>
						{#if early}
							<p class="mt-0.5 text-xs {earlyHere ? 'text-emerald-300' : 'text-wf-muted'}">
								⚡ Early: {early.nodeLabel}
							</p>
						{/if}
						{#if late}
							<p class="text-xs {lateHere ? 'text-amber-300' : 'text-wf-muted'}">
								💀 Late: {late.nodeLabel}
							</p>
						{/if}
					</div>
					{#if r.recommendations.length > 0}
						<a
							href="{base}/guides/{r.id}"
							class="mt-0.5 shrink-0 self-start text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
						>
							farming ▸
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-wf-muted">No notable resources.</p>
	{/if}
</section>
```

- [ ] **Step 4: Run the rail test to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/ResourceRail.svelte.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Use `ResourceRail` inside `RegionPanel`**

In `src/lib/panel/RegionPanel.svelte`:

Add to the script imports:

```ts
import ResourceRail from './ResourceRail.svelte';
```

Remove the now-unused `bestPhaseRec` and `base` imports (they moved into `ResourceRail`) — change:

```ts
import { resourcesForRegion, bestPhaseRec } from '$lib/model/resources';
import { base } from '$app/paths';
```

to:

```ts
import { resourcesForRegion } from '$lib/model/resources';
```

Replace the entire right resource `<section>` (currently the block starting `<section ...>` with `<h2 ...>Resources on {region?.name}</h2>` through its closing `</section>`) with:

```svelte
	<ResourceRail {resources} {regionId} />
```

- [ ] **Step 6: Run the full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS — the existing RegionPanel resource test (renders "Alloy Plate", phase badges, guide link) still passes through the extracted rail; all other cases green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/panel/ResourceRail.svelte src/lib/panel/ResourceRail.svelte.test.ts src/lib/panel/RegionPanel.svelte
git commit -m "refactor(panel): extract ResourceRail component"
```

---

### Task 3: Build `FrameCard.svelte` (collapsible, progress-aware)

A self-contained frame card: header (avatar · name · tag · progress bar · N/M · chevron) + subline, with an expandable part checklist. Smart-auto expand comes from a `defaultExpanded` prop captured once at construction. Tested in isolation; not yet wired into `RegionPanel`.

**Files:**

- Create: `src/lib/panel/FrameCard.svelte`
- Create: `src/lib/panel/FrameCard.svelte.test.ts`

**Interfaces:**

- Consumes: `Tracker` (`frameCount`, `isOwned`, `togglePart`, `toggleFrame`).
- Produces: `FrameCard` component with props:

  ```ts
  {
    frame: Warframe;
    tracker: Tracker;
    subLine: string;
    faction: string;
    kindLabel: string;            // 'Assassination' | 'Free Roam'
    isKey?: boolean;              // renders a '· key' span with data-key
    defaultExpanded?: boolean;    // captured once into $state; default true
    sourceText: (part: WarframePart) => string;
    avail?: (part: WarframePart) => { cls: string; text: string } | null;
    summary?: { cls: string; text: string } | null; // collapsed-state farm cue
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/panel/FrameCard.svelte.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import FrameCard from './FrameCard.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe, WarframePart } from '$lib/model/types';

const frame: Warframe = {
	id: 'rhino',
	name: 'Rhino',
	parts: [
		{ id: 'rhino:bp', frameId: 'rhino', slot: 'bp' },
		{ id: 'rhino:neuroptics', frameId: 'rhino', slot: 'neuroptics' },
		{ id: 'rhino:chassis', frameId: 'rhino', slot: 'chassis' },
		{ id: 'rhino:systems', frameId: 'rhino', slot: 'systems' },
	],
};

const sourceText = (p: WarframePart) => (p.slot === 'bp' ? 'Market' : 'Jackal');

function props(tracker = createTracker([frame]), overrides = {}) {
	return {
		frame,
		tracker,
		subLine: 'Fossa · Boss: Jackal',
		faction: 'Corpus',
		kindLabel: 'Assassination',
		sourceText,
		...overrides,
	};
}

describe('FrameCard', () => {
	it('starts expanded when defaultExpanded is true and shows the checklist + N/M', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute('data-expanded', 'true');
		expect(document.querySelector('[data-part="rhino:chassis"]')).toBeInTheDocument();
		expect(screen.getByText('0/4')).toBeInTheDocument();
		expect(screen.getByText(/Corpus · Assassination/)).toBeInTheDocument();
	});

	it('starts collapsed and shows ✓ done when the frame is complete', () => {
		const tracker = createTracker([frame]);
		tracker.toggleFrame('rhino'); // own everything
		render(FrameCard, props(tracker, { defaultExpanded: false }));
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute(
			'data-expanded',
			'false',
		);
		expect(screen.getByText('✓ done')).toBeInTheDocument();
		expect(document.querySelector('[data-part="rhino:chassis"]')).toBeNull();
	});

	it('does not auto-collapse when the last part is checked while open', async () => {
		const tracker = createTracker([frame]);
		for (const id of ['rhino:bp', 'rhino:neuroptics', 'rhino:chassis']) tracker.togglePart(id);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		tracker.togglePart('rhino:systems'); // now complete
		await Promise.resolve();
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute('data-expanded', 'true');
	});

	it('toggles a part via row click', () => {
		const tracker = createTracker([frame]);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		(document.querySelector('[data-part="rhino:chassis"]') as HTMLElement).click();
		expect(tracker.isOwned('rhino:chassis')).toBe(true);
	});

	it('toggles the whole frame via the toggle button', () => {
		const tracker = createTracker([frame]);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		screen.getByRole('button', { name: /toggle whole frame/i }).click();
		expect(tracker.isOwned('rhino:systems')).toBe(true);
	});

	it('collapses when the header is clicked', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		const header = document.querySelector('[data-frame="rhino"] button') as HTMLElement;
		header.click();
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute(
			'data-expanded',
			'false',
		);
	});

	it('shows the collapsed farm-cue summary only when collapsed', () => {
		render(
			FrameCard,
			props(undefined, {
				defaultExpanded: false,
				summary: { cls: 'text-emerald-300', text: '● up now' },
			}),
		);
		expect(screen.getByText('● up now')).toBeInTheDocument();
	});

	it('renders a · key hint when isKey is set', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true, isKey: true }));
		expect(document.querySelector('[data-key]')).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/panel/FrameCard.svelte.test.ts`
Expected: FAIL — cannot resolve `./FrameCard.svelte`.

- [ ] **Step 3: Create the component**

Create `src/lib/panel/FrameCard.svelte`:

```svelte
<script lang="ts">
	import type { Warframe, WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';

	let {
		frame,
		tracker,
		subLine,
		faction,
		kindLabel,
		isKey = false,
		defaultExpanded = true,
		sourceText,
		avail,
		summary = null,
	}: {
		frame: Warframe;
		tracker: Tracker;
		subLine: string;
		faction: string;
		kindLabel: string;
		isKey?: boolean;
		defaultExpanded?: boolean;
		sourceText: (part: WarframePart) => string;
		avail?: (part: WarframePart) => { cls: string; text: string } | null;
		summary?: { cls: string; text: string } | null;
	} = $props();

	const SLOT_LABEL = {
		bp: 'Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
		dayaspect: 'Day Aspect',
		nightaspect: 'Night Aspect',
	} as const;

	// Equinox's day/night aspect slots get a decorative sun/moon glyph prefix.
	const SLOT_ICON: Partial<Record<string, string>> = {
		dayaspect: '☀',
		nightaspect: '☾',
	};

	// Faction accent for the acquisition tag. Extend as new factions appear.
	const FACTION_TAG: Record<string, string> = {
		Corpus: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		Grineer: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
		Infested: 'border-lime-500/40 bg-lime-500/10 text-lime-300',
	};

	// Captured ONCE at construction (smart-auto default). Seeding $state from the
	// prop — rather than a $derived of tracker.frameCount — is deliberate: checking
	// the last part must not snap an open card shut mid-interaction. A fresh initial
	// state per visit comes from region-prefixed {#each} keys in RegionPanel.
	let expanded = $state(defaultExpanded);
	let count = $derived(tracker.frameCount(frame.id));
	let done = $derived(count.total > 0 && count.owned === count.total);
	let pct = $derived(count.total ? Math.round((count.owned / count.total) * 100) : 0);
</script>

<div
	data-frame={frame.id}
	data-expanded={expanded}
	class="rounded-xl border border-wf-edge bg-wf-panel p-4 {done ? 'opacity-60' : ''}"
>
	<button
		type="button"
		class="flex w-full items-center gap-3 text-left"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
	>
		<div
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-wf-edge bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
			aria-hidden="true"
		>
			{frame.name[0]}
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="truncate font-semibold text-slate-100">{frame.name}</span>
				<span
					class="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[
						faction
					] ?? 'border-wf-edge text-wf-muted'}"
				>
					{faction} · {kindLabel}{#if isKey}<span data-key class="text-wf-muted"> · key</span>{/if}
				</span>
			</div>
			<div class="mt-1 flex items-center gap-2">
				<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-wf-edge">
					<div
						class="h-full rounded-full {done ? 'bg-emerald-400' : 'bg-wf-cyan'}"
						style="width: {pct}%"
					></div>
				</div>
				<span class="shrink-0 text-xs {done ? 'text-emerald-400' : 'text-wf-muted'}">
					{#if done}✓ done{:else}{count.owned}/{count.total}{/if}
				</span>
				<span class="shrink-0 text-wf-muted" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
			</div>
			<div class="mt-0.5 text-xs text-wf-muted">{subLine}</div>
		</div>
	</button>

	{#if expanded}
		{#if frame.parts.some((p) => p.slot === 'dayaspect' || p.slot === 'nightaspect')}
			<p class="mt-3 mb-2 text-xs text-wf-muted">Assembled from its Day and Night aspects.</p>
		{/if}
		<div class="mt-3 space-y-1">
			{#each frame.parts as part (part.id)}
				{@const owned = tracker.isOwned(part.id)}
				<div
					data-part={part.id}
					data-owned={owned}
					role="button"
					tabindex="0"
					class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {owned
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
						class="flex h-4 w-4 items-center justify-center rounded border text-[11px] {owned
							? 'border-emerald-400 bg-emerald-400 text-slate-950'
							: 'border-wf-edge text-transparent'}"
					>
						✓
					</span>
					<span class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}">
						{#if SLOT_ICON[part.slot]}<span aria-hidden="true" class="mr-1 text-wf-gold"
								>{SLOT_ICON[part.slot]}</span
							>{/if}{SLOT_LABEL[part.slot]}
					</span>
					<span class="ml-auto text-xs text-wf-muted">{sourceText(part)}</span>
					{#if avail}
						{@const chip = avail(part)}
						{#if chip}
							<span class="ml-2 shrink-0 text-[11px] {chip.cls}">{chip.text}</span>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
		<button
			class="mt-3 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
			onclick={() => tracker.toggleFrame(frame.id)}
		>
			✓ Toggle whole frame
		</button>
	{:else if summary}
		<div class="mt-2 text-[11px] {summary.cls}">{summary.text}</div>
	{/if}
</div>
```

- [ ] **Step 4: Run the FrameCard test to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/FrameCard.svelte.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Validate the Svelte file**

Use the Svelte MCP `svelte-autofixer` on `FrameCard.svelte` and apply any fixes it reports; re-run Step 4 if it changes anything.

- [ ] **Step 6: Commit**

```bash
git add src/lib/panel/FrameCard.svelte src/lib/panel/FrameCard.svelte.test.ts
git commit -m "feat(panel): collapsible progress-aware FrameCard component"
```

---

### Task 4: Rewrite `RegionPanel` into the band + rail layout

Replace the old 2-column `md:grid-cols-2` layout and the internal `frameCard` snippet with the frames band (grouped `Assassination` / `Free Roam` sections of `FrameCard`s) plus the `ResourceRail`. Move the zone cycle line to a per-zone subheader, add region-prefixed keys, broaden the empty-state copy, and compute the collapsed farm-cue summary.

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte` (full template rewrite; script trims the snippet + adds `defaultExpanded`/`owSummary` helpers)
- Modify: `src/lib/panel/RegionPanel.svelte.test.ts` (update empty-copy assertion; add group-header + re-key tests)

**Interfaces:**

- Consumes: `regionFrames` (Task 1), `FrameCard` (Task 3), `ResourceRail` (Task 2), existing `partAvailability` / `nextActiveAt` / `formatCountdown`.
- Produces: unchanged public props `{ dataset, regionId, tracker, worldState?, now? }`.

- [ ] **Step 1: Update / add the failing tests**

In `src/lib/panel/RegionPanel.svelte.test.ts`:

(a) Change the empty-state assertion. Find:

```ts
it('shows an empty state for a region with no assassination frame', () => {
	const tracker = createTracker(seed.warframes);
	render(RegionPanel, { dataset: seed, regionId: 'mercury', tracker });
	expect(screen.getByText(/no assassination frame/i)).toBeInTheDocument();
});
```

Replace the assertion line with:

```ts
expect(screen.getByText(/no farmable frames/i)).toBeInTheDocument();
```

(b) Append these new cases inside the main `describe('RegionPanel', ...)` block:

```ts
it('shows only the Assassination group header for an assassination-only region', () => {
	const tracker = createTracker(seed.warframes);
	render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
	expect(screen.getByRole('heading', { name: 'Assassination' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Free Roam' })).toBeNull();
});

it('shows only the Free Roam group header for an open-world-only region', () => {
	const tracker = createTracker(openWorld.warframes);
	render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
	expect(screen.getByRole('heading', { name: 'Free Roam' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Assassination' })).toBeNull();
});

it('re-derives expand state when the region changes (region-prefixed keys)', async () => {
	const tracker = createTracker(openWorld.warframes);
	const { rerender } = render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
	// Caliban exists on both earth and venus; collapse it on earth...
	(document.querySelector('[data-frame="caliban"] button') as HTMLElement).click();
	expect(document.querySelector('[data-frame="caliban"]')).toHaveAttribute(
		'data-expanded',
		'false',
	);
	// ...switching regions must mount a FRESH card (incomplete → expanded again).
	await rerender({ dataset: openWorld, regionId: 'venus', tracker });
	expect(document.querySelector('[data-frame="caliban"]')).toHaveAttribute('data-expanded', 'true');
});
```

Also delete the now-obsolete layout test (the band/rail root keeps `grid items-start`, but assert the new hooks instead). Find and replace:

```ts
it('lays out the frame/resources grid with items-start (no forced equal-height stretch)', () => {
	const tracker = createTracker(seed.warframes);
	render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
	expect(document.querySelector('.grid.items-start')).toBeInTheDocument();
});
```

with:

```ts
it('lays out a frames band alongside the resource rail', () => {
	const tracker = createTracker(seed.warframes);
	render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
	expect(document.querySelector('[data-region-band]')).toBeInTheDocument();
	expect(document.querySelector('[data-resource-rail]')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the updated tests to verify they fail**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: FAIL — new group-header/re-key/band assertions fail against the old markup; empty-copy assertion fails until the component copy changes.

- [ ] **Step 3: Rewrite `RegionPanel.svelte`**

Replace the entire contents of `src/lib/panel/RegionPanel.svelte` with:

```svelte
<script lang="ts">
	import type { Dataset, OpenWorldFarm, Warframe, WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { resourcesForRegion } from '$lib/model/resources';
	import { regionFrames } from './regionFrames';
	import FrameCard from './FrameCard.svelte';
	import ResourceRail from './ResourceRail.svelte';
	import type { WorldState } from '$lib/worldstate/types';
	import { partAvailability, nextActiveAt, formatCountdown } from '$lib/worldstate/availability';

	let {
		dataset,
		regionId,
		tracker,
		worldState = null,
		now = Date.now(),
	}: {
		dataset: Dataset;
		regionId: string;
		tracker: Tracker;
		worldState?: WorldState | null;
		now?: number;
	} = $props();

	// Bosses that require crafting a key item before the node can be played
	// (Mutalist Alad V, Jordas Golem). Presentational hint only — not a spoiler gate.
	const KEY_BOSSES = new Set(['Mutalist Alad V', 'Jordas Golem']);

	let region = $derived(dataset.regions.find((r) => r.id === regionId));
	let resources = $derived(resourcesForRegion(dataset, regionId));
	let frames = $derived(regionFrames(dataset, regionId));

	// The main blueprint is bought from the Market; components drop from the boss.
	function sourceLabel(slot: string, bossName: string): string {
		return slot === 'bp' ? 'Market' : bossName;
	}

	// Source label for an open-world part row: bp shows its bpSource; components
	// show "{source} · {tier} · Rot {rotation} · ~{chance}%", omitting tier/rotation
	// for non-bounty sources (Exploiter Orb) that carry neither.
	function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
		if (part.slot === 'bp') return farm.bpSource;
		const rot =
			part.rotation === 'any'
				? 'any rot'
				: part.rotation
					? `Rot ${part.rotation}`
					: undefined;
		const chance = part.chance != null ? `~${Math.round(part.chance)}%` : undefined;
		return [farm.componentSource, part.bountyTier, rot, chance].filter(Boolean).join(' · ');
	}

	const ZONE_CYCLE: Record<string, 'cetus' | 'vallis' | 'cambion'> = {
		'Plains of Eidolon': 'cetus',
		'Orb Vallis': 'vallis',
		'Cambion Drift': 'cambion',
	};
	const CYCLE_GLYPH: Record<string, string> = {
		day: '☀',
		night: '🌙',
		warm: '🔥',
		cold: '❄',
		fass: '🟠',
		vome: '🔵',
	};

	function zoneCycleLine(nodeName: string): string | null {
		if (!worldState) return null;
		const key = ZONE_CYCLE[nodeName];
		if (!key) return null;
		const cyc = worldState[key];
		if (!cyc.expiry) return null;
		return `${CYCLE_GLYPH[cyc.state] ?? ''} ${cyc.state} · ${formatCountdown(new Date(cyc.expiry).getTime() - now)}`;
	}

	// Per-part availability chip for an open-world component row. Null → render
	// nothing (bp slot, unknown rotation, or no live data).
	function owAvailabilityChip(part: WarframePart): { cls: string; text: string } | null {
		if (!worldState || part.slot === 'bp') return null;
		const rot = worldState.rotation;
		const a = partAvailability(part.rotation, rot.letter);
		if (a === 'available') {
			const resets = rot.expiry
				? ` · resets ${formatCountdown(new Date(rot.expiry).getTime() - now)}`
				: '';
			return { cls: 'text-emerald-300', text: `● up now${resets}` };
		}
		if (a === 'always') return { cls: 'text-emerald-300', text: '● always available' };
		if (a === 'unavailable') {
			const next = nextActiveAt(part.rotation, rot.letter, rot.expiry);
			const when = next ? ` · up in ${formatCountdown(next.getTime() - now)}` : '';
			return { cls: 'text-wf-muted', text: `○ Rot ${part.rotation}${when}` };
		}
		return null;
	}

	// Collapsed-state farm cue for a free-roam frame: is any still-needed component
	// available on the current rotation? Null when there's no live data or nothing
	// left to farm (a completed frame shows its ✓ instead).
	function owSummary(frame: Warframe): { cls: string; text: string } | null {
		if (!worldState) return null;
		const letter = worldState.rotation.letter;
		const needed = frame.parts.filter((p) => p.slot !== 'bp' && !tracker.isOwned(p.id));
		if (needed.length === 0) return null;
		const upNow = needed.some((p) => {
			const a = partAvailability(p.rotation, letter);
			return a === 'available' || a === 'always';
		});
		return upNow
			? { cls: 'text-emerald-300', text: '● up now' }
			: { cls: 'text-wf-muted', text: '○ not this rotation' };
	}

	// Smart-auto: expand a frame unless it's already fully owned. Read at card
	// construction only (FrameCard seeds $state from it).
	function defaultExpanded(frameId: string): boolean {
		const c = tracker.frameCount(frameId);
		return c.owned < c.total;
	}
</script>

<div class="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
	<div data-region-band>
		<h2 class="mb-4 text-lg font-semibold text-wf-gold">{region?.name}</h2>
		{#if frames.assassination.length > 0 || frames.zones.length > 0}
			<div class="space-y-6">
				{#if frames.assassination.length > 0}
					<section>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase">
							Assassination
						</h3>
						<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{#each frames.assassination as { node, boss, frame } (regionId + ':' + frame.id)}
								<div class="sm:col-span-2">
									<FrameCard
										{frame}
										{tracker}
										subLine={`${node.name} · Boss: ${boss.name}`}
										faction={node.faction}
										kindLabel="Assassination"
										isKey={KEY_BOSSES.has(boss.name)}
										defaultExpanded={defaultExpanded(frame.id)}
										sourceText={(part) => sourceLabel(part.slot, boss.name)}
									/>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				{#if frames.zones.length > 0}
					<section>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase">
							Free Roam
						</h3>
						<div class="space-y-5">
							{#each frames.zones as zone (zone.node.id)}
								{@const line = zoneCycleLine(zone.node.name)}
								<div>
									<div class="mb-2 flex items-baseline justify-between gap-3">
										<h4 class="text-sm font-medium text-slate-200">{zone.node.name}</h4>
										{#if line}
											<span class="text-xs text-wf-muted" data-zone-cycle>{line}</span>
										{/if}
									</div>
									<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{#each zone.entries as { frame, farm } (regionId + ':' + frame.id)}
											<FrameCard
												{frame}
												{tracker}
												subLine={`Blueprint: ${farm.bpSource}`}
												faction={zone.node.faction}
												kindLabel="Free Roam"
												defaultExpanded={defaultExpanded(frame.id)}
												sourceText={(part) => owSourceText(part, farm)}
												avail={owAvailabilityChip}
												summary={owSummary(frame)}
											/>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-wf-muted">No farmable frames here yet.</p>
		{/if}
	</div>

	<ResourceRail {resources} {regionId} />
</div>
```

- [ ] **Step 4: Run the RegionPanel test file to verify it passes**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: PASS — including the world-state overlay cases (fixtures are 0-owned → cards expanded → part rows + chips render; the cycle line renders in the new zone subheader).

- [ ] **Step 5: Validate the Svelte file**

Run the Svelte MCP `svelte-autofixer` on `RegionPanel.svelte`; apply fixes and re-run Step 4 if anything changes.

- [ ] **Step 6: Run the full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS — all panel tests plus the rest of the suite.

- [ ] **Step 7: Commit**

```bash
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(panel): frames band + resource rail layout for RegionPanel"
```

---

### Task 5: Verification & polish

Confirm the whole thing type-checks, lints, renders correctly in a real browser, and passes e2e. Apply visual polish within the existing token palette if the live view reveals rough edges.

**Files:**

- Modify (only if a gate fails): the file the failure points to.

- [ ] **Step 1: Typecheck**

Run: `pnpm check`
Expected: 0 errors, 0 warnings. Fix any surfaced type errors in the offending file and re-run.

- [ ] **Step 2: Lint (CI-equivalent gate)**

Run: `pnpm lint:check`
Expected: no oxlint findings. Fix in place and re-run.

- [ ] **Step 3: Full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS (all files, including `regionFrames`, `FrameCard`, `ResourceRail`, `RegionPanel`).

- [ ] **Step 4: Drive the real app (use the `verify` skill)**

Start the dev server (`pnpm dev`) and open the app. On a 4-frame planet (**Earth** or **Venus**), confirm:

- frames render as a wrapped grid (not one tall column), grouped under **Assassination** / **Free Roam**;
- fully-owned frames start collapsed + dimmed with `✓ done`; incomplete frames start expanded;
- each card shows an `N/M` count + progress bar without expanding;
- clicking a header toggles the checklist; toggling parts updates the bar;
- the resource rail sits alongside on wide screens and drops below on narrow;
- switching planets re-derives expand state from ownership.
  Take a screenshot of Earth for the record.

- [ ] **Step 5: e2e sanity**

Run: `pnpm test:e2e`
Expected: PASS unchanged (fresh state → incomplete frames stay expanded; `data-part`/`data-key`/resource assertions intact). If Playwright browsers aren't installed locally, note it — CI covers this gate.

- [ ] **Step 6: Optional visual polish**

If Step 4 revealed rough spacing/contrast, refine `FrameCard.svelte` / `RegionPanel.svelte` using the `ui-ux-pro-max:design` skill as reference, staying within `wf-*` tokens (no new colours). Re-run Steps 1–3 after any change. Commit separately:

```bash
git add -A
git commit -m "style(panel): polish frame card + band spacing"
```

- [ ] **Step 7: Final commit (if Step 6 skipped, this is a no-op) and summary**

Confirm `git status` is clean and the branch `feat/region-panel-redesign` holds the full series. The work is ready for a PR against `main`.

---

## Self-Review

**Spec coverage:**

- Band + rail layout → Task 4 (`lg:grid-cols-[1fr_20rem]`, `data-region-band` / `data-resource-rail`). ✓
- `RegionPanel` / `FrameCard` / `ResourceRail` / `regionFrames.ts` split → Tasks 1–4. ✓
- Grouping headers (Assassination / Free Roam), per-zone cycle subheader → Task 4. ✓
- Collapsible cards, smart-auto (collapse done / expand rest), reset-per-visit via region-prefixed keys → Task 3 (`$state(defaultExpanded)`) + Task 4 (keys, `defaultExpanded()`). ✓
- Progress bar + `N/M` + dimmed `✓ done` → Task 3. ✓
- "Last part checked while open must not auto-collapse" → Task 3 test + `$state` seeding rationale. ✓
- Collapsed farm-cue summary → Task 3 (`summary` prop) + Task 4 (`owSummary`). ✓
- Preserved hooks (`data-part`/`data-owned`/`data-key`/`data-zone-cycle`) + new hooks → Global Constraints, Tasks 3–4. ✓
- Empty/degraded copy ("No farmable frames here yet"; availability/cycle omit without `worldState`) → Task 4. ✓
- Reuse existing helpers unchanged → Tasks 2 & 4 imports. ✓
- Public props unchanged / no `+page.svelte` edit → Global Constraints. ✓
- Test plan (`regionFrames`, `FrameCard`, `ResourceRail`, reworked `RegionPanel`) → Tasks 1–4. ✓

**Deliberate deviation from spec:** the collapsed availability summary is rendered **only** for a manually-collapsed _incomplete_ free-roam frame — smart-auto collapses only _completed_ frames, which have nothing left to farm, so their cue is `null`. The zone cycle subheader carries the "good time to farm?" signal at the group level. This keeps the summary from being dead UI without dropping the spec's intent.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step shows full code; every run step shows an exact command + expected result.

**Type consistency:** `regionFrames()` returns `{ assassination, zones }` (Task 1) consumed identically in Task 4. `FrameCard` prop names (`defaultExpanded`, `sourceText`, `avail`, `summary`, `kindLabel`, `isKey`) match between Task 3 definition and Task 4 call sites. `tracker.frameCount` → `{ owned, total }` used consistently in `FrameCard` and `defaultExpanded()`.
