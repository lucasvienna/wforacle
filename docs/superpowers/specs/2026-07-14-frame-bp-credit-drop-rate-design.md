# Assassination frame cards: credit amounts & drop rates

**Date:** 2026-07-14
**Status:** Approved — ready for implementation plan

## Problem

Assassination frame cards are missing two pieces of information that open-world
frame cards already show:

1. **Component drop rates.** Every assassination component row renders only the
   boss name (`sourceLabel` in `RegionPanel.svelte`), even though the `chance`
   value exists on the part in the dataset. Open-world rows show `~X%`.
2. **Market credit amounts.** The blueprint row shows a bare `"Market"` with no
   credit price. The `bpCost` field from `@wfcd/items` (the Market blueprint's
   credit cost) is never captured into the dataset. Open-world curated
   `bpSource` strings already embed it, e.g. `"Market (50,000cr)"`.

`bpCost = undefined` in `@wfcd/items` is a meaningful signal, not noise: the
exact three frames that lack it — **Wisp, Atlas, Mesa** — are precisely the ones
whose blueprint is _not_ a Market credit purchase, so the current hardcoded
`"Market"` label is factually wrong for them.

### The 16 assassination frames

| Group         | Frames                                                                                            | Blueprint source                                             | Target display                       |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Standard (13) | Rhino, Excalibur, Ember, Frost, Hydroid, Loki, Mag, Nova, Saryn, Trinity, Valkyr, Equinox, Nekros | Market, `bpCost` 25k–100k                                    | `Market (35,000cr)`                  |
| Wisp          | Wisp                                                                                              | Ropalolyst assassination drop @22.56% (in `@wfcd` bp drops)  | `Ropalolyst · ~23%`                  |
| Atlas         | Atlas                                                                                             | The Jordas Precept quest (Cephalon Simaris) — not resolvable | curated `The Jordas Precept (quest)` |
| Mesa          | Mesa                                                                                              | Mutalist Alad V — absent from `@wfcd` entirely               | curated `Mutalist Alad V`            |

## Decisions (from brainstorming)

- **Scope:** implement _both_ the component drop-rate `~%` and the Market credit
  amount — full parity with open-world cards.
- **Non-market frames:** auto-resolve the bp drop chance from `@wfcd/items`
  generically (fixes Wisp), and curate only the two gaps `@wfcd` can't supply
  (Atlas, Mesa).

## Design

### Data model — `src/lib/model/types.ts`

Add two optional fields to `WarframePart` describing how a blueprint is acquired:

- `marketCost?: number` — credit price of a Market blueprint purchase (sourced
  from `@wfcd/items` `bpCost`). Absent for drop-sourced / curated / open-world
  blueprints.
- `bpSource?: string` — curated freeform source label that overrides the default
  bp rendering, for blueprints that are neither a Market purchase nor a
  resolvable assassination drop (quest / key-boss frames). Mirrors the meaning
  of the existing required `OpenWorldFarm.bpSource`.

**Blueprint source precedence** (build-time and render-time agree):
drop (`dropSourceNodeId` + `chance`) → curated (`bpSource`) → market
(`marketCost`) → bare `"Market"` fallback. No real frame has more than one, so
precedence only matters as a defensive rule; a real drop is more informative
than "buy from market", so it wins.

### Build pipeline — `scripts/data/build.ts`

1. Add `bpCost?: number` to the `RawWarframe` type. It already reaches the
   builder at runtime through `loadSources` (which casts raw `@wfcd` items).
2. In `buildFrames`, capture a Blueprint's _own_ assassination drop into a
   `bpDrop` (`{ nodeId, chance }`) while resolving component drops. **Node
   detection stays strictly from non-bp components** so the existing invariant —
   a bp-only drop must not fabricate a frame — is preserved.
3. Assemble the bp part by precedence:
   - `bpDrop` present → `{ dropSourceNodeId, chance }` (Wisp).
   - else `ASSASSINATION_BP_SOURCE[frameId]` present → `{ bpSource }` (Atlas, Mesa).
   - else → `{ marketCost: wf.bpCost }` (standard 13; `undefined` stays absent).
     Components are built as before (`dropSourceNodeId = node.id`, `chance` per slot).

### Curated data — `scripts/data/curated.ts`

New map for the two blueprint sources `@wfcd` can't supply, keyed by frame id
(slugified name):

```ts
export const ASSASSINATION_BP_SOURCE: Record<string, string> = {
	atlas: 'The Jordas Precept (quest)',
	mesa: 'Mutalist Alad V',
};
```

### Display — `src/lib/panel/RegionPanel.svelte`

Replace `sourceLabel(slot, bossName)` with an assassination source builder that
mirrors the open-world `owSourceText` style:

- **Component row** → `{boss} · ~{round(chance)}%`, omitting `· ~X%` when chance
  is absent.
- **Blueprint row** → in precedence order:
  - `part.bpSource` verbatim (Atlas, Mesa), else
  - `{boss} · ~{round(chance)}%` when the bp is drop-sourced (Wisp:
    `dropSourceNodeId`/`chance` set), else
  - `Market ({marketCost.toLocaleString('en-US')}cr)` (standard), else
  - `Market`.

Credit formatting produces `Market (35,000cr)`, matching the open-world curated
string format. Chance rounding matches `owSourceText` (`Math.round`).

## Testing

- **Update** `build.test.ts` "never attaches a chance to the bp part…": bp now
  carries its own drop chance + `dropSourceNodeId` when the Blueprint has a
  resolvable assassination drop _and_ a component drop established the node.
  Keep the node-from-components assertion and the separate bp-only-no-frame
  invariant test unchanged.
- **Add** build tests:
  - standard frame receives `marketCost` from `bpCost`;
  - a Wisp-shaped frame captures the bp drop (`dropSourceNodeId` + `chance`) and
    gets no `marketCost`;
  - Atlas/Mesa-shaped frames receive the curated `bpSource` and no `marketCost`.
- **Add** `RegionPanel.svelte.test.ts` cases:
  - assassination component row renders `~%`;
  - bp row renders `Market (35,000cr)`, a curated `bpSource`, and a drop-sourced
    `{boss} · ~%`.
- **Fixture** `scripts/data/fixtures/warframes.sample.json`: add `bpCost` to Rhino.

## Out of scope

- SEO `jsonld.ts` — its `offers` block is the free web-app USD schema, unrelated
  to in-game credits.
- Open-world cards — already render both credit and drop rate correctly.
