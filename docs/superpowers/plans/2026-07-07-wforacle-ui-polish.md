# wforacle UI/UX Polish (Plan 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pre-deployment polish pass: move the tacked-on Quests block into a proper settings drawer behind a header cogwheel, give the header a real toolbar (search + settings + progress), and fix a set of smaller usability rough edges.

**Architecture:** A new right-side slide-over `SettingsDrawer.svelte` (reusing the existing `QuestsPanel` for the reveal toggles, plus a Tracking/reset section) replaces the bottom Quests block. The home-page header becomes a toolbar (brand · search button · progress pill · settings cogwheel). Supporting changes: a `tracker.reset()` to clear owned parts, a discoverability dot on the cogwheel when quests remain, a region-panel layout fix, and ☀/☾ presentation for Equinox's Day/Night aspects.

**Tech Stack:** SvelteKit static, Svelte 5 runes, Tailwind v4 (`wf-*` theme tokens exist), Vitest, Playwright.

## Global Constraints

- **Use the existing theme tokens** (`bg-wf-panel`, `border-wf-edge`, `text-wf-gold`, `text-wf-cyan`, `text-wf-muted`, `text-wf-done`) — no new colors, keep it cohesive with Plan 6.
- **No new runtime deps.** Drawer/dialog are hand-rolled Svelte.
- **Accessibility:** the drawer is `role="dialog" aria-modal="true"`, closes on `Escape` and backdrop click, focuses its close button (or first control) on open, restores focus to the cogwheel on close. Reuse the palette's a11y idiom.
- **Spoiler-safe discoverability:** the cogwheel's "there's more" cue must NOT name or reveal any gated region — a neutral dot/indicator only, driven by "some quest is not yet completed".
- **Equinox reality:** the data models Equinox as `bp` + `dayaspect` + `nightaspect` (2 atomic aspect drops) — there are NO finer subcomponents. This plan only improves the _presentation_ of those two aspects (☀/☾), it does NOT invent parts.
- **Keep existing test hooks:** the `[data-quest]`/`[data-done]` rows (QuestsPanel), `[data-part]`/`[data-owned]` rows (RegionPanel), `[role="dialog"]` (palette), and all text the tests assert on must remain. Tests that move a control behind the drawer must open the drawer first (this plan updates them).
- pnpm; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD for logic; signed commits (`git commit -S -s`); `pnpm lint` clean; `format:check` green (`static/data/dataset.json` oxfmt-ignored; format only touched files, `.svelte` via prettier). Validate every `.svelte` with the Svelte MCP autofixer.

---

### Task 1: Tracker reset (clear owned parts)

**Files:**

- Modify: `src/lib/tracker/tracker.svelte.ts`
- Test: `src/lib/tracker/tracker.svelte.test.ts`

**Interfaces:**

- Consumes: the existing `owned` SvelteSet + its `$effect.root` autosave.
- Produces: `reset(): void` on the tracker return object — `owned.clear()` (the existing owned-autosave `$effect` then persists `[]`). Does NOT touch `completedQuests` (quests are progression config, not tracked parts).

- [ ] **Step 1: Write the failing test** — `createTracker(seed.warframes)`; `togglePart('rhino:bp')`; assert owned; call `reset()`; assert `isOwned('rhino:bp') === false` and `snapshot()` is empty. Add a persist-fires case mirroring the existing `wires persist` test: `createTracker(seed.warframes, (ids)=>calls.push([...ids]))`, own a part, `reset()`, `flushSync()`, assert the last persist call is `[]`. `dispose()`.
- [ ] **Step 2: Run — expect FAIL** (`pnpm vitest run src/lib/tracker/tracker.svelte.test.ts`).
- [ ] **Step 3: Implement** — add `reset: () => owned.clear()` to the returned object.
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 5: Commit** — `feat: tracker.reset() to clear tracked parts`.

---

### Task 2: SettingsDrawer component

**Files:**

- Create: `src/lib/panel/SettingsDrawer.svelte`
- Test: `src/lib/panel/SettingsDrawer.svelte.test.ts`

**Interfaces:**

- Consumes: `QuestsPanel` (`$lib/panel/QuestsPanel.svelte`), `Tracker` type, `Dataset` type, `tracker.reset()` (Task 1).
- Props: `{ dataset: Dataset; tracker: Tracker; open: boolean; onclose: () => void }`.
- Behavior: renders nothing when `!open`. When open: a fixed backdrop (`fixed inset-0 z-40 bg-black/50`, click → `onclose`) + a right-anchored panel (`fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-wf-panel border-l border-wf-edge p-5`), `role="dialog" aria-modal="true" aria-label="Settings"`. Header row: an `<h2 class="text-wf-gold">Settings</h2>` + a close `<button data-close-settings aria-label="Close settings">✕</button>`. Body: `{#if dataset.quests.length}<QuestsPanel {dataset} {tracker} />{/if}` (the reveal toggles), then a Tracking section: a heading + a two-step reset control — a `<button data-reset-tracking>` "Reset tracked parts"; on first click it swaps to a confirm state (`data-confirm-reset` "Confirm reset" + a "Cancel"); confirm calls `tracker.reset()` and returns to the idle state. Keyboard: `Escape` → `onclose`; focus the close button on open; restore focus to the previously-focused element on close (mirror the CommandPalette pattern).

