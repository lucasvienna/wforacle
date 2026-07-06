# wforacle Special Regions & Spoiler Disclosure (Plan 4 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the quest-locked special regions (Deimos, Void, Lua, Kuva Fortress, Zariman) with spoiler-aware progressive disclosure — hidden by default, revealed when the player toggles the gating quest — restoring Nekros (Deimos → Magnacidium) to the tracker.

**Architecture:** Two small curated inputs (`SPECIAL_REGIONS` + `QUESTS`) extend the pipeline so it emits special regions/nodes (and the Deimos→Nekros frame) alongside the 14 main planets, each flagged `kind:'special'`/`spoilerGated`. A `completedQuests` set (IndexedDB, alongside `owned`) drives a pure `isRegionRevealed` gate; the Star Chart renders revealed special regions as off-ring "anomaly" nodes, and a Quests panel toggles them. Default (no quests done) = the post-*Awakening* main-planet chart, no spoilers.

**Tech Stack:** TypeScript, Svelte 5 runes, Tailwind, `@wfcd/items` + `warframe-worldstate-data`, `idb`, Vitest, Playwright.

## Global Constraints

- **Additive types.** `Region` gains `questId?: string`; add `Quest { id; name; revealsRegionIds; revealsFrameIds }` and `Dataset.quests: Quest[]`. Existing Plan 1–3 tests stay green; `seed.ts` gets `quests: []`.
- **Special regions are curated, machine data is joined.** `SPECIAL_REGIONS` (Deimos/Void/Lua/Kuva Fortress/Zariman: id, name, order, faction, `spoilerGated`, `questId?`) and `QUESTS` are hand-authored; their *nodes* and the Deimos→Nekros *frame* come from the pipeline (solNodes + @wfcd/items) exactly like main planets.
- **Spoiler default.** With `completedQuests` empty, no `spoilerGated: true` region is shown anywhere (Star Chart, command surfaces). Void is `spoilerGated: false` (early-accessible via relics, no story gate) so it always shows; Deimos/Lua/Kuva Fortress/Zariman are `spoilerGated: true` behind their quest.
- **Reveal rule (single source of truth):** a region is revealed iff `!region.spoilerGated || completedQuests.has(region.questId)`.
- **`completedQuests`** persists to IndexedDB next to `owned`, browser-only, same optimistic pattern.
- Special-region *resource* lists are OUT of scope (Plan 5 polish) — special regions show their frame(s)/nodes; their Resources card shows "No notable resources.".
- Package manager `pnpm`; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD; commit per green task (signed). `pnpm lint`/`format` clean.

---

### Task 1: Quest type + reveal helper

**Files:**
- Modify: `src/lib/model/types.ts` (add `Quest`, `Dataset.quests`, `Region.questId?`)
- Create: `src/lib/model/reveal.ts`
- Test: `src/lib/model/reveal.test.ts`
- Modify: `src/lib/data/seed.ts` (add `quests: []`)

**Interfaces:**
- Produces:
  - `interface Quest { id: string; name: string; revealsRegionIds: string[]; revealsFrameIds: string[] }`
  - `Dataset.quests: Quest[]`; `Region.questId?: string`.
  - `isRegionRevealed(region: Region, completedQuests: ReadonlySet<string>): boolean` — `!region.spoilerGated || (!!region.questId && completedQuests.has(region.questId))`.
  - `revealedRegions(dataset: Dataset, completedQuests: ReadonlySet<string>): Region[]`.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { isRegionRevealed, revealedRegions } from './reveal';
import type { Region, Dataset } from './types';

const main = { id: 'venus', spoilerGated: false } as Region;
const deimos = { id: 'deimos', spoilerGated: true, questId: 'heartofdeimos' } as Region;

