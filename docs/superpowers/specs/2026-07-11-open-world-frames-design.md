# Open-World Frames — Design

**Date:** 2026-07-11
**Status:** Approved (pending spec review → implementation plan)

## Goal

Add the seven open-world Warframes — farmed from Plains of Eidolon (Earth),
Orb Vallis (Venus), and Deimos (Cambion Drift + Albrecht's Laboratories) — to
the tracker so their parts are visible and toggleable per region, with their
bounty/drop source and best drop chance shown.

Frames covered:

| Frame | Zone | Region | Component source | Best chance | Blueprint source |
|---|---|---|---|---|---|
| Gara | Plains of Eidolon | earth | Cetus Bounty | ~31% | Complete Saya's Vigil |
| Revenant | Plains of Eidolon | earth | Cetus Bounty | ~26% | Complete Mask of the Revenant |
| Garuda | Orb Vallis | venus | Orb Vallis Bounty | ~28% | Complete Vox Solaris |
| Hildryn | Orb Vallis (Exploiter Orb) | venus | Exploiter Orb | ~39% | Little Duck (Vox Solaris standing) |
| Xaku | Cambion Drift | deimos | Cambion Drift Bounty | ~13% | Complete Heart of Deimos |
| Qorvex | Albrecht's Laboratories | deimos | Albrecht's Laboratories Bounty | ~14% | Complete Whispers in the Walls |
| Caliban | Plains of Eidolon **and** Orb Vallis | earth + venus | Narmer Bounty | ~8% | Market (50,000cr) |

(Chances above are indicative — computed at build time as the max drop chance
per component; exact values come from `@wfcd/items`.)

## Non-goals

- No quest gating of frames. Frames are always visible under their zone; the
  unlock quest is shown as a `bpSource` note only. Deimos stays region-gated as
  today (`kind: 'special'`, `questId: heartofdeimos`).
- No per-rotation / per-tier chance breakdown — one representative chance per
  component.
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
  *The New War*); chances are identical in both zones.
- Qorvex's components come from **Sanctum Anatomica / Albrecht's Laboratories**
  (Cavia) bounties — a Deimos sub-zone with no star-chart solNode.

## Data model (`src/lib/model/types.ts`)

Add one interface and one `Dataset` field. `Warframe` and `WarframePart` are
reused unchanged.

```ts
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

The unit is the **farm** (frame × zone), not a field on `Warframe`, because
Caliban has two farms (Plains + Vallis). A frame appears in a region's panel iff
it has a farm whose `regionId` matches.

`WarframePart.chance` (already present) holds the representative best chance per
component; `Warframe.nodeId` is set to the frame's **primary** zone node so the
command palette (`buildPaletteItems`, which requires `frame.nodeId`) includes it.

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
- Each component part's `chance` = max drop chance across that component's
  open-world drops (`resolveDropLocation`/raw drop entries). BP part has no
  chance.
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
  - part row source column: `{componentSource} · ~{chance}%` for component slots;
    `bpSource` for the blueprint slot (no chance).
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
- `scripts/data/build.test.ts`: `buildOpenWorldFrames` builds parts + best
  chance from a fixture; Caliban yields a frame usable by two farms.
- `scripts/data/assemble.test.ts`: Albrecht's Lab node lands on Deimos;
  `openWorldFarms` populated; `validateDataset` passes and catches a dangling
  farm.
- `src/lib/panel/RegionPanel.svelte.test.ts`: open-world frames render under
  earth/venus/deimos; Caliban appears under **both** earth and venus; a part row
  shows source + `~%`; toggling a part updates the tracker.
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

- **Single representative chance per component** loses per-rotation detail. Accepted
  per non-goals; the "best odds" figure is the useful one.
- **Caliban's chances are identical across its two zones**, so a shared
  `Warframe.chance` per part is safe. If a future frame diverged per zone, chance
  would need to move onto `OpenWorldFarm`. Documented, not built.
- **Curated `bpSource`/`componentSource` strings** are verified against the
  Warframe wiki (Caliban → Market + Narmer; Qorvex → Whispers in the Walls +
  Sanctum Anatomica). These are curation, not derived, so they can drift from the
  game over time — acceptable for hand-maintained flavour text.
- Adding frames raises total frame counts; any test asserting dataset totals must
  be updated (none found hard-coding warframe counts, but re-check on build).
