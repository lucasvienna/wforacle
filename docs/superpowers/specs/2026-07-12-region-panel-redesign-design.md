# RegionPanel redesign — "Frames band + resource rail"

**Date:** 2026-07-12
**Status:** Approved design → ready for implementation plan

## Problem

Warframe planets now carry up to four farmable frames. From `static/data/dataset.json`:

| Region         | Assassination | Free Roam | Total |
| -------------- | :-----------: | :-------: | :---: |
| Earth          |       1       |     3     |   4   |
| Venus          |       1       |     3     |   4   |
| Deimos         |       1       |     2     |   3   |
| Jupiter / Eris |       2       |     0     |   2   |
| (most others)  |       1       |     0     |   1   |

The current `src/lib/panel/RegionPanel.svelte` (one ~418-line component) is a rigid
2-column grid: **left = every frame rendered as a fully-expanded card** (header +
avatar + all part-rows + toggle button), **right = resources list**. At four frames
this produces four concrete problems, all confirmed as in-scope:

1. **Everything expanded at once** — no way to collapse frames you've finished or
   don't care about; the left column becomes a tall stack.
2. **Lopsided split** — the tall frame column dwarfs the short resource column,
   wasting horizontal space in the 1536px layout.
3. **No sense of progress/priority** — every card reads as equal weight; you can't
   see at a glance which frames are done vs in-progress.
4. **Assassination vs free-roam muddled** — the two acquisition types are stacked
   together with the distinction lost.

## Goal

Redesign `RegionPanel` so a 4-frame planet is scannable: frames are collapsible,
progress-aware, grouped by acquisition type, and laid out to use the wide viewport
instead of stacking vertically. Resources move to a compact side rail.

## Non-goals (YAGNI)

- No persistence of expand/collapse state.
- No new dataset fields — reuse existing structure and helpers.
- No changes to `StarChart`, the world-state store, or the command palette.
- The deferred small-screen StarChart issue is untouched.

## Chosen approach: Frames band + resource rail

Selected over "keep 2-col compact" and "segmented tabs". Rationale: it directly
fixes all four problems — the band uses horizontal space (frames wrap into a grid
instead of stacking), grouping headers separate acquisition types, collapsible
progress-aware cards fix expansion + priority, and the rail reclaims the wasted
right column without hiding content behind tab navigation.

### Layout

- Outer grid: `lg:grid-cols-[1fr_20rem]` → **frames band** (`1fr`) + **resource
  rail** (~`20rem`, `lg:sticky lg:top-4`). On `< lg` it stacks; the rail drops
  below the band.
- Inside the band, cards live in a responsive grid
  (`grid gap-3 sm:grid-cols-2 xl:grid-cols-3`) so four frames wrap **2–3 across**
  rather than stacking.
- Two group sections, each rendered only when non-empty:
  - **Assassination** — header, then its cards. The assassination card spans two
    columns (`sm:col-span-2`) to read as the region's primary frame.
  - **Free Roam** — keeps the existing per-zone grouping: for each open-world zone
    node, a subheader (zone node name + live cycle line, e.g. `☀ day · 12m`) above
    that zone's card grid.

### Component decomposition

The current monolith is split into focused, independently testable units:

- **`RegionPanel.svelte`** — layout shell only. Derives the grouped frame blocks
  and resources, renders the band/rail grid, group + zone headers, and empty
  states. Passes props down.
- **`FrameCard.svelte`** — one collapsible frame. Renders the header (avatar ·
  name · progress bar · `N/M` · source tag · availability summary) + expand toggle
  - the part checklist (the current `frameCard` snippet body). Owns its own
    ephemeral `expanded` state.
- **`ResourceRail.svelte`** — the resource list (early/late badges, per-phase best
  farm lines, guide link), extracted from the current right `<section>` and
  restyled to the narrower rail width.
- **`regionFrames.ts`** — a pure helper returning the grouped frame blocks for a
  region, so grouping logic is unit-testable without mounting a component.

Reused unchanged: `resourcesForRegion`, `bestPhaseRec` (`model/resources.ts`);
`partAvailability`, `nextActiveAt`, `formatCountdown` (`worldstate/availability.ts`).

### Data flow

`regionFrames(dataset, regionId)` returns two groups derived exactly as today:

- **Assassination entries** — `dataset.nodes.filter(isAssassination && frameId)`
  joined to `boss` and `frame` (a region can have multiple, e.g. Jupiter = 2).