describe('reveal', () => {
	it('always reveals non-spoiler regions', () => {
		expect(isRegionRevealed(main, new Set())).toBe(true);
	});
	it('hides a spoiler region until its quest is complete', () => {
		expect(isRegionRevealed(deimos, new Set())).toBe(false);
		expect(isRegionRevealed(deimos, new Set(['heartofdeimos']))).toBe(true);
	});
	it('filters a dataset to revealed regions', () => {
		const ds = { regions: [main, deimos] } as Dataset;
		expect(revealedRegions(ds, new Set()).map((r) => r.id)).toEqual(['venus']);
		expect(revealedRegions(ds, new Set(['heartofdeimos'])).map((r) => r.id)).toEqual(['venus', 'deimos']);
	});
});
```
- [ ] **Step 2: Run — expect FAIL** (`pnpm vitest run src/lib/model/reveal.test.ts`).
- [ ] **Step 3: Implement** — add the types to `types.ts`; `reveal.ts`:
```ts
import type { Dataset, Region } from './types';
export function isRegionRevealed(region: Region, completedQuests: ReadonlySet<string>): boolean {
	return !region.spoilerGated || (!!region.questId && completedQuests.has(region.questId));
}
export function revealedRegions(dataset: Dataset, completedQuests: ReadonlySet<string>): Region[] {
	return dataset.regions.filter((r) => isRegionRevealed(r, completedQuests));
}
```
Add `quests: []` to `seed.ts`.
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 5: Commit** — `feat: Quest type + region reveal helper`.

---

### Task 2: Curated special regions + quests

**Files:**
- Create: `scripts/data/special.ts`
- Test: `scripts/data/special.test.ts`

**Interfaces:**
- Consumes: `slugify` (`./parse`).
- Produces:
  - `SPECIAL_REGIONS: { name: string; order: number; faction: string; spoilerGated: boolean; questId?: string }[]` — Deimos(15,Infested,gated,heartofdeimos), Void(16,Orokin,not gated), Lua(17,Corpus,gated,thesecondddream), 'Kuva Fortress'(18,Grineer,gated,thewarwithin), Zariman(19,Corpus,gated,angelsofthezariman).
  - `QUESTS: { id: string; name: string; revealsRegionIds: string[]; revealsFrameIds: string[] }[]` — one per gated region (id = questId): Heart of Deimos → `['deimos']`, `['nekros']`; The Second Dream → `['lua']`, `[]`; The War Within → `['kuvafortress']`, `[]`; Angels of the Zariman → `['zariman']`, `[]`.
  - `SPECIAL_REGION_NAMES: Set<string>` — the raw planet strings as they appear in solNodes values (`'Deimos'`, `'Void'`, `'Lua'`, `'Kuva Fortress'`, `'Zariman'`).

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { SPECIAL_REGIONS, QUESTS, SPECIAL_REGION_NAMES } from './special';
import { slugify } from './parse';

describe('special regions + quests', () => {
	it('has 5 special regions, Deimos gated by Heart of Deimos', () => {
		expect(SPECIAL_REGIONS).toHaveLength(5);
		const deimos = SPECIAL_REGIONS.find((r) => r.name === 'Deimos')!;
		expect(deimos.spoilerGated).toBe(true);
		expect(deimos.questId).toBe('heartofdeimos');
		expect(SPECIAL_REGIONS.find((r) => r.name === 'Void')!.spoilerGated).toBe(false);
	});
	it('every gated region has a quest that reveals it', () => {
		for (const r of SPECIAL_REGIONS.filter((x) => x.spoilerGated)) {
			const q = QUESTS.find((q) => q.id === r.questId)!;
			expect(q).toBeTruthy();
			expect(q.revealsRegionIds).toContain(slugify(r.name));
		}
	});
	it('Heart of Deimos reveals nekros', () => {
		expect(QUESTS.find((q) => q.id === 'heartofdeimos')!.revealsFrameIds).toContain('nekros');
	});
});
```
- [ ] **Step 2: Run — expect FAIL**.
- [ ] **Step 3: Implement** `scripts/data/special.ts` with the data above (`SPECIAL_REGION_NAMES = new Set(SPECIAL_REGIONS.map((r) => r.name))`).
- [ ] **Step 4: Run — expect PASS**.
- [ ] **Step 5: Commit** — `feat(pipeline): curated special regions + quests`.

---

### Task 3: Pipeline builds special regions, nodes, and the Deimos frame

**Files:**
- Modify: `scripts/data/build.ts` (regions/nodes accept special regions; frames un-filtered)
- Modify: `scripts/data/assemble.ts` (include `quests`; extend validate)
- Test: `scripts/data/build.test.ts`, `scripts/data/assemble.test.ts`

