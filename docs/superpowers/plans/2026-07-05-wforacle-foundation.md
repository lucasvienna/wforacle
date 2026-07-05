# wforacle Foundation (Plan 1 of 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a usable SvelteKit app that renders the Warframe Star Chart as an interactive SVG ring and lets the user click-to-track Warframe parts, persisted locally to IndexedDB.

**Architecture:** SvelteKit (static/prerendered, Cloudflare adapter) with Svelte 5 runes. A small hand-authored *seed* dataset (real subset: Earth/Venus/Mars + their Assassination frames) stands in for the full WFCD pipeline (Plan 2), so this plan produces a working vertical slice. Tracking state is a runes-backed store provided via context, hydrated from and written through to IndexedDB (`idb`) in the browser only. The Star Chart is pure SVG generated from region data via an ellipse geometry helper.

**Tech Stack:** SvelteKit, Svelte 5 (runes), TypeScript, Tailwind CSS, `idb`, Vitest (unit), Playwright (e2e), `@sveltejs/adapter-cloudflare`.

## Global Constraints

- **Svelte 5 runes only** — no legacy `export let` / stores where a rune fits. Shared reactive state via `setContext`/`getContext`, never a module-level `$state` singleton (SSR-safe).
- **Browser-only persistence** — all IndexedDB access guarded by `browser` from `$app/environment`; never touch IndexedDB during SSR/prerender.
- **Every route prerenders** — `export const prerender = true` at the root; the app is static output for Cloudflare Pages.
- **Trackable atom = `WarframePart.id`**, shaped `` `${frameId}:${slot}` `` where slot ∈ `bp | neuroptics | chassis | systems`.
- **TDD** — write the failing test first for every logic unit; commit after each green task.
- **Package manager: `pnpm`.**
- Node ≥ 20.

---

### Task 1: Scaffold SvelteKit project

**Files:**
- Create: whole project skeleton (`package.json`, `svelte.config.js`, `vite.config.ts`, `src/routes/+layout.ts`, `src/routes/+page.svelte`, `tsconfig.json`, `tailwind.config.*`, `src/app.css`)
- Test: `src/routes/page.svelte.test.ts` (smoke)

**Interfaces:**
- Produces: a running dev server and a passing test harness (Vitest + Playwright) that later tasks extend.

- [ ] **Step 1: Scaffold with the Svelte CLI**

Run (non-interactive; accepts prompts for TypeScript, Vitest, Playwright, Tailwind):
```bash
pnpm dlx sv create . --template minimal --types ts --no-install
pnpm add -D @sveltejs/adapter-cloudflare @testing-library/svelte @testing-library/jest-dom jsdom vitest @playwright/test tailwindcss @tailwindcss/vite
pnpm add idb
pnpm install
```
If `sv create .` refuses a non-empty dir, scaffold in a temp dir and move files in (keep existing `.git`, `.gitignore`, `docs/`).

- [ ] **Step 2: Configure the Cloudflare adapter + prerender**

`svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

`src/routes/+layout.ts`:
```ts
export const prerender = true;
```

- [ ] **Step 3: Wire Tailwind**

`src/app.css`:
```css
@import 'tailwindcss';
```
`vite.config.ts` — add the Tailwind plugin alongside SvelteKit and Vitest config:
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: { environment: 'jsdom', setupFiles: ['./vitest-setup.ts'] }
});
```
`vitest-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```
Ensure `src/routes/+layout.svelte` imports the stylesheet:
```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>
{@render children()}
```

- [ ] **Step 4: Write the smoke test**

