# Credits Farming Guide — Design

**Date:** 2026-07-23
**Status:** Approved
**Approach:** Hybrid — standard resource-pipeline entry (dataset cards, planet mapping, hub/SEO integration) plus a fully bespoke `/guides/credits` page that renders the cards data-driven.

## Goal

Add a Credits farming guide to wforacle covering the verified 2026 credit-farm landscape: Dark Sectors, the Daily First Win Bonus, The Index, Laomedeia, Techrot Safes (Höllvania), and Profit-Taker as recommendation cards, with Railjack/sorties/Zariman as honorable mentions, a multiplier-stacking reference, and a myth-busting panel for stale advice.

All game data was researched and verified against wiki.warframe.com and official patch notes on 2026-07-23 (three-agent research pass; findings archived in project memory `credit-farm-research`). Key verified facts baked into copy:

- **Two-channel rule:** every credit source is either an _end-of-mission reward_ (doubled by Daily First Win and Credit Boosters) or a _pickup/cache/drop_ (doubled by Effigy, Retriever mods, Blessing, Credit Boosters — but NOT First Win, which is silently consumed if a cache mission is the day's first).
- Dark Sectors pay a **flat** credit bonus (~20k/run), not a percentage; the +35% figures are resource/affinity only.
- Index: 50k wager → 250k per High-Risk round; booster doubles round 1 only.
- Laomedeia: rot A/B/C caches = 20k/30k/50k; 160k over the first 4 rounds with all conduits defended; booster applies but is not shown on the reward screen.
- Techrot Safes (Legacyte Harvest, needs The Hex): 100k credit drop per safe, stacks with every drop-channel multiplier; current community top-tier alongside Profit-Taker.
- Profit-Taker: 5 × 25,000 guaranteed credit drops; requires Solaris United Old Mate + Gravimag arch-gun; 500k per kill fully stacked (Effigy ×2 · booster ×2). **The Daily First Win Bonus does NOT apply to drop-based credits** — the wiki lists only Booster/Blessing/Retriever (plus Effigy) for drops; community "1M first kill of the day" math is wrong and must not appear in copy.
- Secura Lecta farm is dead (Hotfix 42.0.10, 2026-05-06); Chroma Effigy credit doubling was NOT removed (rumor conflates the Lecta nerf); Gian Point was removed in 2021.
- Railjack Veil pays 80–150k/mission per official patch notes 27.4 (wiki node infoboxes show a conflicting base value — cite the patch note, hedge the copy).

## 1. Data layer — `scripts/data/farming.ts`

- `RESOURCES`: add `{ id: slugify('Credits'), name: 'Credits' }` → id `credits`.
- `PLANET_RESOURCES`: append `R['Credits']` to `ceres`, `neptune`, `venus` (the planets the cards point at — Cryotic precedent for non-infobox "resources"). Comment explains Credits is a mission-payout currency mapped onto its signature farm planets.
- `RECOMMENDATIONS[R['Credits']]`: six cards, `lastVerified: '2026-07-23'`, every card sets `boosterNote` (canned copy assumes resource boosters — wrong for credits). `boostersApply: true` on all (a Credit Booster helps everywhere; the nuance lives in `boosterNote`).

| #   | Phase | nodeLabel                                      | regionId (derived) | Note content                                                                                                                                                                                                           | boosterNote gist                                                                          |
| --- | ----- | ---------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | early | `Ceres — Seimeni / Gabii (Dark Sector)`        | ceres              | Flat ~20k Dark Sector bonus (not a %) → ~22.4k/run; 5-wave/5-min re-queue beats staying; easier to reach than Akkad (Eris) at identical pay                                                                            | Credit Booster 2× and Daily First Win 2× both apply — end-of-mission reward               |
| 2   | early | `Anywhere — Daily First Win Bonus`             | —                  | First mission _completed_ after 00:00 UTC pays double credits; spend it on an Arbitration (50k→100k) or a Dark Sector; never on Index/Laomedeia/bounties — caches consume it silently                                  | Multiplies with a Credit Booster (4× total)                                               |
| 3   | early | `Neptune — The Index (High Risk)`              | neptune            | 50k wager → 250k/round; Rhino/Nezha (later Revenant) to ignore Financial Stress; bank ~15 points, hold a buffer; only the host needs the node unlocked                                                                 | Booster doubles round 1 only → one-round-and-requeue; First Win does NOT apply (cache)    |
| 4   | late  | `Neptune — Laomedeia (Disruption)`             | neptune            | Defend all 4 conduits: B/B/C/C = 160k across rounds 1–4, 50k/round after; no wager, normal mission rules (companions/loot frames work)                                                                                 | Booster doubles the caches silently (not shown on reward screen); First Win doesn't apply |
| 5   | late  | `Höllvania — Legacyte Harvest (Techrot Safes)` | —                  | One Techrot Safe per mission drops 100k credits (plus an Arcane); needs The Hex quest; run SHELL CRACKER bounties / Loot Detector to find the safe; the current top-tier farm at a fraction of Profit-Taker's gear bar | Drop-channel: stacks with booster, Effigy, MR30 Blessing, Prosperous Retriever            |
| 6   | late  | `Venus — Profit-Taker Orb (Heist Phase 4)`     | venus              | 5 × 25k guaranteed credit drops; needs Solaris United Old Mate + Gravimag arch-gun; 2–8 min kills once geared; 500k per kill with Effigy + booster                                                                     | Drops, not rewards: Effigy 2× + booster 2× — First Win skips drops entirely               |

`recRegionId` derives regionId from the leading token; `Anywhere` / `Höllvania` are not regions and safely yield `undefined` (no "best farm here" badge) — verified in `assemble.ts:29`.

## 2. Bespoke page — `src/routes/guides/credits/`

SvelteKit static routes take precedence over `[resource]`, so `+page.svelte` here replaces the generic guide shell for Credits only.

- **`+page.ts`:** `prerender = true`; loads the dataset via `loadDataset(fetch)`, returns the `credits` resource (404 if absent so a broken build fails loudly). No `.svx` loading — prose lives in the page.
- **`[resource]/+page.ts` change:** `entries()` filters out `credits` to avoid duplicate prerender of the same path. (The `load()` needs no change — the static route wins at resolution.)
- **`src/content/guides/credits.svx`:** not created.

Page sections, top to bottom (reusing `wf-panel` / `wf-edge` / `wf-cyan` tokens and the `[resource]` page's phase chip styles):

1. **Hero** — credits icon, `h1`, one-line thesis introducing the two-channel rule.
2. **Two-channel rule** — compact two-column comparison: _End-of-mission rewards_ (Dark Sectors, Arbitrations, sorties, Railjack — doubled by First Win + booster) vs _Pickups & caches_ (Index, Laomedeia, Techrot, Profit-Taker — doubled by Effigy/Retriever/Blessing/booster, immune to First Win). Explicit warning that a cache mission as first-of-day wastes the bonus.
3. **Progression path** — the six recommendation cards rendered from `data.resource.recommendations`, early group then late group, same card anatomy as the generic page (phase chip, nodeLabel, note, boosterNote, source link, verified date).
4. **Multiplier stacking table** — Credit Booster ×2 (everything), Daily First Win ×2 (rewards only), Effigy ×2 (drops within 10 m), MR30 Blessing +25% (additive with booster), Prosperous Retriever (18% chance ×2 per pickup; deterministic slot vs Smeeta Charm), double-credit weekends; worked example: Profit-Taker 125k → 250k (Effigy) → 500k (booster); First Win never touches drops.
5. **Outdated advice panel** — myth-bust list: Secura Lecta farm dead (Hotfix 42.0.10, May 2026, multi-trigger fix); "Effigy credit doubling was removed" is false (patch history clean through 2026; open Techrot-cache bug noted); Dark Sector credit "+%" is a myth (flat bonus); Gian Point removed (U29.10, 2021); Ayatan sculptures are endo/plat, not credits.
6. **Honorable mentions & sources** — Railjack Veil 80–150k/mission (patch-note figure, "the relaxed multi-loot farm"), sorties (fixed 100k/day), Zariman bounties (~60k, standing-adjacent); then the full source link list (wiki pages + patch notes).

SEO: same `SeoHead` + `breadcrumbLd` + `guideLd(resource, canonical)` wiring as the generic page; canonical `/guides/credits`. Sitemap/hub need no changes — both derive from the dataset (`recommendations.length > 0`).

## 3. Assets

- `static/resources/credits.webp` — fetched from the official wiki's Credits icon and converted to WebP (manual step in the spirit of `fetch-resource-images.sh`; `@wfcd/items` has no Credits resource entry, and the page hardcodes the `/resources/{id}.webp` path so `image` metadata is irrelevant).

## 4. Testing

- **Data conventions:** existing `farming.test.ts` suites (nodeLabel parsing, https sources, ISO dates) pick up the new entries automatically; extend if any assert an exhaustive resource list.
- **`assemble` behavior:** assert `recRegionId('Anywhere — …')` and `recRegionId('Höllvania — …')` are `undefined` (only if not already covered).
- **Bespoke page test** (`src/routes/guides/credits/page.svelte.test.ts`): renders six cards from a fixture resource, early cards before late, myth-bust panel and stacking table present, source links rendered.
- **Route override:** test that `[resource]` `entries()` excludes `credits`.
- **Copy hedging:** Railjack figures cite Update 27.4 patch notes; the Vox Solaris "The Teacher" prereq (uncorroborated wiki claim) is omitted from requirements copy.

## Out of scope

- Schema changes (`kind: 'currency'`, `mid` phase) — rejected as YAGNI.
- In-game verification of Railjack per-mission payouts (copy hedges by citing the patch note).
- Secura Lecta / Effigy build guides — mentioned only in myth-bust/multiplier context.