- [ ] **Step 1: Write the failing test** — render with the seed + a `createTracker(seed.warframes)`, `open:true`, spy `onclose`. Assert `role="dialog"` present + "Settings" heading; `[data-close-settings]` click calls `onclose`; `Escape` keydown calls `onclose`; `open:false` renders nothing. Reset flow: own a part first (`tracker.togglePart('rhino:bp')`), click `[data-reset-tracking]` → `[data-confirm-reset]` appears; click it → `tracker.isOwned('rhino:bp')` is now false. If the seed has quests, assert a `[data-quest]` row renders (proving QuestsPanel is embedded).
- [ ] **Step 2: Run — expect FAIL**; implement (validate with the Svelte MCP autofixer).
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 4: Commit** — `feat: SettingsDrawer (quests + reset tracking) slide-over`.

---

### Task 3: Header toolbar + wire the drawer

**Files:**

- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/page.svelte.test.ts`

**Interfaces:**

- Consumes: `SettingsDrawer` (Task 2), the existing palette state, `tracker.total`, `tracker.isQuestDone`.
- Behavior:
  - Replace the current header with a toolbar: brand (`wf` gold + `oracle` cyan) on the left; a right cluster containing (1) a **search button** `<button data-open-palette onclick={() => (paletteOpen = true)}>` styled as a pill with a 🔍/magnifier glyph + "Search" + a `Ctrl K` `<kbd>` hint (replaces the old plain chip; keep `data-open-palette`); (2) a **progress pill** showing `{owned}/{total}` frames with a thin fill bar (`width: {total ? owned/total*100 : 0}%`, `bg-wf-cyan`); (3) a **settings cogwheel** `<button data-open-settings aria-label="Settings" onclick={() => (settingsOpen = true)}>` (⚙ glyph) with a small **discoverability dot** shown when `data.quests.some((q) => !tracker.isQuestDone(q.id))` (an absolutely-positioned `bg-wf-gold` dot, `aria-hidden`).
  - `let settingsOpen = $state(false);`
  - Render `<SettingsDrawer dataset={data} {tracker} open={settingsOpen} onclose={() => (settingsOpen = false)} />` (near the palette).
  - **Remove** the bottom `{#if data.quests.length}<QuestsPanel .../>{/if}` block (it now lives in the drawer).
  - Keep the chart/RegionPanel/footer, the `ready` guard, `$effect` reconciliation, `<svelte:window>` Ctrl-K, and `CommandPalette`.
- Test: extend `page.svelte.test.ts` — after load, the bottom QuestsPanel is gone (a `[data-quest]` row is NOT present initially: `expect(screen.queryByText('Heart of Deimos')).toBeNull()`); clicking `[data-open-settings]` opens the drawer (`getByRole('dialog')` → the Settings drawer) and NOW a `[data-quest="heartofdeimos"]` row is present; toggling it still reveals Deimos on the chart (drive the click, assert `DEIMOS` appears). Progress pill shows the frames count. Keep the palette test assertions (they may need the search button's new `data-open-palette` — unchanged hook).

- [ ] **Step 1: Implement** the toolbar + drawer wiring + removal of the bottom panel (validate `+page.svelte` with the Svelte MCP autofixer).
- [ ] **Step 2: Update the test** as above.
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 4: Commit** — `feat: header toolbar (search + progress + settings cogwheel); move Quests into the drawer`.

---

### Task 4: Region panel polish — layout + Equinox aspects

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:** none new (presentational).

- [ ] **Step 1: Fix the sparse-gap layout** — the frame/resources grid (`grid gap-4 md:grid-cols-2`) stretches both cards to equal height, leaving dead space under a short frame card. Add `items-start` to the grid so each card takes its natural height. (Verify the two cards no longer force-match height.)
- [ ] **Step 2: Equinox aspect presentation** — in the part-row rendering, when `part.slot === 'dayaspect'` prefix the label with a sun glyph `☀` and when `part.slot === 'nightaspect'` a moon `☾` (e.g. via a small `SLOT_ICON` map `{ dayaspect: '☀', nightaspect: '☾' }` rendered before `SLOT_LABEL[part.slot]`, `aria-hidden` on the glyph). Do NOT change the `data-part`/`data-owned` hooks or the `SLOT_LABEL` text. Optionally add a one-line muted note under an Equinox frame block ("Assembled from its Day and Night aspects.") — only when the frame has aspect parts.
- [ ] **Step 3: Test** — extend `RegionPanel.svelte.test.ts`: with the existing Equinox-shaped fixture (Uranus/Titania/Equinox with dayaspect/nightaspect), assert the sun `☀` and moon `☾` glyphs render alongside `Day Aspect`/`Night Aspect` (e.g. `screen.getByText('☀')` or the row text contains it), and that `[data-part="equinox:dayaspect"]` still exists. Assert the grid container has the `items-start` class (query the grid element).
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`); validate the .svelte with the Svelte MCP autofixer.
- [ ] **Step 5: Commit** — `feat: tighten region panel layout + ☀/☾ Equinox aspects`.

---

### Task 5: End-to-end — settings drawer, reset, search

**Files:**

- Modify: `e2e/spoiler.test.ts` (open the drawer before toggling the quest)
- Create: `e2e/settings.test.ts`

**Interfaces:** the running app.

- [ ] **Step 1: Fix the existing spoiler e2e** — `e2e/spoiler.test.ts` currently clicks `[data-quest="heartofdeimos"]` directly, but that row now lives in the settings drawer. Insert `await page.locator('[data-open-settings]').click();` (and wait for the drawer dialog) BEFORE the quest toggle; the rest (Deimos reveal → Nekros → reload persists) stays. Run it to confirm green.
- [ ] **Step 2: New `e2e/settings.test.ts`** —
  - (a) load `/`; assert no `[data-quest]` visible initially (drawer closed); click `[data-open-settings]`; assert the Settings `[role="dialog"]` visible and a `[data-quest="heartofdeimos"]` row appears; press `Escape`; assert the drawer closed.
  - (b) Reset tracking: open a region with a frame (e.g. select Venus via the chart, toggle a `[data-part]` so the progress increments), open settings, click `[data-reset-tracking]` then `[data-confirm-reset]`, close the drawer, assert the previously-owned `[data-part]` is now `data-owned="false"` and the header progress pill shows `0/…`.
  - (c) Search button: click `[data-open-palette]`; assert the command palette `[role="dialog"]` opens.
- [ ] **Step 3: Run — expect PASS** (`pnpm exec playwright test`; all existing e2e green); `pnpm build` prerenders cleanly.
- [ ] **Step 4: Commit** — `test: e2e for the settings drawer, reset, and search button`.

---

### Task 6: Visual verification pass

**Files:** none (controller/human gate).

- [ ] **Step 1: Screenshot** — build + preview; capture: the home page (header toolbar + a selected region, confirming the tightened layout), the open settings drawer (quests + reset), the progress pill, and the cogwheel discoverability dot. Confirm one cohesive themed look, readable contrast, and that the Quests block is gone from the body. Save under the scratchpad. (Controller review gate, not an automated test.)
- [ ] **Step 2: Commit** — none (verification only); fold any tweaks into the relevant task.

---

## Self-Review

**Spec coverage:**

- Quests moved off the body into a cogwheel-triggered slide-over drawer → Tasks 2, 3. ✅
- Header toolbar (search button + progress pill + settings cogwheel) → Task 3. ✅
- Progress bar → Task 3 (pill with fill). ✅
- Reset tracking control (with confirm) → Tasks 1, 2, 5. ✅
- Tighten region panel (sparse gap) → Task 4. ✅
- Discoverability hint (spoiler-safe cogwheel dot) → Task 3. ✅
- Better Equinox day/night presentation (☀/☾; no fake subcomponents — data has none) → Task 4. ✅
- Deferred (correctly out of scope): switchable themes; global (all-routes) settings; the palette a11y fast-follow (focus-trap/combobox) from Plan 6.

**Placeholder scan:** every step carries concrete behavior/selectors; the drawer/toolbar reuse existing themed idioms. ✅

**Type consistency:** `tracker.reset()` (Task 1) consumed by Tasks 2/5; `SettingsDrawer` props (`dataset/tracker/open/onclose`) consistent between Tasks 2 and 3; test hooks `[data-open-settings]`/`[data-close-settings]`/`[data-reset-tracking]`/`[data-confirm-reset]`/`[data-open-palette]`/`[data-quest]` used consistently across Tasks 3 and 5. ✅

**Note for executor:** moving QuestsPanel into the drawer breaks any test/e2e that toggles `[data-quest]` from the body — Task 3 updates the unit test and Task 5 updates `e2e/spoiler.test.ts`; grep for `data-quest` and `Heart of Deimos` before finishing to catch any other reference. Keep the discoverability dot spoiler-safe (driven only by "some quest incomplete", never naming regions).