`src/routes/page.svelte.test.ts`:
```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('home page', () => {
  it('renders the brand', () => {
    render(Page);
    expect(screen.getByText(/wforacle/i)).toBeInTheDocument();
  });
});
```
`src/routes/+page.svelte` (minimal to pass):
```svelte
<h1>wf<span>oracle</span></h1>
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm vitest run`
Expected: 1 passed. Also verify `pnpm build` completes (prerenders `/`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit app (Svelte 5, Tailwind, Cloudflare adapter, Vitest)"
```

---

### Task 2: Domain types + completion helper

**Files:**
- Create: `src/lib/model/types.ts`
- Create: `src/lib/model/completion.ts`
- Test: `src/lib/model/completion.test.ts`

**Interfaces:**
- Produces:
  - `type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems'`
  - `interface WarframePart { id: string; frameId: string; slot: Slot; dropSourceNodeId?: string }`
  - `interface Warframe { id: string; name: string; image?: string; nodeId?: string; parts: WarframePart[] }`
  - `interface Boss { id: string; name: string; nodeId: string; faction: string }`
  - `interface StarNode { id: string; regionId: string; name: string; missionType: string; faction: string; isAssassination: boolean; bossId?: string; frameId?: string }`
  - `interface Region { id: string; name: string; kind: 'planet' | 'special'; progressionOrder: number; factions: string[]; nodeIds: string[]; spoilerGated: boolean }`
  - `interface Dataset { regions: Region[]; nodes: StarNode[]; bosses: Boss[]; warframes: Warframe[] }`
  - `partId(frameId: string, slot: Slot): string`
  - `frameCompletion(frame: Warframe, owned: ReadonlySet<string>): { owned: number; total: number }`
  - `datasetCompletion(frames: Warframe[], owned: ReadonlySet<string>): { owned: number; total: number }`

- [ ] **Step 1: Write the failing test**

`src/lib/model/completion.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { partId, frameCompletion, datasetCompletion } from './completion';
import type { Warframe } from './types';

const rhino: Warframe = {
  id: 'rhino', name: 'Rhino', nodeId: 'fossa',
  parts: (['bp','neuroptics','chassis','systems'] as const).map((slot) => ({
    id: partId('rhino', slot), frameId: 'rhino', slot
  }))
};

describe('completion', () => {
  it('builds a stable part id', () => {
    expect(partId('rhino', 'chassis')).toBe('rhino:chassis');
  });
  it('counts owned parts for a frame', () => {
    const owned = new Set(['rhino:bp', 'rhino:neuroptics']);
    expect(frameCompletion(rhino, owned)).toEqual({ owned: 2, total: 4 });
  });
  it('aggregates across frames', () => {
    const owned = new Set(['rhino:bp']);
    expect(datasetCompletion([rhino, rhino], owned)).toEqual({ owned: 2, total: 8 });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/model/completion.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement types + helper**

`src/lib/model/types.ts`: define every interface/type listed under Interfaces above.
`src/lib/model/completion.ts`:
```ts
import type { Slot, Warframe } from './types';

export function partId(frameId: string, slot: Slot): string {
  return `${frameId}:${slot}`;
}
export function frameCompletion(frame: Warframe, owned: ReadonlySet<string>) {
  const total = frame.parts.length;
  const ownedCount = frame.parts.filter((p) => owned.has(p.id)).length;
  return { owned: ownedCount, total };
}
export function datasetCompletion(frames: Warframe[], owned: ReadonlySet<string>) {
  return frames.reduce(
    (acc, f) => {
      const c = frameCompletion(f, owned);
      return { owned: acc.owned + c.owned, total: acc.total + c.total };
    },
    { owned: 0, total: 0 }
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/model/completion.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/model
git commit -m "feat: domain types and completion helpers"
```

---

### Task 3: Seed dataset

**Files:**
- Create: `src/lib/data/seed.ts`
- Test: `src/lib/data/seed.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `Warframe`, `partId` from Task 2.
- Produces: `export const seed: Dataset` — Earth, Venus, Mars (+ a few dim/unreached planets Mercury, Phobos, Ceres, Jupiter as regions with no assassination frame yet) and node-linked frames Hydroid (Earth/Oro/Vay Hek), Rhino (Venus/Fossa/Jackal), Excalibur (Mars/War/Lech Kril), each with 4 parts via `partId`.

- [ ] **Step 1: Write the failing test**

`src/lib/data/seed.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { seed } from './seed';

describe('seed dataset', () => {
  it('has planets in progression order starting with Earth', () => {
    const ordered = [...seed.regions].sort((a, b) => a.progressionOrder - b.progressionOrder);
    expect(ordered[0].name).toBe('Earth');
  });
  it('links each assassination node to a boss and a frame', () => {
    const assass = seed.nodes.filter((n) => n.isAssassination);
    expect(assass.length).toBeGreaterThanOrEqual(3);
    for (const n of assass) {
      expect(n.bossId).toBeTruthy();
      expect(n.frameId).toBeTruthy();
      expect(seed.warframes.find((w) => w.id === n.frameId)).toBeTruthy();
    }
  });
  it('gives every frame exactly four parts with unique ids', () => {
    for (const w of seed.warframes) {
      expect(w.parts).toHaveLength(4);
      expect(new Set(w.parts.map((p) => p.id)).size).toBe(4);
    }
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/data/seed.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the seed**

`src/lib/data/seed.ts` — build a `Dataset`. Helper to make parts:
```ts
import type { Dataset, Slot, Warframe } from '$lib/model/types';
import { partId } from '$lib/model/completion';

const SLOTS: Slot[] = ['bp', 'neuroptics', 'chassis', 'systems'];
function frame(id: string, name: string, nodeId: string): Warframe {
  return { id, name, nodeId, parts: SLOTS.map((slot) => ({ id: partId(id, slot), frameId: id, slot })) };
}
// regions: Earth(3) Venus(2) Mercury(1) Mars(4) Phobos(5) Ceres(6) Jupiter(7) — progressionOrder
// assassination nodes: oro→Vay Hek→hydroid, fossa→Jackal→rhino, war→Lech Kril→excalibur
export const seed: Dataset = {
  regions: [
    { id: 'earth', name: 'Earth', kind: 'planet', progressionOrder: 3, factions: ['Grineer'], nodeIds: ['oro'], spoilerGated: false },
    { id: 'venus', name: 'Venus', kind: 'planet', progressionOrder: 2, factions: ['Corpus'], nodeIds: ['fossa'], spoilerGated: false },
    { id: 'mercury', name: 'Mercury', kind: 'planet', progressionOrder: 1, factions: ['Grineer'], nodeIds: [], spoilerGated: false },
    { id: 'mars', name: 'Mars', kind: 'planet', progressionOrder: 4, factions: ['Grineer'], nodeIds: ['war'], spoilerGated: false },
    { id: 'phobos', name: 'Phobos', kind: 'planet', progressionOrder: 5, factions: ['Corpus'], nodeIds: [], spoilerGated: false },
    { id: 'ceres', name: 'Ceres', kind: 'planet', progressionOrder: 6, factions: ['Grineer'], nodeIds: [], spoilerGated: false },
    { id: 'jupiter', name: 'Jupiter', kind: 'planet', progressionOrder: 7, factions: ['Corpus'], nodeIds: [], spoilerGated: false }
  ],
  nodes: [
    { id: 'oro', regionId: 'earth', name: 'Oro', missionType: 'Assassination', faction: 'Grineer', isAssassination: true, bossId: 'vayhek', frameId: 'hydroid' },
    { id: 'fossa', regionId: 'venus', name: 'Fossa', missionType: 'Assassination', faction: 'Corpus', isAssassination: true, bossId: 'jackal', frameId: 'rhino' },
    { id: 'war', regionId: 'mars', name: 'War', missionType: 'Assassination', faction: 'Grineer', isAssassination: true, bossId: 'lechkril', frameId: 'excalibur' }
  ],
  bosses: [
    { id: 'vayhek', name: 'Councilor Vay Hek', nodeId: 'oro', faction: 'Grineer' },
    { id: 'jackal', name: 'Jackal', nodeId: 'fossa', faction: 'Corpus' },
    { id: 'lechkril', name: 'Lieutenant Lech Kril', nodeId: 'war', faction: 'Grineer' }
  ],
  warframes: [frame('hydroid', 'Hydroid', 'oro'), frame('rhino', 'Rhino', 'fossa'), frame('excalibur', 'Excalibur', 'war')]
};
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/data/seed.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data
git commit -m "feat: seed dataset (Earth/Venus/Mars assassination frames)"
```

---

### Task 4: Tracking store (in-memory runes)

**Files:**
- Create: `src/lib/tracker/tracker.svelte.ts`
- Test: `src/lib/tracker/tracker.svelte.test.ts`

**Interfaces:**
- Consumes: `Warframe`, `frameCompletion`, `datasetCompletion` from Tasks 2.
- Produces: `createTracker(frames: Warframe[]): Tracker` where
  - `Tracker.isOwned(partId: string): boolean`
  - `Tracker.togglePart(partId: string): void`
  - `Tracker.toggleFrame(frameId: string): void` (owns all parts if any missing, else clears all)
  - `Tracker.frameCount(frameId: string): { owned: number; total: number }`
  - `Tracker.total: { owned: number; total: number }` (reactive `$derived` getter)
  - `Tracker.snapshot(): string[]` and `Tracker.load(ids: string[]): void`

- [ ] **Step 1: Write the failing test**

`src/lib/tracker/tracker.svelte.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTracker } from './tracker.svelte';
import { seed } from '$lib/data/seed';

describe('tracker', () => {
  it('toggles a single part', () => {
    const t = createTracker(seed.warframes);
    expect(t.isOwned('rhino:bp')).toBe(false);
    t.togglePart('rhino:bp');
    expect(t.isOwned('rhino:bp')).toBe(true);
    t.togglePart('rhino:bp');
    expect(t.isOwned('rhino:bp')).toBe(false);
  });
  it('toggleFrame owns all then clears all', () => {
    const t = createTracker(seed.warframes);
    t.toggleFrame('rhino');
    expect(t.frameCount('rhino')).toEqual({ owned: 4, total: 4 });
    t.toggleFrame('rhino');
    expect(t.frameCount('rhino')).toEqual({ owned: 0, total: 4 });
  });
  it('aggregates a reactive total', () => {
    const t = createTracker(seed.warframes);
    t.togglePart('rhino:bp');
    t.togglePart('hydroid:chassis');
    expect(t.total).toEqual({ owned: 2, total: 12 });
  });
  it('round-trips a snapshot', () => {
    const t = createTracker(seed.warframes);
    t.load(['rhino:bp', 'excalibur:systems']);
    expect(t.snapshot().sort()).toEqual(['excalibur:systems', 'rhino:bp']);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/tracker/tracker.svelte.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the tracker**

`src/lib/tracker/tracker.svelte.ts`:
```ts
import { SvelteSet } from 'svelte/reactivity';
import type { Warframe } from '$lib/model/types';
import { frameCompletion, datasetCompletion } from '$lib/model/completion';

export function createTracker(frames: Warframe[]) {
  const owned = new SvelteSet<string>();
  const byId = new Map(frames.map((f) => [f.id, f]));

  function togglePart(id: string) {
    if (owned.has(id)) owned.delete(id);
    else owned.add(id);
  }
  function toggleFrame(frameId: string) {
    const f = byId.get(frameId);
    if (!f) return;
    const anyMissing = f.parts.some((p) => !owned.has(p.id));
    for (const p of f.parts) {
      if (anyMissing) owned.add(p.id);
      else owned.delete(p.id);
    }
  }
  return {
    isOwned: (id: string) => owned.has(id),
    togglePart,
    toggleFrame,
    frameCount: (frameId: string) => {
      const f = byId.get(frameId);
      return f ? frameCompletion(f, owned) : { owned: 0, total: 0 };
    },
    get total() { return datasetCompletion(frames, owned); },
    snapshot: () => [...owned],
    load: (ids: string[]) => { owned.clear(); for (const id of ids) owned.add(id); }
  };
}
export type Tracker = ReturnType<typeof createTracker>;
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/tracker/tracker.svelte.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracker
git commit -m "feat: in-memory runes tracking store"
```

---

### Task 5: IndexedDB persistence

**Files:**
- Create: `src/lib/tracker/persistence.ts`
- Modify: `src/lib/tracker/tracker.svelte.ts` (add optional persistence wiring)
- Test: `src/lib/tracker/persistence.test.ts`

**Interfaces:**
- Consumes: `idb`'s `openDB`.
- Produces:
  - `loadOwned(): Promise<string[]>`
  - `saveOwned(ids: string[]): Promise<void>`
  - both no-op-safe outside the browser.

- [ ] **Step 1: Add a fake IndexedDB for tests**

Run: `pnpm add -D fake-indexeddb`
Append to `vitest-setup.ts`:
```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 2: Write the failing test**

`src/lib/tracker/persistence.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadOwned, saveOwned } from './persistence';

describe('persistence', () => {
  beforeEach(async () => { await saveOwned([]); });
  it('persists and reloads owned ids', async () => {
    await saveOwned(['rhino:bp', 'rhino:chassis']);
    expect((await loadOwned()).sort()).toEqual(['rhino:bp', 'rhino:chassis']);
  });
  it('returns empty when nothing stored', async () => {
    await saveOwned([]);
    expect(await loadOwned()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/tracker/persistence.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement persistence**

`src/lib/tracker/persistence.ts`:
```ts
import { browser } from '$app/environment';
import { openDB, type IDBPDatabase } from 'idb';

const DB = 'wforacle';
const STORE = 'tracking';
const KEY = 'ownedParts';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) dbp = openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });
  return dbp;
}
export async function loadOwned(): Promise<string[]> {
  if (!browser && typeof indexedDB === 'undefined') return [];
  return (await (await db()).get(STORE, KEY)) ?? [];
}
export async function saveOwned(ids: string[]): Promise<void> {
  if (!browser && typeof indexedDB === 'undefined') return;
  await (await db()).put(STORE, ids, KEY);
}
```
(The `typeof indexedDB` guard lets the fake-indexeddb tests run under Vitest while the `browser` guard protects real SSR.)

- [ ] **Step 5: Run test — expect PASS**

Run: `pnpm vitest run src/lib/tracker/persistence.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Wire persistence into the tracker (browser-only auto-save)**

Add to `createTracker` an optional autosave via `$effect.root`, invoked only when a persist callback is supplied:
```ts
// in tracker.svelte.ts, extend signature:
export function createTracker(frames: Warframe[], persist?: (ids: string[]) => void) {
  // ...existing...
  if (persist) {
    $effect.root(() => {
      $effect(() => { persist([...owned]); });
    });
  }
  // ...return...
}
```

- [ ] **Step 7: Run the full suite — expect PASS**

Run: `pnpm vitest run`
Expected: all green (Task 4 tests still pass since `persist` is optional).

- [ ] **Step 8: Commit**

```bash
git add src/lib/tracker vitest-setup.ts package.json
git commit -m "feat: IndexedDB persistence with browser guards + autosave"
```

---

### Task 6: Star Chart geometry helper

**Files:**
- Create: `src/lib/starchart/geometry.ts`
- Test: `src/lib/starchart/geometry.test.ts`

**Interfaces:**
- Consumes: `Region` from Task 2.
- Produces: `layoutRing(regions: Region[], opts?: { cx?: number; cy?: number; rx?: number; ry?: number; phase?: number }): PlacedPlanet[]` where
  - `interface PlacedPlanet { region: Region; x: number; y: number; r: number; front: number }`
  - planets ordered by `progressionOrder`; `front` ∈ [0,1] (1 = front/bottom); `r` scales with `front`; result sorted back-to-front for paint order.

- [ ] **Step 1: Write the failing test**

`src/lib/starchart/geometry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { layoutRing } from './geometry';
import { seed } from '$lib/data/seed';

describe('layoutRing', () => {
  const placed = layoutRing(seed.regions, { cx: 100, cy: 100, rx: 80, ry: 40 });
  it('places every region once', () => {
    expect(placed).toHaveLength(seed.regions.length);
    expect(new Set(placed.map((p) => p.region.id)).size).toBe(seed.regions.length);
  });
  it('keeps points within the ellipse bounds', () => {
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(100 - 80 - p.r);
      expect(p.x).toBeLessThanOrEqual(100 + 80 + p.r);
    }
  });
  it('paints back-to-front (ascending front)', () => {
    for (let i = 1; i < placed.length; i++) {
      expect(placed[i].front).toBeGreaterThanOrEqual(placed[i - 1].front);
    }
  });
  it('makes front planets larger than back planets', () => {
    const front = placed[placed.length - 1];
    const back = placed[0];
    expect(front.r).toBeGreaterThan(back.r);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/starchart/geometry.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement geometry**

`src/lib/starchart/geometry.ts`:
```ts
import type { Region } from '$lib/model/types';

export interface PlacedPlanet { region: Region; x: number; y: number; r: number; front: number }

export function layoutRing(
  regions: Region[],
  opts: { cx?: number; cy?: number; rx?: number; ry?: number; phase?: number } = {}
): PlacedPlanet[] {
  const { cx = 560, cy = 238, rx = 500, ry = 150, phase = 0.18 } = opts;
  const ordered = [...regions].sort((a, b) => a.progressionOrder - b.progressionOrder);
  const n = ordered.length;
  const placed = ordered.map((region, i) => {
    const t = (i / n) * 2 * Math.PI + phase;
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    const front = (Math.sin(t) + 1) / 2;
    const r = 13 + 17 * front;
    return { region, x, y, r, front };
  });
  return placed.sort((a, b) => a.front - b.front);
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/starchart/geometry.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/starchart/geometry.ts src/lib/starchart/geometry.test.ts
git commit -m "feat: star chart ring geometry helper"
```

---

### Task 7: StarChart SVG component

**Files:**
- Create: `src/lib/starchart/StarChart.svelte`
- Test: `src/lib/starchart/StarChart.svelte.test.ts`

**Interfaces:**
- Consumes: `layoutRing`, `Region`, `Tracker`.
- Props: `{ regions: Region[]; selectedId: string; statusOf: (regionId: string) => 'done'|'part'|'none'; onselect: (regionId: string) => void }`
- Behavior: renders one `<g data-region={id}>` per planet with a `<text>` label; clicking a group calls `onselect`; selected planet gets a `sel` class; status drives a color class.

- [ ] **Step 1: Write the failing test**

`src/lib/starchart/StarChart.svelte.test.ts`:
```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import StarChart from './StarChart.svelte';
import { seed } from '$lib/data/seed';

describe('StarChart', () => {
  const base = { regions: seed.regions, selectedId: 'venus', statusOf: () => 'none' as const };
  it('renders a label per region', () => {
    render(StarChart, { ...base, onselect: () => {} });
    expect(screen.getByText('EARTH')).toBeInTheDocument();
    expect(screen.getByText('VENUS')).toBeInTheDocument();
  });
  it('fires onselect with the region id on click', async () => {
    const onselect = vi.fn();
    render(StarChart, { ...base, onselect });
    await screen.getByText('MARS').click();
    expect(onselect).toHaveBeenCalledWith('mars');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/starchart/StarChart.svelte.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

`src/lib/starchart/StarChart.svelte`:
```svelte
<script lang="ts">
  import type { Region } from '$lib/model/types';
  import { layoutRing } from './geometry';

  let { regions, selectedId, statusOf, onselect }:
    { regions: Region[]; selectedId: string;
      statusOf: (id: string) => 'done'|'part'|'none';
      onselect: (id: string) => void } = $props();

  const VBW = 1120, VBH = 480;
  let placed = $derived(layoutRing(regions, { cx: VBW/2 }));
</script>

<svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" class="block select-none">
  <ellipse cx={VBW/2} cy="238" rx="500" ry="150" fill="none" stroke="#1c3050" stroke-width="1.5" opacity="0.7" />
  {#each placed as p (p.region.id)}
    {@const status = statusOf(p.region.id)}
    {@const sel = p.region.id === selectedId}
    <g role="button" tabindex="0" data-region={p.region.id} class="cursor-pointer"
       onclick={() => onselect(p.region.id)}
       onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onselect(p.region.id)}>
      {#if sel}
        <circle cx={p.x} cy={p.y} r={p.r + 7} fill="none" stroke="#37d2e6" stroke-width="2" />
      {:else if status !== 'none'}
        <circle cx={p.x} cy={p.y} r={p.r + 4} fill="none"
          stroke={status === 'done' ? '#2ee6a0' : '#e6b854'} stroke-width="2" opacity="0.7" />
      {/if}
      <circle cx={p.x} cy={p.y} r={p.r}
        fill={status === 'done' ? '#2ee6a0' : status === 'part' ? '#c99a4a' : '#33506f'}
        stroke="#0a1018" />
      <text x={p.x} y={p.y + p.r + 16} text-anchor="middle"
        font-size={p.front > 0.55 ? 15 : 12}
        fill={sel ? '#37d2e6' : p.front > 0.5 ? '#cfe0f2' : '#8298b4'}>{p.region.name.toUpperCase()}</text>
    </g>
  {/each}
</svg>
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/starchart/StarChart.svelte.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/starchart/StarChart.svelte src/lib/starchart/StarChart.svelte.test.ts
git commit -m "feat: StarChart SVG ring component"
```

---

### Task 8: RegionPanel (assassination + part tracking)

**Files:**
- Create: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `Tracker`.
- Props: `{ dataset: Dataset; regionId: string; tracker: Tracker }`
- Behavior: for the selected region's assassination node, shows boss + frame; renders a clickable row per part; clicking a row calls `tracker.togglePart`; owned rows carry `data-owned="true"`. Shows a "Toggle whole frame" control calling `tracker.toggleFrame`. Shows "No Assassination frame here yet" when the region has none.

- [ ] **Step 1: Write the failing test**

`src/lib/panel/RegionPanel.svelte.test.ts`:
```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RegionPanel from './RegionPanel.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';

describe('RegionPanel', () => {
  it('shows the boss and frame for an assassination region', () => {
    const tracker = createTracker(seed.warframes);
    render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
    expect(screen.getByText(/Jackal/)).toBeInTheDocument();
    expect(screen.getByText(/Rhino/)).toBeInTheDocument();
  });
  it('toggles a part on row click', async () => {
    const tracker = createTracker(seed.warframes);
    render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
    const row = screen.getByText('Chassis').closest('[data-part]') as HTMLElement;
    expect(row.getAttribute('data-owned')).toBe('false');
    await row.click();
    expect(tracker.isOwned('rhino:chassis')).toBe(true);
  });
  it('shows an empty state for a region with no assassination frame', () => {
    const tracker = createTracker(seed.warframes);
    render(RegionPanel, { dataset: seed, regionId: 'mercury', tracker });
    expect(screen.getByText(/no assassination frame/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm vitest run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the panel**

`src/lib/panel/RegionPanel.svelte`:
```svelte
<script lang="ts">
  import type { Dataset } from '$lib/model/types';
  import type { Tracker } from '$lib/tracker/tracker.svelte';

  let { dataset, regionId, tracker }:
    { dataset: Dataset; regionId: string; tracker: Tracker } = $props();

  const SLOT_LABEL = { bp: 'Blueprint', neuroptics: 'Neuroptics', chassis: 'Chassis', systems: 'Systems' } as const;

  let region = $derived(dataset.regions.find((r) => r.id === regionId));
  let node = $derived(dataset.nodes.find((n) => n.regionId === regionId && n.isAssassination));
  let boss = $derived(node ? dataset.bosses.find((b) => b.id === node!.bossId) : undefined);
  let frame = $derived(node ? dataset.warframes.find((w) => w.id === node!.frameId) : undefined);
</script>

<section class="rounded-xl border border-slate-700 bg-slate-900 p-4">
  {#if node && boss && frame}
    <h3 class="font-semibold">{node.name} — <span class="text-sky-300">{boss.name}</span></h3>
    <p class="mb-3 text-sm text-slate-400">Drops {frame.name}
      · {tracker.frameCount(frame.id).owned}/{tracker.frameCount(frame.id).total} owned</p>
    {#each frame.parts as part (part.id)}
      <div data-part={part.id} data-owned={tracker.isOwned(part.id)}
        role="button" tabindex="0"
        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800"
        class:bg-emerald-500-15={tracker.isOwned(part.id)}
        onclick={() => tracker.togglePart(part.id)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && tracker.togglePart(part.id)}>
        <span class="inline-flex h-4 w-4 items-center justify-center rounded border"
          class:border-emerald-400={tracker.isOwned(part.id)}>{tracker.isOwned(part.id) ? '✓' : ''}</span>
        <span>{SLOT_LABEL[part.slot]}</span>
      </div>
    {/each}
    <button class="mt-2 text-sm text-sky-300" onclick={() => tracker.toggleFrame(frame!.id)}>Toggle whole frame</button>
  {:else}
    <p class="text-sm text-slate-400">{region?.name}: no Assassination frame here yet.</p>
  {/if}
</section>
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm vitest run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel
git commit -m "feat: RegionPanel with click-to-track parts"
```

---

### Task 9: Compose the home page + context wiring

**Files:**
- Modify: `src/routes/+page.svelte`
- Create: `src/lib/tracker/context.ts`
- Modify: `src/routes/page.svelte.test.ts` (extend smoke to assert chart + panel present)

**Interfaces:**
- Consumes: `StarChart`, `RegionPanel`, `createTracker`, `loadOwned`, `saveOwned`, `seed`.
- Produces: a working page: top bar with completion readout, StarChart, RegionPanel; tracker created once, hydrated from IndexedDB on mount, autosaving on change; selection state via `$state`.

- [ ] **Step 1: Add a tiny context helper**

`src/lib/tracker/context.ts`:
```ts
import { getContext, setContext } from 'svelte';
import type { Tracker } from './tracker.svelte';

const KEY = Symbol('tracker');
export const setTracker = (t: Tracker) => setContext(KEY, t);
export const useTracker = () => getContext<Tracker>(KEY);
```

- [ ] **Step 2: Implement the page**

`src/routes/+page.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { seed } from '$lib/data/seed';
  import StarChart from '$lib/starchart/StarChart.svelte';
  import RegionPanel from '$lib/panel/RegionPanel.svelte';
  import { createTracker } from '$lib/tracker/tracker.svelte';
  import { loadOwned, saveOwned } from '$lib/tracker/persistence';

  const tracker = createTracker(seed.warframes, (ids) => { if (browser) saveOwned(ids); });
  let selectedId = $state('venus');

  onMount(async () => { tracker.load(await loadOwned()); });

  function statusOf(regionId: string): 'done'|'part'|'none' {
    const node = seed.nodes.find((n) => n.regionId === regionId && n.isAssassination);
    if (!node?.frameId) return 'none';
    const c = tracker.frameCount(node.frameId);
    return c.owned === c.total && c.total > 0 ? 'done' : c.owned > 0 ? 'part' : 'none';
  }
</script>

<div class="mx-auto max-w-6xl p-6 text-slate-100">
  <header class="mb-4 flex items-center gap-4">
    <span class="text-lg font-bold">wf<span class="text-sky-400">oracle</span></span>
    <span class="ml-auto text-sm text-slate-400">
      Node Frames <b class="text-slate-100">{tracker.total.owned} / {tracker.total.total}</b>
    </span>
  </header>

  <div class="mb-4 rounded-xl border border-slate-700">
    <StarChart regions={seed.regions} {selectedId} {statusOf} onselect={(id) => (selectedId = id)} />
  </div>

  <RegionPanel dataset={seed} regionId={selectedId} {tracker} />
</div>
```

- [ ] **Step 3: Extend the smoke test**

Replace `src/routes/page.svelte.test.ts` body:
```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('home page', () => {
  it('renders brand, chart and panel', () => {
    render(Page);
    expect(screen.getByText(/wforacle/i)).toBeInTheDocument();
    expect(screen.getByText('VENUS')).toBeInTheDocument();      // chart
    expect(screen.getByText(/Jackal/)).toBeInTheDocument();     // panel (Venus selected)
  });
});
```

- [ ] **Step 4: Run the full unit suite — expect PASS**

Run: `pnpm vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/routes src/lib/tracker/context.ts
git commit -m "feat: compose home page (chart + panel + tracker + persistence)"
```

---

### Task 10: End-to-end persistence test + build verify

**Files:**
- Create: `e2e/tracking.test.ts`
- Modify: `playwright.config.ts` (ensure `webServer` runs `pnpm preview` on the built app)

**Interfaces:**
- Consumes: the running app.
- Produces: a Playwright test proving click-to-track persists across reloads, and a green production build.

- [ ] **Step 1: Write the e2e test**

`e2e/tracking.test.ts`:
```ts
import { test, expect } from '@playwright/test';

test('tracking a part persists across reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Node Frames 0 / 12')).toBeVisible();

  // Venus selected by default → toggle Rhino Chassis
  await page.locator('[data-part="rhino:chassis"]').click();
  await expect(page.getByText('Node Frames 1 / 12')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Node Frames 1 / 12')).toBeVisible();
  await expect(page.locator('[data-part="rhino:chassis"]')).toHaveAttribute('data-owned', 'true');
});
```

- [ ] **Step 2: Confirm Playwright serves the built app**

`playwright.config.ts` `webServer`:
```ts
webServer: { command: 'pnpm build && pnpm preview', port: 4173 },
testDir: 'e2e'
```

- [ ] **Step 3: Run the e2e test — expect PASS**

Run: `pnpm exec playwright test`
Expected: 1 passed (chromium). Install browsers first if needed: `pnpm exec playwright install chromium`.

- [ ] **Step 4: Verify the production build**

Run: `pnpm build`
Expected: prerenders `/`, no errors.

- [ ] **Step 5: Commit**

```bash
git add e2e playwright.config.ts
git commit -m "test: e2e click-to-track persistence + build verify"
```

---

## Self-Review

**Spec coverage (Plan 1 slice):**
- Hero Star Chart SVG ring, completion-colored, clickable → Tasks 6, 7, 9. ✅
- Local-first Warframe-part tracking (per-part + whole-frame), IndexedDB, completion readout → Tasks 4, 5, 8, 9. ✅
- SvelteKit + Svelte 5 runes + Tailwind + Cloudflare adapter + prerender → Task 1. ✅
- Trackable atom = `WarframePart.id` (`frame:slot`) → Task 2, enforced throughout. ✅
- SSR-safe state / browser-only IndexedDB → Tasks 5, 9 (guards) . ✅
- **Deferred to Plan 2/3 (correctly absent here):** WFCD pipeline, resources + farming badges, mdsvex guides, spoiler disclosure + quest toggles, Ctrl-K palette, shadcn-svelte, theming, special regions on the ring. Seed data (Task 3) is the intentional stand-in.

**Placeholder scan:** No TBD/TODO; every code step carries complete code. ✅

**Type consistency:** `partId`/`WarframePart.id` = `frame:slot` everywhere; `Tracker` method names (`isOwned`, `togglePart`, `toggleFrame`, `frameCount`, `total`, `snapshot`, `load`) consistent across Tasks 4–9; `statusOf` returns the same `'done'|'part'|'none'` union in Tasks 7 and 9; `layoutRing`/`PlacedPlanet` fields consistent between Tasks 6 and 7. ✅

**Note for executor:** exact seed totals — 3 frames × 4 parts = **12 parts** — are asserted verbatim in the Task 10 e2e ("0 / 12", "1 / 12"). If the seed changes, update those strings.
