# Affinity Farming Guide — Design

**Date:** 2026-07-24
**Status:** Approved
**Approach:** Hybrid, mirroring the Credits guide — standard resource-pipeline entry (dataset cards, planet mapping, hub/SEO integration) plus a fully bespoke `/guides/affinity` page that renders the cards data-driven.

## Goal

Add an Affinity (XP) farming guide covering the verified July-2026 leveling landscape: Helene/Hydron (early), Sanctuary Onslaught (mid), Elite SO + Steel Path Elara + Steel Path Void Cascade (late) as recommendation cards, with Solstice Square/Ascension/Adaro stealth/Duviri Circuit as honorable mentions, an affinity-sharing-rules explainer, a multiplier-stacking reference, and a myth-busting panel.

All game data was researched and verified against wiki.warframe.com and official patch notes on 2026-07-24 (three-agent research pass + direct spot-checks; findings archived in project memory `affinity-farm-research`). Key verified facts baked into copy:

- **Sharing rules:** own ability kill = 100% to the Warframe; own weapon kill = 50/50 frame/weapon; a squadmate's kill = 25% to your frame + 75% split evenly across your *equipped* weapons — so carrying a single leveling weapon triples its share vs a full loadout. Share range 50 m (250 m open worlds, 200 m Archwing, infinite in Railjack).
- **Defense rotations are 3 waves since Update 38.5** (2025-03-19) — "leave at wave 5" is obsolete; extraction/reward cadence is 3/6/9 (AABC).
- **Steel Path has NO affinity bonus** — its +100% bonuses are resource & mod *drop chance*. SP farms win via +100 enemy levels feeding the level-scaled affinity multiplier (1 + 0.1425 × level^0.5) plus spawn density. The myth must be busted, not repeated.
- **Smeeta Charm reworked:** now Triple Affinity (×3) for 120 s — affinity-only; the resource-doubling moved to the Loyal Retriever mod.
- Multiplier stack: Affinity Booster ×2 × Double Affinity weekend ×2 × MR30 Blessing +25% — all multiplicative (×5 combined).
- Stealth chain: unalerted kills +100% each within 30 s, cap +500%; melee stealth kills earn double stealth affinity.
- **Update 42.0** (2026-03-25): Braton/Lato Vandal parts now in ALL ESO rotations (was Rot C only) — ESO's reward pool got better, not worse.
- **Update 43.0 "Jade Shadows: Constellations"** (2026-06-17, verified against the official patch note; one research agent wrongly flagged it bogus): Warframes and Companions now share full kill affinity when one damaged the enemy shortly before the other killed it.
- Hydron's own wiki page calls it outclassed by (E)SO; Helene unlocks far earlier (Saturn vs late-chart Sedna) at near-equal affinity — Helene is the early pick, Hydron "the classic".
- Dark Sector bonuses (spot-checked table): Sechura +30% affinity/+25% rifles/+35% resources; Akkad +23%/+18% melee; Seimeni & Gabii +26%/+21% melee.
- Focus lenses convert affinity only from max-rank gear — leveling gear earns zero Focus; "best XP farm = best Focus farm" is a conflation.

## 1. Data layer — `scripts/data/farming.ts`

- `RESOURCES`: add `{ id: slugify('Affinity'), name: 'Affinity' }` → id `affinity`.
- `PLANET_RESOURCES`: append `R['Affinity']` to `saturn`, `sedna`, `jupiter`, `zariman` (the regions the cards point at — Credits precedent for non-drop "resources"). Comment explains Affinity is XP mapped onto its signature farm regions.
- `RECOMMENDATIONS[R['Affinity']]`: six cards, `lastVerified: '2026-07-24'`, every card sets `boosterNote` (canned copy assumes resource boosters — wrong for affinity). `boostersApply: true` on all (an Affinity Booster helps everywhere; the nuance lives in `boosterNote`).

| #   | Phase | nodeLabel                                    | regionId (derived) | Note content                                                                                                                                                              | boosterNote gist                                                                                  |
| --- | ----- | -------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | early | `Saturn — Helene (Defense)`                  | saturn             | Levels 21–26, mid-chart unlock (before Hydron); full pub squad, carry only leveling gear + one strong weapon, stay in 50 m; rewards & extraction every 3 waves since U38.5 | Affinity Booster ×2 on everything; resource boosters do nothing for XP                             |
| 2   | early | `Sedna — Hydron (Defense)`                   | sedna              | The classic, levels 30–40 — but late-chart unlock and officially outclassed by (E)SO per its own wiki page; still a fine pub leveling node; 3-wave rotations               | Booster ×2; add the free MR30 Affinity Blessing (+25%, multiplicative) from any relay              |
| 3   | mid   | `Sanctuary Onslaught (Cephalon Simaris)`     | —                  | Unlocks with The New Strange; 2.5-min zones, kill fast to keep efficiency; rewards AABC every 2 zones → leave at zone 8; gear wheel/Specters disabled; frames level best here | Booster ×2 on the huge kill volume; Smeeta Charm can proc ×3 affinity for 120 s                    |
| 4   | late  | `Elite Sanctuary Onslaught (Cephalon Simaris)` | —                | Needs a rank-30 frame; enemies start 60–70 and the level-scaled multiplier makes weapons max in ~5 squad minutes; U42 put Braton/Lato Vandal parts in every rotation        | Booster ×2 also doubles Focus from lensed max-rank gear — the standard blessing→ESO→Forma loop     |
| 5   | late  | `Jupiter — Elara (Steel Path Survival)`      | jupiter            | The wiki-documented "lazy" farm: SP Corpus at 115–120 (fast to kill, no armor scaling), Survival's endless spawns; squad or On Call Crew carries while leveling gear leeches | Booster ×2; SP's own +100% bonuses are resource/mod drop chance — the XP edge is enemy level, not a bonus |
| 6   | late  | `Zariman — Void Cascade (Steel Path)`        | zariman            | The community's #1 level-while-farming node since 2022: highest sustained spawn density, Thrax kills pay 2,500 Focus, plus Steel Essence and arcanes — but it demands a self-sufficient loadout, not six unranked weapons | Booster ×2 on affinity and combat standing/Focus; SP drop-chance bonus boosts the arcane/SE side   |

