# Equinox: individually-trackable aspect blueprints

**Date:** 2026-07-15
**Status:** Approved — ready for planning

## Problem

Equinox is currently tracked as three checkboxes: main Blueprint (Market),
Day Aspect, and Night Aspect. Each aspect carries `subDrops` — a reference-only
list (Neuroptics/Chassis/Systems drop rates) rendered as a collapsible
"Blueprints" text block. The user dislikes this presentation and wants to
**check off each sub-blueprint individually**.

Equinox's real crafting tree is deeper than the tracker models: the full frame
is `main BP + Day (Aspect BP + Neuroptics + Chassis + Systems) + Night (same 4)`
= **9 farmable items**. The current dataset collapses each aspect into a single
checkbox. This change exposes that hidden depth as trackable state.

## Decisions

- **Fully trackable:** each sub-blueprint becomes its own checkbox that counts
  toward Equinox completion, replacing the single Day/Night aspect checkboxes.
  Completion goes from 0/3 → **0/9**.
- **Layout:** collapsible aspect groups. Day/Night are collapsible headers
  (`▾ ☀ Day Aspect   2/4`) showing a sun/moon glyph, name, and a derived
  owned/4 rollup count. Under each, four leaf checkbox rows. The header caret
  toggles collapse only (no bulk-check).
- **Bottom note:** a single info line under the parts —
  "Each Tyl Regor kill drops one Day and one Night component." — replaces the
  per-aspect "guaranteed each kill" labels.
- **No migration:** the app has no users yet. Old `equinox:dayaspect` /
  `equinox:nightaspect` keys (if any existed) are simply ignored; no migration
  code is written.

## Design

### 1. Data model (`src/lib/model/types.ts`)

- **Remove** `subDrops` from `WarframePart` — sub-blueprints are now real parts,
  so the reference-only field is obsolete.
- **Add** `aspect?: 'day' | 'night'` to `WarframePart` — marks a leaf as
  belonging to an aspect group.
- **Remove** `dayaspect` / `nightaspect` from the `Slot` union. Each aspect's
  four leaves reuse existing slots: `bp` (the Aspect Blueprint), `neuroptics`,
  `chassis`, `systems`.

Equinox's `parts` array becomes 9 entries, in order:

1. `bp` — main blueprint, ungrouped (Market, 25,000cr)
2. Day: `bp`, `neuroptics`, `chassis`, `systems` (`aspect: 'day'`)
3. Night: `bp`, `neuroptics`, `chassis`, `systems` (`aspect: 'night'`)

### 2. Part identity (`src/lib/model/completion.ts`)

- Aspect leaf id = `${frameId}:${aspect}:${slot}` (e.g. `equinox:day:bp`,
  `equinox:day:neuroptics`). Ungrouped parts keep `${frameId}:${slot}`
  (e.g. `equinox:bp`).
- `partId` gains an optional `aspect` parameter:
  `partId(frameId, slot, aspect?)`.
- `frameCompletion` already counts `frame.parts.length` and filters by
  `owned.has(p.id)`, so Equinox reports **owned/9** with no change to counting
  logic.

### 3. Build script (`scripts/data/build.ts` + `scripts/data/curated.ts`)

- Replace `ASSASSINATION_PART_DETAIL` (subDrops) with an aspect-leaf spec keyed
  by frame id → aspect → leaf list. For `equinox`:
  - `day`: Aspect BP (chance from the @wfcd Day Aspect drop, 22.56%),
    Neuroptics 25.81%, Chassis 25.81%, Systems 25.81%
  - `night`: same shape, from the @wfcd Night Aspect drop
- In `buildFrames`, when a frame has an aspect-leaf spec, emit the aspect leaves
  (with `aspect`, unique ids, and per-leaf `chance`) instead of a single
  `dayaspect`/`nightaspect` part. The aspect-BP chance is sourced from the
  existing `chanceBySlot` entry for that aspect; component chances are curated.
- `SLOT_BY_COMPONENT` / `ORDER`: drop the `dayaspect` / `nightaspect` mappings;
  the aspect components are injected from the leaf spec, not from raw @wfcd
  component rows.
- Rebuild `scripts/data/fixtures/warframes.sample.json` and the shipped dataset.

### 4. Rendering

**New `src/lib/panel/AspectGroup.svelte`** (replaces `AspectBreakdown.svelte`):

- Props: `aspect` label config (glyph + name), the group's leaf parts, `tracker`,
  and a `sourceText`/leaf-formatter.
- Collapsible header: caret + glyph + name + derived `owned/total` count.
  Seed collapsed-if-complete (seed-once `$state`, mirroring the current
  `AspectBreakdown` / `FrameCard` pattern). Caret click `stopPropagation` so it
  never toggles a parent row.
- Four leaf checkbox rows, each reusing the same checkbox row markup/behavior as
  FrameCard's part rows (role=checkbox, keyboard toggle via `tracker.togglePart`).
  Leaf shows label + right-aligned muted drop-% (`22.56%`); no repeated boss name.

**`src/lib/panel/FrameCard.svelte`:**

- Derive a render list partitioning `frame.parts` into ungrouped rows (rendered
  as today) and aspect groups (rendered via `AspectGroup`), preserving order.
- `SLOT_LABEL`: render `bp` as **"Aspect Blueprint"** when `part.aspect` is set,
  else "Blueprint".
- Keep the "Assembled from its Day and Night aspects." line.
- Add the bottom note ("ⓘ Each Tyl Regor kill drops one Day and one Night
  component.") when the frame has aspect parts.
- "Toggle whole frame" still iterates all 9 parts via `tracker.toggleFrame`.

### 5. RegionPanel wiring (`src/lib/panel/RegionPanel.svelte`)

- Remove the `part.subDrops` special case in `assassinationSourceText` (the
  "{boss} · guaranteed each kill" branch). Leaves render their `chance`; the
  bottom note carries cadence.

### 6. Cleanup

- Delete `aspectBreakdownLines` from `src/lib/panel/format.ts` (+ its tests).
  `formatChance` stays.
- Delete `AspectBreakdown.svelte` and its test.

## Testing (TDD)

- `completion.test.ts`: Equinox has 9 parts with unique ids; `partId` with
  `aspect` yields `equinox:day:bp`; completion counts /9.
- Build test: aspect leaves emitted with correct slots, aspect tags, ids, and
  chances; no `dayaspect`/`nightaspect` slot or `subDrops` in output.
- `AspectGroup.svelte.test.ts`: renders 4 leaves, rollup count reflects owned,
  leaf click toggles part, caret toggles collapse without toggling parts,
  seed collapsed-if-complete.
- `FrameCard.svelte.test.ts`: Equinox renders two aspect groups + main bp +
  bottom note; "Aspect Blueprint" label under a group; toggle-whole-frame hits
  all 9.
- `RegionPanel.svelte.test.ts`: aspect leaf source text shows chance, no
  "guaranteed each kill".

## Out of scope

- Per-aspect bulk "check all 4" control (not requested; YAGNI).
- Migration of old localStorage keys (no users yet).
- Any non-Equinox frame (Equinox is the only frame with aspect sub-builds).
