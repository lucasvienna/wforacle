# Equinox aspect sub-blueprint breakdown

**Date:** 2026-07-14
**Status:** Approved — ready for implementation plan
**Base:** stacked on `fix/exact-drop-rate` (PR #12 — provides `formatChance`)

## Problem

Equinox is the one star-chart frame our `@wfcd/items`-sourced data misrepresents:

1. **Flattened components.** `@wfcd` models Equinox as `Blueprint` + `Day Aspect` + `Night Aspect`, collapsing each aspect and hiding that each is itself built from an **Aspect Blueprint + Neuroptics + Chassis + Systems**. The tracker shows two aspect rows with no indication of the real sub-build.
2. **Stale mechanic.** `@wfcd` still encodes the pre-Update-42 single-drop **Rotation A/B** model. **Update 42: The Shadowgrapher (2026)** changed Tyl Regor: defeating him now **drops two guaranteed component blueprints per kill — one from the Day side, one from the Night side** — the rotation gating is gone.

The per-component *rates* are still current (each side is a 100% table: Aspect 22.56% + Neuroptics/Chassis/Systems 25.81% each). Update 42 only removed the gating, so the numbers stay valid; only "Rotation A/B" is obsolete.

## Decisions (from brainstorming)

- **Granularity:** keep the 3 tracked parts (bp + Day/Night Aspect) — completion unchanged — and add a per-aspect reference breakdown of its 4 sub-blueprints.
- **Rotation:** do NOT show Rot A/B (removed by Update 42, and it was never world-state-trackable anyway — assassination rotation is not driven by `worldState.rotation`).
- **Mechanic:** the aspect rows convey the current "guaranteed each kill" behaviour.
- **Breakdown UI:** collapsible per aspect, defaulting collapsed once that aspect is owned.

## Design

### Data model — `src/lib/model/types.ts`

Add one optional field to `WarframePart`:

- `subDrops?: { label: string; chance: number }[]` — reference-only sub-blueprints of a composite part (not individually tracked). For Equinox aspects: the three 25.81% components. The aspect's own 22.56% (the Aspect Blueprint) stays as the part's existing `chance`.

No `rotation` is set on Equinox (Update 42 removed the gating).

### Curated data — `scripts/data/curated.ts`

```ts
// frameId → per-slot composite sub-blueprints @wfcd flattens away. Equinox is
// the only such frame: each aspect is a sub-build of Aspect Blueprint (the
// part's own 22.56% chance) + these three 25.81% components. Post-Update-42
// (2026) Tyl Regor drops one guaranteed component from each side per kill; the
// old Rotation A/B gating is gone but these within-side weights are unchanged.
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

### Build — `scripts/data/build.ts`

In `buildFrames`, when constructing each non-bp part, attach `subDrops` from
`ASSASSINATION_PART_DETAIL[frameId]?.[slot]` if present. Purely additive; the
aspect's `chance` (22.56, from `@wfcd`) is untouched, and no other frame is
affected. Import `ASSASSINATION_PART_DETAIL` alongside the existing
`ASSASSINATION_BP_SOURCE`.

### Display — `src/lib/panel/RegionPanel.svelte`

`assassinationSourceText` gains a composite branch: a part with `subDrops`
renders `{boss} · guaranteed each kill` (no single `%` — the rates live in the
breakdown). All other parts are unchanged (`{boss} · {chance}%`, using the
existing `formatChance` from PR #12). No availability chip (assassination cards
are still rendered without the `avail` prop — this is the guardrail that keeps
Equinox out of the world-state rotation logic).

### Display — `src/lib/panel/AspectBreakdown.svelte` (new)

A small child component `FrameCard` renders under any part that has `subDrops`:

- Props: `part: WarframePart`, `owned: boolean`.
- Seeds `let open = $state(!owned)` **once** (collapsed when the aspect is
  already owned; expanded while unobtained) — mirrors `FrameCard`'s deliberate
  seed-once `defaultExpanded` pattern, and its rule that toggling ownership must
  not snap sections shut mid-interaction (no reactive re-collapse).
- Renders a caret toggle and, when open, one muted line:
  `Aspect {formatChance(part.chance)} · {grouped(subDrops)}` →
  `Aspect 22.56% · Neuroptics/Chassis/Systems 25.81%`.
- Grouping helper collapses consecutive equal chances:
  `[{Neuroptics,25.81},{Chassis,25.81},{Systems,25.81}]` →
  `"Neuroptics/Chassis/Systems 25.81%"`. `formatChance` is shared (extract it to
  a module importable by both `RegionPanel` and `AspectBreakdown`, or duplicate
  the one-line helper — the plan picks one).

`FrameCard` renders `<AspectBreakdown>` for a part when `part.subDrops` is
present, passing `owned={tracker.isOwned(part.id)}`.

### Rendered result

```
Equinox
  Blueprint      Market (25,000cr)
  ☀ Day Aspect   Tyl Regor · guaranteed each kill      ▾
       Aspect 22.56% · Neuroptics/Chassis/Systems 25.81%
  ☾ Night Aspect Tyl Regor · guaranteed each kill      ▸   (collapsed once owned)
```

## Testing

- **Build:** Equinox `dayaspect`/`nightaspect` carry the three 25.81% `subDrops`
  and keep `chance: 22.56`; a normal frame (Rhino) has no `subDrops`.
- **RegionPanel:** an aspect (composite) row renders `Tyl Regor · guaranteed each
  kill` with no bare `%`; a normal component row still renders `{boss} · {n}%`.
- **AspectBreakdown:** renders `Aspect 22.56% · Neuroptics/Chassis/Systems
  25.81%` (equal chances grouped); default collapsed when `owned`, expanded when
  not; caret toggles; a part without `subDrops` renders nothing.
- **Dataset:** regenerate `static/data/dataset.json`; spot-check Equinox aspects
  carry `subDrops`. Completion stays at 3 parts.

## Out of scope

- Equinox Prime (Void/relic farm, not star-chart).
- A broader `@wfcd`-staleness audit across other frames (logged as a risk in
  project memory).
- Showing rotation on any assassination card.