`recRegionId` derives regionId from the leading token; `Sanctuary Onslaught (…)` / `Elite Sanctuary Onslaught (…)` have no `—` so the whole label fails the region lookup and safely yields `undefined` (no badge); `zariman` is a curated special region and resolves (badge on the Zariman panel) — verified in `assemble.ts`.

## 2. Bespoke page — `src/routes/guides/affinity/`

Static route overrides `[resource]` for affinity only (Credits precedent).

- **`+page.ts`:** `prerender = true`; `loadDataset(fetch)`, return the `affinity` resource (404 if absent so a broken build fails loudly).
- **`[resource]/+page.ts` change:** `entries()` excludes `affinity` alongside `credits`.
- No `.svx` content file.

Page sections, top to bottom (reusing `wf-panel`/`wf-edge`/`wf-cyan` tokens and the credits page's phase chips/card snippet):

1. **Hero** — affinity icon, `h1`, one-line thesis: where you farm matters less than what you carry — the sharing rules decide where the XP goes.
2. **The sharing rules** — two-column comparison: _Your kills_ (ability = 100% frame; weapon = 50/50) vs _Squad kills_ (25% frame + 75% split across equipped weapons — the fewer-weapons trick). Range note (50 m / 250 m open worlds / infinite Railjack) and the U43 companion-share change. Warning callout: bring ONLY the gear you're leveling plus one carry option; letting the squad kill levels your weapons faster than killing with them.
3. **Progression path** — the six cards rendered from `data.resource.recommendations`, early → mid → late.
4. **Multiplier stacking table** — Affinity Booster ×2 (40p/3d · 80p/7d · 200p/30d, also doubles Focus/combat standing); MR30 Affinity Blessing +25% (3 h, free in relays, multiplicative); Smeeta Charm ×3 for 120 s (post-rework, affinity-only — resource doubling moved to Loyal Retriever); Double Affinity weekends ×2; stealth-kill chain +100%→+500% (melee stealth ×2); Dark Sector node bonuses (Sechura +30%/+25% rifles etc.). Worked example: booster × weekend × blessing = ×5 on every kill.
5. **Outdated advice panel** — myths: "leave at wave 5" (3-wave rotations since U38.5, Mar 2025); "go to Draco" (farm died in 2016 when Specters of the Rail changed it to Survival); "Steel Path gives +100% affinity" (false — drop chance only); "Berehynia Interception is the meta" (dead by meta shift, no nerf); "Smeeta doubles your loot and XP" (reworked: ×3 affinity only); "the best affinity farm is the best Focus farm" (lenses convert affinity only from max-rank gear — leveling gear earns zero Focus).
6. **Honorable mentions** — Solstice Square (Höllvania Stage Defense, U38.5 — "the better Hydron", needs The Hex + Hex rank 4); Ascension — Brutus (Uranus, U36 — highest Eximus prevalence in the game, strong on SP); Adaro (Sedna) stealth (Equinox/Ivara sleep-finishers riding the +500% chain — the top solo method); Duviri Circuit (your own gear appears in offerings and levels normally; frames 0→30 in ~6 stages).
7. **Sources** — wiki pages (Affinity, Helene, Hydron, Sanctuary Onslaught, Elara, The Steel Path, Void Cascade, Charm, True Master's Font, Dark Sector) + official patch notes (38.5, 42.0, 43.0).

SEO: same `SeoHead` + `breadcrumbLd` + `guideLd(resource, canonical)` wiring; canonical `/guides/affinity`. Hub/sitemap need no changes — both derive from the dataset.

## 3. Assets

- `static/resources/affinity.webp` — the wiki's affinity icon, fetched and converted to WebP (manual step, Credits precedent; `@wfcd/items` has no Affinity entry and the page hardcodes the `/resources/{id}.webp` path).

## 4. Testing

- **Data conventions:** existing `farming.test.ts` suites (nodeLabel parsing, https sources, ISO dates) pick up the new entries automatically.
- **Bespoke page test** (`src/routes/guides/affinity/page.svelte.test.ts`): renders six cards from a fixture resource in phase order, sharing-rules section, myth panel and stacking table present, source links rendered — mirroring the credits page test.
- **Route override:** extend the `[resource]` `entries()` test to assert `affinity` is excluded.
- **e2e** (`e2e/guides.test.ts`): affinity guide renders the bespoke page — 200 status, `h1`, one dataset card label, one bespoke section heading (mirrors the credits e2e test).

## Out of scope

- Schema changes (`kind: 'xp'` etc.) — YAGNI; Credits precedent holds.
- Focus-school/lens strategy content — only the lens-conflation myth is mentioned.
- A stealth-farming how-to (Equinox build etc.) — Adaro is an honorable mention only.