**Interfaces:**
- Consumes: `SPECIAL_REGIONS`, `SPECIAL_REGION_NAMES`, `QUESTS` (Task 2); `PLANETS` (curated).
- Produces:
  - `buildNodes` now includes nodes whose planet is a main planet OR a `SPECIAL_REGION_NAMES` member.
  - `buildRegions` emits `Region`s for the 14 planets (kind `'planet'`) AND the present special regions (kind `'special'`, with `spoilerGated`/`questId` from `SPECIAL_REGIONS`).
  - `buildFrames` is unchanged in logic but now sees Deimos nodes, so Nekros (Deimos/Magnacidium) links.
  - `assembleDataset` returns `quests: QUESTS` and back-fills special-region assassination nodes' `bossId`/`frameId` too.
  - `validateDataset` also checks: every `quest.revealsRegionIds` id is a region; every `quest.revealsFrameIds` id is a frame; every `spoilerGated` region has a `questId` resolving to a quest.

- [ ] **Step 1: Extend the build fixtures** — add a Deimos Assassination node to `scripts/data/fixtures/solNodes.sample.json` (`"SolNode888": { "value": "Magnacidium (Deimos)", "enemy": "Infested", "type": "Assassination" }`) and a Nekros entry to `scripts/data/fixtures/warframes.sample.json` (Chassis/Neuroptics/Systems dropping `"Deimos/Magnacidium (Assassination)"`, chance 33.33). Add `nekros` boss to `curated.ts` `BOSS_BY_NODE` (`[slugify('Magnacidium')]: 'Lephantis'`).
- [ ] **Step 2: Write failing tests** — in `build.test.ts`, assert `buildRegions(solNodesWithDeimos)` includes a region `{ id:'deimos', kind:'special', spoilerGated:true, questId:'heartofdeimos' }`, and `buildFrames` links `nekros` to the Deimos node. In `assemble.test.ts`, assert `assembleDataset(...).quests` is non-empty and `validateDataset` passes; add a negative case (a quest revealing a bogus frame id → non-empty problems).
- [ ] **Step 3: Run — expect FAIL**.
- [ ] **Step 4: Implement** — in `build.ts`: build a `Map` of region metadata for both `PLANETS` (kind planet) and `SPECIAL_REGIONS` (kind special); `buildNodes` includes a node if its planet is in that combined set; `buildRegions` iterates `[...PLANETS(planet), ...SPECIAL_REGIONS(special)]` and emits regions with the right `kind`/`spoilerGated`/`questId`, sorted by `progressionOrder`. In `assemble.ts`: import `QUESTS`, add `quests: QUESTS` to the returned `Dataset`, extend `validateDataset` with the three quest/region/frame checks.
- [ ] **Step 5: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 6: Commit** — `feat(pipeline): build special regions, nodes, quests + Deimos frame`.

---

### Task 4: Regenerate the real dataset (special regions + Nekros back)

**Files:**
- Modify: `static/data/dataset.json` (regenerated)
- Modify: `scripts/build-data.ts` (sanity: expect 5 special regions + `nekros`)

**Interfaces:** none (data generation).

- [ ] **Step 1: Add BOSS_BY_NODE + sanity** — ensure `curated.ts` `BOSS_BY_NODE` has `[slugify('Magnacidium')]: 'Lephantis'`. In `build-data.ts` add a sanity check: `data.regions.filter(r => r.kind==='special').length >= 5` and `data.warframes.some(f => f.id==='nekros')`.
- [ ] **Step 2: Regenerate** — `pnpm data:build`. Expected: 19 regions (14 planets + 5 special), node-linked frames now 13 (adds Nekros), `data.quests` has 4 entries. Hand-verify: `node -e "const d=require('./static/data/dataset.json').data; console.log('special:', d.regions.filter(r=>r.kind==='special').map(r=>r.name+(r.spoilerGated?'(gated)':'')).join(', ')); console.log('nekros node:', d.nodes.find(n=>n.frameId==='nekros')?.name)"` → Deimos(gated)/Void/Lua(gated)/Kuva Fortress(gated)/Zariman(gated); nekros node = Magnacidium.
- [ ] **Step 3: Run tests + commit** — `pnpm test:unit --run` green; grab the Deimos planet globe (`bash -c 'curl -sL -A wforacle -o /tmp/deimos.webp "https://static.wikia.nocookie.net/warframe/images/8/8d/Deimos.png/revision/latest" && convert /tmp/deimos.webp -resize 220x220 -strip static/planets/deimos.webp'`) plus Void/Lua/Kuva Fortress/Zariman globes if readily available (fallback: reuse a neutral icon). Commit `static/data/dataset.json` + `static/planets/*.webp` + scripts: `feat(data): regenerate with special regions + Nekros`.

