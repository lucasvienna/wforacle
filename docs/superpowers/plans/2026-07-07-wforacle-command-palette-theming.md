# wforacle Command Palette & Theming (Plan 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Ctrl-K command palette to jump anywhere on the Star Chart, and a focused theming polish pass that gives the UI one cohesive Warframe-flavored look.

**Architecture:** Two workstreams. (A) Palette: a pure search module (`buildPaletteItems` + `filterPaletteItems`) feeds a Svelte-native modal `CommandPalette.svelte` (no new deps), wired into the home page — regions/frames set `selectedId`, resources navigate to their guide. (B) Theming: define a cohesive token palette in `app.css` via Tailwind v4 `@theme`, then apply the tokens across the shared surfaces (header, panels, badges, links, chart accents).

**Tech Stack:** SvelteKit static, Svelte 5 runes, Tailwind v4 (`@import 'tailwindcss'` + `@theme`), Vitest, Playwright.

## Global Constraints

- **No new runtime dependencies.** Fuzzy matching and the modal are hand-rolled (Svelte-native), per project preference.
- **Cross-platform trigger.** Open on `(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'`, `preventDefault()`. Close on `Escape` or backdrop click. (Primary target is Windows/WSL → Ctrl.)
- **Spoiler-aware.** The palette only surfaces regions and frames from the currently-VISIBLE regions (`revealedRegions(...)`), never a spoiler-gated region before its quest is toggled. Resources are informational and are all searchable.
- **Palette scope:** home page only (where the chart + selection live). Region/frame items set `selectedId`; resource items `goto` `${base}/guides/${id}` and only include resources that have a guide (`recommendations.length > 0`).
- **Accessibility.** The palette is `role="dialog"` `aria-modal="true"`; the input is focused on open; ↑/↓ move the highlighted result, Enter activates it, Esc closes. Result rows are buttons.
- **Theming is additive & non-breaking.** Existing component tests assert text/roles/`data-*`, not colors — restyling must keep them green. Keep the existing `--wf-bg`/`--wf-bg-glow`/`--wf-text` vars working.
- pnpm; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD for pure/logic code; signed commits (`git commit -S -s`); `pnpm lint` clean; `format:check` green (`static/data/dataset.json` is oxfmt-ignored; format only files you touch, `.svelte` via prettier). Validate every `.svelte` with the Svelte MCP autofixer.

---

### Task 1: Palette search module (pure)

**Files:**

- Create: `src/lib/palette/search.ts`
- Test: `src/lib/palette/search.test.ts`

**Interfaces:**

- Produces:
  - `type PaletteItem = { type: 'region' | 'frame' | 'resource'; id: string; label: string; sublabel: string; targetRegionId?: string }`.
  - `buildPaletteItems(dataset: Dataset, visibleRegionIds: ReadonlySet<string>): PaletteItem[]` —
    - one `region` item per region whose id ∈ `visibleRegionIds` (`label` = region.name; `sublabel` = region.kind === 'special' ? 'Special region' : 'Planet'; `targetRegionId` = region.id);
    - one `frame` item per node-linked frame whose node's `regionId` ∈ `visibleRegionIds` (`label` = frame.name; `sublabel` = 'Frame · ' + that region's name; `targetRegionId` = the region id);
    - one `resource` item per resource with `recommendations.length > 0` (`label` = resource.name; `sublabel` = 'Resource'; no `targetRegionId`).
  - `filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[]` — case-insensitive; empty/blank query returns all items unchanged; otherwise keep items whose `label` (or `sublabel`) matches and rank best-first with this score on the LABEL: exact === 0? highest; `startsWith` > word-boundary-substring > plain substring > subsequence (each char of query appears in order); non-matches on label AND sublabel are dropped. Stable order within equal scores (preserve input order — e.g. sort by `(score, originalIndex)`).

- [ ] **Step 1: Write the failing test** — build a small inline `Dataset` (2 planets incl. venus, 1 special deimos, a frame `rhino` on venus, a resource `ferrite` with a rec + a resource `kuva` with a rec). Assert: `buildPaletteItems(ds, new Set(['venus']))` yields the venus region item + rhino frame item (venus visible) but NOT deimos (not visible) and NOT a frame whose region is hidden; resource items appear regardless of visibility. Assert `filterPaletteItems(items, '')` returns all; `filterPaletteItems(items, 'rhi')` puts `rhino` first; `filterPaletteItems(items, 'ferr')` matches `ferrite`; a no-match query returns `[]`; a `startsWith` match outranks a mid-word substring match.
- [ ] **Step 2: Run — expect FAIL** (`pnpm vitest run src/lib/palette/search.test.ts`).
- [ ] **Step 3: Implement** `search.ts` (pure functions; a small `scoreLabel(label, q)` helper returning a rank number or `-1` for no match; `filterPaletteItems` maps→filters→sorts).
- [ ] **Step 4: Run — expect PASS**; `pnpm test:unit --run` all green.
- [ ] **Step 5: Commit** — `feat: palette search index + ranked filter`.

