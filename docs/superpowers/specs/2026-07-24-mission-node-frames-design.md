# Mission-Node Frames — Design

**Date:** 2026-07-24
**Status:** Approved

## Goal

Add the seven remaining non-Prime Warframes whose parts drop at real star-chart
nodes already present in `warframe-worldstate-data`: **Citrine, Dante, Gauss,
Voruna, Nidus, Jade, Gyre**. After this, every non-Prime frame farmable at a
trackable node is in the dataset; the remaining absentees (Railjack, Höllvania,
Duviri, vendor/quest/dojo frames) are out of scope by architecture.

## Background

The pipeline has two ingestion paths: `buildFrames` (Assassination-node drops)
and `buildOpenWorldFrames` (curated `OPEN_WORLD_FARMS` + `@wfcd/items` drop
parsing). These seven frames drop at regular mission nodes via rotations — a
third acquisition shape — but the curated-farm path already fits it: farms
reference real SolNode ids (Plains = SolNode228 precedent) and
`bestBountyStage` parses their drop-location strings unchanged.

## Frames

| Frame   | Node (id)                 | Region  | Mode                 | Parts                         | Blueprint                   |
| ------- | ------------------------- | ------- | -------------------- | ----------------------------- | --------------------------- |
| Citrine | Tyana Pass (`SolNode450`) | Mars    | Mirror Defense       | all, Rot C 6.1%               | node drop, Rot C 9.3%       |
| Dante   | Armatus (`SolNode721`)    | Deimos  | Disruption           | all, Rot C 5%                 | node drop, Rot C 7.5%       |
| Gauss   | Kappa (`SolNode177`)      | Sedna   | Disruption           | all, Rot C 7.84%              | Market 30,000cr             |
| Voruna  | Circulus (`SolNode310`)   | Lua     | Conjunction Survival | all, Rot C 8.16%              | node drop, Rot C 12.24%     |
| Nidus   | Oestrus (`SolNode167`)    | Eris    | Infested Salvage     | all, Rot C 14.29%             | Complete The Glast Gambit   |
| Jade    | Brutus (`SolNode723`)     | Uranus  | Ascension            | all, 4.63% (no rotation)      | Complete Jade Shadows       |
| Gyre    | Chrysalith (`ZarimanHub`) | Zariman | Zariman Bounty       | per-tier bounty drops ~12–14% | bounty drop, L90–95+ 12.99% |

Notes verified against wiki.warframe.com (2026-07-24):

- Voruna's set is also sold by Archimedean Yonta for Lua Thrax Plasm (75/part,
  125 BP); Yuvarium (Tier 1) drops the same parts at worse rates —
  `bestBountyStage` picks Circulus automatically since the zones differ.
- Jade's parts are also sold by Ordis for Vestigial Motes (150/part, 450 BP).
- Gyre has no vendor; every part including the main BP is a Holdfasts bounty
  reward at a distinct level tier.

## Design decisions

### 1. Curation route, not a new builder

All seven are added as `OPEN_WORLD_FARMS` entries with their real SolNode ids.
No changes to `buildFrames`. The farm's `componentSource`/`bpSource` copy
carries the mission-mode and vendor-alternative wording.

### 2. Rotation semantics: static text, not live chips

`WarframePart.rotation` feeds the worldstate availability chips (150-minute
bounty cycle). The mission farms' "Rotation C" is the in-mission AABC cadence —
unrelated — so Citrine, Dante, Gauss, Voruna, and Nidus are listed in
`PER_RUN_ROTATION_FARMS` with static `Rotation C` labels landing in
`bountyTier`. Jade has no rotations (flat Ascension reward). Gyre's bounty
rotations are the real 150-minute cycle and stay live, like the existing
open-world frames.

### 3. Blueprint drops at the farm node

`buildOpenWorldFrames` currently emits a bare `bp` part; the panel renders
`farm.bpSource` for it. Citrine, Dante, Voruna, and Gyre's main blueprints
drop at their farm like any component. Extend `buildOpenWorldFrames` to run
the Blueprint component through the same stage pipeline, emitting
`dropSourceNodeId`/`chance`/`bountyTier`/`rotation` on the `bp` part when a
stage resolves (bare part otherwise). `RegionPanel`'s open-world part label
renders bp rows with drop data like component rows, falling back to
`farm.bpSource` when bare. `bpSource` remains the required farm-level label
(shown as the card's "Blueprint:" subline) and for these four states the drop

- any vendor alternative.

### 4. No new quest gating

Nidus (BP behind The Glast Gambit) and Jade (BP behind Jade Shadows) live on
non-gated planets; the quests don't reveal regions and the frames aren't
spoilers. Lua/Zariman/Deimos frames inherit the existing region spoiler
gating. `QUESTS` is unchanged.

## Components touched

- `scripts/data/openworld.ts` — 7 farm entries; 5 `PER_RUN_ROTATION_FARMS`
  entries (bp slot included where the BP drops at the node).
- `scripts/data/build.ts` — `buildOpenWorldFrames` bp-stage support.
- `src/lib/panel/RegionPanel.svelte` — bp part label handles drop-sourced bp.
- `scripts/fetch-frame-glyphs.sh` — 7 new `dl` lines (`CitrineGlyph-Dark.png`
  naming convention); run to produce `static/frames/<id>.webp`.
- `static/data/dataset.json` — rebuilt via `pnpm data:build`.
- Tests: `openworld.test.ts`, `build.test.ts`, dataset/e2e count assertions.

## Error handling

Unchanged: farms whose frame or node can't resolve are dropped by the existing
builders; the drift-canary pattern (dataset tests) catches upstream data
changes. If `ZarimanHub` were missing from a future worldstate-data release,
Gyre would drop out of the dataset rather than crash the build — same failure
mode as every curated node.

## Testing

- Unit (Vitest, existing fixtures pattern): bp-stage extension in
  `build.test.ts` (drop-sourced bp vs bare bp vs per-run label interplay);
  farm-entry integrity in `openworld.test.ts`.
- Dataset assertions: 32 frames total; each new frame links to its node;
  spot-check chances against the table above.
- E2E (Playwright): one new-frame farm card renders on its region panel
  (pattern from the Protea/Koumei tests).