---

### Task 5: Track completed quests (IndexedDB)

**Files:**
- Modify: `src/lib/tracker/persistence.ts` (quests store)
- Modify: `src/lib/tracker/tracker.svelte.ts` (quest state)
- Test: `src/lib/tracker/tracker.svelte.test.ts`, `src/lib/tracker/persistence.test.ts`

**Interfaces:**
- Produces:
  - `loadQuests(): Promise<string[]>` / `saveQuests(ids: string[]): Promise<void>` (same guards/pattern as `loadOwned`/`saveOwned`).
  - `createTracker` gains: `completedQuests` (a `$derived`-friendly getter returning a `ReadonlySet<string>`), `isQuestDone(id)`, `toggleQuest(id)`, `loadQuestState(ids)`, `questSnapshot()`; the optional `persist` gains a sibling `persistQuests?` callback wired through the same `$effect.root`.

- [ ] **Step 1: Persistence test + impl** — mirror `loadOwned`/`saveOwned` for a `quests` key; TDD (`persistence.test.ts` round-trip).
- [ ] **Step 2: Tracker test** — `createTracker(seed.warframes)` → `toggleQuest('heartofdeimos')` flips `isQuestDone`, `questSnapshot()` round-trips via `loadQuestState`.
- [ ] **Step 3: Implement** — add a `SvelteSet<string>` `completedQuests` to the store with the four methods; wire `persistQuests` into the existing `$effect.root` (guard so no-persist callers are unaffected — Plan 1/2 tests stay green).
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 5: Commit** — `feat: track completed quests (IndexedDB) for spoiler disclosure`.

---

### Task 6: Star Chart renders revealed special regions as anomaly nodes

**Files:**
- Modify: `src/lib/starchart/geometry.ts` (anomaly placement)
- Modify: `src/lib/starchart/StarChart.svelte` (render special regions)
- Test: `src/lib/starchart/geometry.test.ts`, `src/lib/starchart/StarChart.svelte.test.ts`

**Interfaces:**
- Produces:
  - `layoutAnomalies(specialRegions: Region[], opts?): PlacedPlanet[]` — positions special regions on an inner arc (smaller `r`, distinct from the main ellipse), deterministic by `progressionOrder`.
  - `StarChart` gains a `specialRegions: Region[]` prop (already-filtered to revealed) and renders each as a smaller anomaly node (same click/keyboard/status semantics, a subtly different style — e.g. a diamond halo or dimmer ring) with its label.

- [ ] **Step 1: Geometry test** — `layoutAnomalies(regions)` returns one placement per region, all within an inner bound (smaller `rx/ry` than the main ring), `r` in a small range (e.g. `[9,16]`).
- [ ] **Step 2: Component test** — render `StarChart` with a `specialRegions=[{id:'deimos',name:'Deimos',...}]`, assert `DEIMOS` label renders and clicking it fires `onselect('deimos')`.
- [ ] **Step 3: Implement** geometry + component (place anomalies on an inner arc; reuse the existing planet `<g>` click/keyboard block, smaller radius, `data-region` set).
- [ ] **Step 4: Run — expect PASS**.
- [ ] **Step 5: Commit** — `feat: render revealed special regions as Star Chart anomaly nodes`.

---

### Task 7: Quests panel (toggle to reveal)

**Files:**
- Create: `src/lib/panel/QuestsPanel.svelte`
- Test: `src/lib/panel/QuestsPanel.svelte.test.ts`

**Interfaces:**
- Props: `{ dataset: Dataset; tracker: Tracker }`. Lists `dataset.quests` by name with a checkbox/toggle bound to `tracker.isQuestDone(q.id)` / `tracker.toggleQuest(q.id)`; a one-line "Reveals: ⟨region names⟩". A short spoiler-safe note ("Toggle the quests you've completed to reveal their regions.").