---

### Task 2: CommandPalette component

**Files:**

- Create: `src/lib/palette/CommandPalette.svelte`
- Test: `src/lib/palette/CommandPalette.svelte.test.ts`

**Interfaces:**

- Consumes: `PaletteItem`, `filterPaletteItems` (Task 1).
- Props: `{ items: PaletteItem[]; open: boolean; onclose: () => void; onselect: (item: PaletteItem) => void }`.
- Behavior: when `open`, render a fixed backdrop + centered panel with a text `<input>` (autofocused), and the `filterPaletteItems(items, query)` results (grouped or flat, each a `<button data-palette-item type={item.type}>` showing label + sublabel). A highlighted index (starts at 0) follows ↑/↓ (clamped, wraps optional); Enter calls `onselect(results[highlight])` then `onclose()`; Esc and backdrop-click call `onclose()`. Reset `query`/`highlight` when it transitions to open. `role="dialog" aria-modal="true"`, `aria-label="Command palette"`. Clicking a result row activates it.
- NOTE: this component does NOT own the Ctrl-K listener or the `open` state — the page does (Task 3). Keep it controlled via props so it's unit-testable without global key events.

- [ ] **Step 1: Write the failing test** — render `CommandPalette` with a few inline items, `open: true`, spy `onselect`/`onclose`. Assert results render; typing into the input (`fireEvent.input`) filters them (e.g. only matching labels remain); pressing `Enter` (keydown) calls `onselect` with the highlighted item and `onclose`; pressing `Escape` calls `onclose`. Assert `role="dialog"` present. Assert `open: false` renders nothing.
- [ ] **Step 2: Run — expect FAIL**; implement the component (validate with the Svelte MCP autofixer; use `$effect`/`$derived` for the filtered results + a bound input; `tick()`/autofocus on open).
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 4: Commit** — `feat: CommandPalette modal (search, keyboard nav, a11y)`.

---

### Task 3: Wire the palette into the home page

**Files:**

- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/page.svelte.test.ts`

**Interfaces:**

- Consumes: `buildPaletteItems` (Task 1), `CommandPalette` (Task 2), `goto` (`$app/navigation`), `base` (`$app/paths`).
- Behavior: add `let paletteOpen = $state(false)`. A `<svelte:window onkeydown={...} />` opens it on Ctrl/Cmd-K (`preventDefault`). `let paletteItems = $derived(data ? buildPaletteItems(data, new Set(visible.map((r) => r.id))) : [])`. Render `<CommandPalette items={paletteItems} open={paletteOpen} onclose={() => (paletteOpen = false)} onselect={handlePick} />` where `handlePick(item)` sets `selectedId = item.targetRegionId` for region/frame items (with a `targetRegionId`) or `goto(\`${base}/guides/${item.id}\`)`for resource items. Add a small, unobtrusive hint/button in the header (e.g. a`⌘K`/`Ctrl K` chip that opens the palette on click) so the feature is discoverable.

- [ ] **Step 1: Implement** the wiring (keep the `ready` guard, `$effect` selectedId reconciliation, and existing layout). Validate `+page.svelte` with the Svelte MCP autofixer.
- [ ] **Step 2: Update the smoke test** — mock `loadDataset` (reuse the existing `withDeimos`-style fixture) and `$app/navigation`'s `goto`; after load, simulate the header chip click (or dispatch a Ctrl-K keydown on window) → palette opens; type a planet name → the region result appears; clicking it closes the palette and the RegionPanel reflects the new `selectedId`. Assert a resource pick calls the mocked `goto` with `/guides/<id>`.
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 4: Commit** — `feat: wire Ctrl-K command palette into the home page`.

---

### Task 4: End-to-end — palette navigation

**Files:**

- Create: `e2e/palette.test.ts`

**Interfaces:** the running app.

- [ ] **Step 1: e2e test** — load `/`; press `Control+KeyK` (`page.keyboard.press('Control+k')`); assert the palette dialog is visible (`[role="dialog"]`). Type a planet name not currently selected (e.g. `Mars`); assert a result row appears; press `Enter`; assert the palette closes and the RegionPanel now shows that region (e.g. its heading / a known frame). Then reopen, type a resource name (e.g. `Ferrite`), Enter, and assert the URL is now `**/guides/ferrite` (`await expect(page).toHaveURL(/\/guides\/ferrite$/)`). Use robust waits; scope chart labels to `svg` if needed.
- [ ] **Step 2: Run — expect PASS** (`pnpm exec playwright test`; existing e2e stay green); `pnpm build` prerenders cleanly.
- [ ] **Step 3: Commit** — `test: e2e for the Ctrl-K command palette`.

---

### Task 5: Theme tokens

**Files:**

- Modify: `src/app.css`

**Interfaces:**

- Produces: a cohesive token palette exposed as Tailwind v4 utilities via `@theme`, plus base vars. Add an `@theme { ... }` block defining (names illustrative — pick tasteful Warframe values):
  - `--color-wf-gold: #e6b854;` (Orokin gold accent)
  - `--color-wf-cyan: #37d2e6;` (void/interactive cyan)
  - `--color-wf-panel: #0c1522;` (card surface)
  - `--color-wf-edge: #1c3350;` (border)
  - `--color-wf-muted: #7f97b3;` (secondary text)
  - `--color-wf-done: #2ee6a0;` / `--color-wf-partial: #e6b854;` (tracker status — reuse gold)
    These generate `bg-wf-panel`, `border-wf-edge`, `text-wf-gold`, `text-wf-cyan`, `text-wf-muted`, etc. Keep the existing `:root` `--wf-bg`/`--wf-bg-glow`/`--wf-text` and body gradient. Update the top comment to describe the cohesive single theme.

- [ ] **Step 1: Implement** — add the `@theme` block; keep the base layer. Verify the utilities compile: `pnpm build` succeeds (Tailwind picks up the tokens). No behavior change yet.
- [ ] **Step 2: Run** — `pnpm test:unit --run` green (no test impact); `pnpm build` OK.
- [ ] **Step 3: Commit** — `feat(theme): cohesive Warframe token palette`.

---

### Task 6: Apply the theme across surfaces

**Files:**

- Modify: `src/routes/+page.svelte` (header/brand, containers)
- Modify: `src/lib/panel/RegionPanel.svelte` (cards, headings, badges, links)
- Modify: `src/lib/panel/QuestsPanel.svelte` (card, rows)
- Modify: `src/lib/starchart/StarChart.svelte` (accent hexes → match tokens)
- Modify: `src/routes/guides/[resource]/+page.svelte` (cards, links)
- Modify: `src/lib/palette/CommandPalette.svelte` (match the themed surfaces)

**Interfaces:** none (presentational).

- [ ] **Step 1: Apply tokens** — replace the ad-hoc `slate-900/70` card backgrounds with `bg-wf-panel`, `slate-700` borders with `border-wf-edge`, brand/heading accents with `text-wf-gold`, interactive/links with `text-wf-cyan` (and its hover), muted text with `text-wf-muted`. In `StarChart.svelte`, keep the existing cyan/gold selection & status treatment but align the hex literals to the token values (`#37d2e6` cyan, `#e6b854` gold) so the chart and chrome read as one theme. Keep all `data-*`, roles, and text unchanged (so tests pass). Be consistent, not exhaustive — this is a polish pass, not a rewrite; don't restyle anything that already uses the accent colors correctly.
- [ ] **Step 2: Validate** — run the Svelte MCP autofixer on every changed `.svelte`; `pnpm test:unit --run` all green (content/behavior unchanged); `pnpm lint`; format touched files (`pnpm exec prettier --write` the `.svelte` files, `pnpm exec oxfmt src/app.css` if applicable). Build once: `pnpm build`.
- [ ] **Step 3: Visual check** — build + preview and screenshot the home page (chart + a selected region panel) and the open palette; confirm one cohesive gold/cyan-accented look with readable contrast. Save screenshots under the scratchpad. (This is a gate for the controller's review, not an automated test.)
- [ ] **Step 4: Commit** — `feat(theme): apply the Warframe palette across chart, panels, palette, guides`.

---

## Self-Review

**Spec coverage:**

- Ctrl-K command palette (search regions/frames/resources; jump on chart / open guide; keyboard + a11y; no new deps; spoiler-aware) → Tasks 1–4. ✅
- Focused theming polish pass (cohesive single-theme token palette applied across surfaces, no switcher) → Tasks 5–6. ✅
- Deferred (correctly out of scope): switchable/multiple themes; a global (all-routes) palette; palette command actions beyond navigation (e.g. toggling a part/quest).

**Placeholder scan:** every code step has a concrete contract or code; theming values are given as concrete tokens (tune during Task 5/6, but no TBDs). ✅

**Type consistency:** `PaletteItem` shape + `buildPaletteItems`/`filterPaletteItems` signatures stable across Tasks 1–3; `CommandPalette` prop names (`items/open/onclose/onselect`) consistent between Tasks 2 and 3; `targetRegionId` drives the region/frame-vs-resource branch in `handlePick`. ✅

**Note for executor:** the palette lives on the home page only — a resource pick uses `goto` to leave for `/guides/<id>`, which is expected. Keep the `@theme` token names stable between Task 5 and Task 6 (Task 6 consumes exactly what Task 5 defines). Don't let the theming pass alter any text, `data-*`, or `role` the existing tests assert on.