- **Open-world zones** — `dataset.openWorldFarms` for the region, grouped by
  `nodeId` into `{ node, entries: { frame, farm }[] }`.

`RegionPanel` derives `region`, these two groups, and `resourcesForRegion(...)`.
Each `FrameCard` receives: `frame`, `tracker`, `subLine`, `sourceText(part)`,
optional `avail(part)`, and `defaultExpanded`. The `sourceLabel` / `owSourceText`
/ `owAvailabilityChip` computations stay in `RegionPanel` and are passed to the
card as the `sourceText` / `avail` closures — `FrameCard` stays presentational and
never reaches into the dataset itself, matching today's snippet contract.

### Expand behavior — smart-auto, reset per visit

- `defaultExpanded = count.owned < count.total`. **Complete frames start collapsed
  and dimmed (`✓ done`); in-progress/unstarted frames start expanded** with their
  checklist. Multiple cards may be open at once.
- The default is applied **only at initial render**, not reactively — checking off
  the last part while a card is open must NOT snap it shut mid-interaction. After
  mount, the user's manual expand/collapse is respected for the rest of the visit.
- **Reset per visit** via keying the card `{#each}` on `regionId + frame.id`:
  switching planets tears down and recreates `FrameCard` instances, re-deriving the
  initial state from current ownership. No persistence, no storage, no `$effect`.

### Card states

**Collapsed** shows: avatar · name · progress bar + `N/M owned` · source tag
(`Grineer · Assassination` / `· Free Roam`, with existing faction accent colours
and the `· key` hint for key bosses) · availability summary for free-roam cards
(`● up now` if any _unowned_ part is currently available; otherwise
`○ up in …` / `● always available`). Complete → dimmed container + `✓ done`.

**Expanded** adds: the existing part-row checklist (checkbox · slot label with
day/night glyph · source text · availability chip) + the "Toggle whole frame"
button.

Progress bar colour: emerald (complete) / cyan→gold gradient (partial) / muted
(empty).

### Preserved test hooks

Keep these DOM attributes so existing unit/e2e tests keep passing:
`data-part`, `data-owned` (part rows), `data-key` (key-boss hint),
`data-zone-cycle` (zone cycle line). Add `data-frame` / `data-expanded` on the
card root for the new collapse tests.

### Empty / degraded states

- No assassination entries **and** no open-world zones → "No farmable frames here
  yet." (broadened from today's "no Assassination frame here yet").
- No resources → "No notable resources."
- No `worldState` → availability summaries and cycle lines omit silently (already
  handled by the availability helpers returning `null`).

## Styling

Visual polish (progress bar, card density, rail spacing, dimmed-done treatment)
leans on the installed `ui-ux-pro-max` design skill during implementation, within
the existing Tailwind `wf-*` token palette (`wf-gold`, `wf-cyan`, `wf-edge`,
`wf-panel`, `wf-muted`). No new colour tokens.

## Testing

- **`regionFrames.test.ts`** — grouping: multi-assassination (Jupiter = 2),
  multi-freeroam single zone (Earth = 3), mixed (Deimos), and empty region.
- **`FrameCard.svelte.test.ts`** — initial expand derived from progress
  (complete → collapsed, partial → expanded); manual toggle expand/collapse;
  toggling the last part while open does not auto-collapse; part click calls
  `tracker.togglePart`; "toggle whole frame" calls `tracker.toggleFrame`;
  free-roam availability summary (up-now / next-up / always) logic.
- **`ResourceRail.svelte.test.ts`** — early/late "best here" badges, per-phase
  best-farm lines (here vs elsewhere), guide link presence, empty state
  (ported from current `RegionPanel.svelte.test.ts`).
- **`RegionPanel.svelte.test.ts`** — reworked to the new structure: renders both
  group headers when both present, per-zone cycle subheader, hides a group when
  empty, empty-region copy, and card `{#each}` re-keys on `regionId` change.

## Success criteria

- Earth/Venus (4 frames) render as a wrapped grid, not a single tall column;
  resource rail sits alongside.
- Completed frames are collapsed + dimmed on open; in-progress frames are expanded.
- Assassination and Free Roam are visually distinct sections.
- Each card shows `N/M` + a progress bar without expanding.
- Switching planets re-derives expand state from ownership.
- All existing tracker/world-state tests pass (hooks preserved); new component
  tests pass; `lint:check` and typecheck clean.