- [ ] **Step 1: Test** — render with the seed + a tracker (created from `seed.warframes`), assert each quest name renders; clicking a quest's toggle calls `tracker.toggleQuest(id)` and flips its `data-done` attribute.
- [ ] **Step 2: Run — expect FAIL**.
- [ ] **Step 3: Implement** the component (Svelte 5 runes, keyboard-activatable rows, validate with the Svelte MCP).
- [ ] **Step 4: Run — expect PASS**.
- [ ] **Step 5: Commit** — `feat: Quests panel to reveal spoiler-gated regions`.

---

### Task 8: Wire disclosure into the home page

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/page.svelte.test.ts`

**Interfaces:**
- Consumes: `revealedRegions`, `isRegionRevealed`, `QuestsPanel`, the quest-aware tracker.
- Behavior: the page computes `visible = revealedRegions(data, tracker.completedQuests)`; the Star Chart gets `regions = visible.filter(kind==='planet')` and `specialRegions = visible.filter(kind==='special')`; a Quests panel is shown (e.g. below the chart or in a toggleable drawer). On load, `tracker.loadQuestState(await loadQuests())` alongside `loadOwned`; `persistQuests` saves on change (behind the same `ready` guard). Selecting a special region shows its `RegionPanel` (Deimos → Nekros).

- [ ] **Step 1: Implement** the page wiring (default: no quests → only the 14 planets + Void render; Deimos/Lua/Kuva/Zariman hidden). Keep the `ready`-guard + `onDestroy(tracker.dispose())`.
- [ ] **Step 2: Update the smoke test** — mock `loadDataset`/`loadQuests`; assert the main planets render and a spoiler-gated region (Deimos) does NOT appear until a quest is toggled (drive `tracker.toggleQuest` and assert it appears). Validate the page with the Svelte MCP.
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 4: Commit** — `feat: wire spoiler-aware disclosure into the home page`.

---

### Task 9: End-to-end — reveal Deimos, track Nekros

**Files:**
- Modify: `e2e/tracking.test.ts` (or new `e2e/spoiler.test.ts`)

**Interfaces:** the running app.

- [ ] **Step 1: e2e test** — load `/`; assert Deimos is NOT visible (`page.getByText('DEIMOS')` hidden). Toggle "Heart of Deimos" in the Quests panel. Assert Deimos now renders on the chart; click it; assert its panel shows Nekros with `data-part="nekros:chassis"`. Reload; assert Deimos stays revealed (quest persisted).
- [ ] **Step 2: Run — expect PASS** (`pnpm exec playwright test`) + `pnpm build` prerenders cleanly.
- [ ] **Step 3: Commit** — `test: e2e spoiler reveal (Deimos → Nekros) persists`.

---

## Self-Review

**Spec coverage (Plan 4 slice):**
- Special regions (Deimos/Void/Lua/Kuva Fortress/Zariman) modeled `kind:'special'`/`spoilerGated` → Tasks 2–4. ✅
- Spoiler-aware disclosure: default hidden, quest toggle reveals; `isRegionRevealed` single source of truth → Tasks 1, 5–8. ✅
- Deimos → Nekros restored → Tasks 3–4, verified in Task 9. ✅
- `completedQuests` persisted (IndexedDB, browser-only, ready-guarded) → Tasks 5, 8. ✅
- Off-ring anomaly rendering → Task 6. ✅
- **Deferred to Plan 5 (correctly absent):** Ctrl-K command palette, additional in-game themes, special-region *resource* lists.

**Placeholder scan:** every code step carries complete code or an exact, testable contract; special-region *data* (Task 2) has a passing-test contract + concrete values. ✅

**Type consistency:** `Quest`/`Region.questId`/`Dataset.quests` used consistently across Tasks 1–3/8; `isRegionRevealed` signature stable (Tasks 1/6/8); tracker's `completedQuests`/`toggleQuest`/`isQuestDone`/`loadQuestState` names consistent (Tasks 5/7/8); `slugify(name)` region ids (`deimos`, `kuvafortress`, `zariman`) match between `special.ts`, quests' `revealsRegionIds`, and the pipeline. ✅

**Note for executor:** verify special-region planet strings in the installed `solNodes.json` match `SPECIAL_REGION_NAMES` exactly (`'Kuva Fortress'`, `'Zariman'`) before finalizing Task 2; Void has no `questId` (spoilerGated:false) — do not invent one. Special-region globe assets beyond Deimos are best-effort; a neutral fallback icon is acceptable if a clean render isn't available.
