# Open-World Frames — Design

**Date:** 2026-07-11
**Status:** Approved (pending spec review → implementation plan)

## Goal

Add the seven open-world Warframes — farmed from Plains of Eidolon (Earth),
Orb Vallis (Venus), and Deimos (Cambion Drift + Albrecht's Laboratories) — to
the tracker so their parts are visible and toggleable per region, with their
bounty/drop source and best drop chance shown.

Frames covered:

| Frame    | Zone                                 | Region        | Component source               | Blueprint source                   |
| -------- | ------------------------------------ | ------------- | ------------------------------ | ---------------------------------- |
| Gara     | Plains of Eidolon                    | earth         | Cetus Bounty                   | Complete Saya's Vigil              |
| Revenant | Plains of Eidolon                    | earth         | Cetus Bounty                   | Complete Mask of the Revenant      |
| Garuda   | Orb Vallis                           | venus         | Orb Vallis Bounty              | Complete Vox Solaris               |
| Hildryn  | Orb Vallis (Exploiter Orb)           | venus         | Exploiter Orb                  | Little Duck (Vox Solaris standing) |
| Xaku     | Cambion Drift                        | deimos        | Cambion Drift Bounty           | Complete Heart of Deimos           |
| Qorvex   | Albrecht's Laboratories              | deimos        | Albrecht's Laboratories Bounty | Complete Whispers in the Walls     |
| Caliban  | Plains of Eidolon **and** Orb Vallis | earth + venus | Narmer Bounty                  | Market (50,000cr)                  |

### Per-part bounty stage (best drop)

Each component drops at a specific bounty **tier** (level range) and **rotation**.
These are derived at build time from `@wfcd/items` (summing sub-reward entries
per stage → true per-run odds); the table below is the expected output for the
current data pin (values re-derive on `pnpm data:build`, so they are not
hand-maintained).

| Frame    | Chassis                   | Neuroptics                | Systems                     |
| -------- | ------------------------- | ------------------------- | --------------------------- |
| Gara     | L5–15 · any rot · ~46%    | L20–40 · **Rot C** · ~47% | L10–30 · any rot · ~45%     |
| Revenant | L30–50 · any rot · ~39%   | L40–60 · any rot · ~17%   | L20–40 · **Rot B** · ~47%   |
| Garuda   | L5–15 · any rot · ~51%    | L20–40 · any rot · ~45%   | L10–30 · any rot · ~45%     |
| Hildryn  | Exploiter Orb · ~39%      | Exploiter Orb · ~39%      | Exploiter Orb · ~23%        |
| Xaku     | L40–60 · **Rot A** · ~28% | L15–25 · any rot · ~28%   | L30–40 · **Rot A/B** · ~26% |
| Qorvex   | L65–70 · **Rot C** · ~14% | L55–60 · **Rot C** · ~13% | L75–80 · **Rot C** · ~12%   |
| Caliban  | L50–70 · **Rot B** · ~21% | L50–70 · **Rot C** · ~21% | L50–70 · **Rot A** · ~21%   |

Notes: **Hildryn** parts come from the Exploiter Orb fight — no bounty tier/rotation.
**Revenant** Chassis also drops from the Plague Star event (~40%); the recurring
Cetus Bounty stage is shown as the reliable source. The **best-stage selection
rule** (build time): pick the (tier, rotation) with the highest summed chance;
on a tie prefer the **lowest** level range (easiest farm); collapse to "any rot"
when A/B/C are equal within the chosen tier.

## Non-goals

- No quest gating of frames. Frames are always visible under their zone; the
  unlock quest is shown as a `bpSource` note only. Deimos stays region-gated as
  today (`kind: 'special'`, `questId: heartofdeimos`).
- No new image assets — RegionPanel renders frames with a letter avatar, not an
  image (the existing behaviour).

## Key facts (grounding)

- Plains of Eidolon (`SolNode228`, earth), Orb Vallis (`SolNode129`, venus), and
  Cambion Drift (`SolNode229`, deimos) **already exist** in the dataset as
  `missionType: 'Free Roam'` nodes with `isAssassination: false`. They are
  currently inert (no frame links to them). We reuse their ids.
- `buildFrames` only links **Assassination-type** drops, so open-world frames
  (bounty drops) are skipped today.
- Bounty drop-location node names do **not** cleanly match the Free Roam
  solNodes (Gara/Revenant list `Earth/Cetus`, but the node is
  `Plains of Eidolon`; Qorvex lists `Deimos/Albrecht's Laboratories`, which is
  not a solNode at all). This is why we curate the zone→frame mapping rather
  than auto-parse.
- Caliban drops in **both** Plains and Orb Vallis (Narmer Bounties, post
  _The New War_); chances are identical in both zones.
- Qorvex's components come from **Sanctum Anatomica / Albrecht's Laboratories**
  (Cavia) bounties — a Deimos sub-zone with no star-chart solNode.

## Data model (`src/lib/model/types.ts`)

Add one interface, two optional `WarframePart` fields, and one `Dataset` field.

```ts
export interface WarframePart {
	// …existing fields (id, frameId, slot, dropSourceNodeId, chance)…
	bountyTier?: string; // open-world bounty stage, e.g. "L20–40"; absent for
	//                      assassination parts and non-bounty sources (Exploiter Orb)
	rotation?: string; // "A" | "B" | "C" | "any" | "A/B"; absent when N/A
}

export interface OpenWorldFarm {
	frameId: string; // → dataset.warframes
	nodeId: string; // the Free Roam / curated zone node
	regionId: string; // zone's region (earth/venus/deimos)
	componentSource: string; // "Cetus Bounty", "Exploiter Orb", …
	bpSource: string; // "Complete Saya's Vigil", "Market (50,000cr)", …
}

// Dataset gains:
//   openWorldFarms: OpenWorldFarm[];
```

The farm (frame × zone) is the unit for placement — Caliban has two farms
(Plains + Vallis). The **bounty stage lives on the part** (`chance` + `bountyTier`

- `rotation`), not on the farm, because a part's stage is identical across the
  zones it drops in (Caliban's Chassis is Rot B in both Cetus and Orb Vallis). A
  frame appears in a region's panel iff it has a farm whose `regionId` matches.

`Warframe.nodeId` is set to the frame's **primary** zone node so the command
palette (`buildPaletteItems`, which requires `frame.nodeId`) includes it.

## Pipeline

### `scripts/data/openworld.ts` (new) — curated source of truth

- `OPEN_WORLD_ZONES`: zone node declarations. Plains/Vallis/Cambion reuse the
  existing Free Roam solNode ids; **Albrecht's Laboratories** is added as a
  curated pseudo-node on Deimos (same pattern as the existing Eris key-boss
  pseudo-nodes in `curated.ts`).
- `OPEN_WORLD_FARMS`: the curated frame→zone table (7 frames, 8 entries — Caliban
  twice) with `componentSource` + `bpSource`.

### `scripts/data/build.ts`

`buildOpenWorldFrames(rawWarframes, farms): Warframe[]`

- For each unique `frameId` referenced by the farms, find the WFCD warframe by
  name and build a `Warframe` with `image` + parts (bp + the component slots
  present) pulled **from WFCD** — no hand-authored parts.
- For each component part, group its drops by (bounty tier, rotation), **sum**
  the chances within each stage, then select the best stage via the rule above
  (highest summed chance → lowest tier → collapse equal rotations to "any").
  Set `chance`, `bountyTier`, `rotation` from the winner. Non-bounty sources
  (Exploiter Orb) set `chance` only, leaving tier/rotation undefined. BP part has
  no chance.
- A small pure helper (`bestBountyStage(drops)`) does the grouping/selection so
  it is unit-testable on fixtures.
- `Warframe.nodeId` = primary zone node id (first farm for that frame).
- Reuses the existing `partId` / slot-ordering helpers.

### `scripts/data/assemble.ts`

- Merge the curated Albrecht's Laboratories pseudo-node into the solNodes before
  `buildNodes`/`buildRegions` (mirrors the `KEY_BOSS_SOLNODES` merge), so it
  lands on Deimos as a `Free Roam` node.
- Call `buildOpenWorldFrames` and concat the result into `warframes`.
- Set `openWorldFarms` on the dataset.
- Extend `validateDataset`: every farm's `frameId` ∈ warframes, `nodeId` ∈ nodes,
  `regionId` ∈ regions; every open-world frame's `nodeId` resolves.

### `scripts/build-data.ts`

- Add sanity floors: `>= 7` open-world frames built; assert `gara`, `xaku`,
  `caliban` present; assert `openWorldFarms.length >= 8`.

## UI (`src/lib/panel/RegionPanel.svelte`)

Render open-world zones **inside** the existing frames `<section>`, below the
assassination blocks (approved).

- Derive `openWorldZones` for the region: group `dataset.openWorldFarms` (filtered
  by `regionId`) by `nodeId`, joined to the zone node + each frame.
- Per zone: header `{zoneName}` with a tag `{faction} · Free Roam`.
- Per frame in the zone: the same frame-card layout (letter avatar,
  `owned/total`, part rows, "toggle whole frame"), with:
  - part row source column: for a component slot, `{componentSource}` plus, when
    present, the stage `{bountyTier} · Rot {rotation}` and `~{chance}%`
    (e.g. `Cetus Bounty · L20–40 · Rot C · ~47%`); Exploiter Orb parts show
    source + `~{chance}%` only (no tier/rotation). Blueprint slot shows `bpSource`.
  - a note line: `Blueprint: {bpSource}`.
- Extract the shared **part-row list** into a Svelte `{#snippet}` so the
  assassination and open-world blocks reuse it (removes ~40 lines of
  duplication). The snippet takes the frame plus a `sourceFor(slot)` callback so
  each caller supplies its own source/chance labelling.
- Tracker is untouched: parts use standard `frameId:slot` ids, so
  ownership/toggle/`frameCount` already work.

No StarChart or navigation changes — the three planets are already reachable
(Deimos via its existing gate).

## Testing

- `scripts/data/openworld.test.ts` (new): curated table integrity (every farm
  references a declared zone; primary node exists; no duplicate frame×zone).
- `scripts/data/build.test.ts`: `bestBountyStage` picks the highest-summed stage,
  tie-breaks to the lowest tier, and collapses equal A/B/C rotations to "any";
  `buildOpenWorldFrames` sets `chance`/`bountyTier`/`rotation` per part (and
  leaves tier/rotation undefined for Exploiter Orb); Caliban yields a frame
  usable by two farms.
- `scripts/data/assemble.test.ts`: Albrecht's Lab node lands on Deimos;
  `openWorldFarms` populated; `validateDataset` passes and catches a dangling
  farm.
- `src/lib/panel/RegionPanel.svelte.test.ts`: open-world frames render under
  earth/venus/deimos; Caliban appears under **both** earth and venus; a bounty
  part row shows source + tier + rotation + `~%`, an Exploiter Orb row shows
  source + `~%` only; toggling a part updates the tracker.
- `src/lib/data/seed.ts` (+ `seed.test.ts`): add the required
  `openWorldFarms: []` field (and any fixture rows the seed tests need).
- Regenerate `static/data/dataset.json` via `pnpm data:build`.

## Files touched

- `src/lib/model/types.ts` — `OpenWorldFarm` + `Dataset.openWorldFarms`.
- `scripts/data/openworld.ts` — **new** curated zones + farms.
- `scripts/data/build.ts` — `buildOpenWorldFrames` + best-chance helper.
- `scripts/data/assemble.ts` — merge pseudo-node, build frames, attach farms,
  extend validation.
- `scripts/build-data.ts` — sanity floors.
- `src/lib/panel/RegionPanel.svelte` — open-world rendering + shared part-row
  snippet.
- Tests as listed above; `src/lib/data/seed.ts`.
- `static/data/dataset.json` — regenerated.

## Assumptions / risks

- **One best stage per component** collapses multi-tier/rotation drops to a
  single farm target. Alternate stages (e.g. Revenant's L100 tier, Plague Star)
  are dropped from display — acceptable; the shown stage is the reliable, lowest-
  effort one.
- **Part stage is identical across a frame's zones**, so storing it on the part
  is safe (Caliban's Chassis is Rot B in both Cetus and Orb Vallis). If a future
  frame diverged per zone, the stage fields would move onto `OpenWorldFarm`.
  Documented, not built.
- **Curated `bpSource`/`componentSource` strings** are verified against the
  Warframe wiki (Caliban → Market + Narmer; Qorvex → Whispers in the Walls +
  Sanctum Anatomica). These are curation, not derived, so they can drift from the
  game over time — acceptable for hand-maintained flavour text.
- Adding frames raises total frame counts; any test asserting dataset totals must
  be updated (none found hard-coding warframe counts, but re-check on build).
