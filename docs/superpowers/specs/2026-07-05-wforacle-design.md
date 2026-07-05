# wforacle — Design Document

**Date:** 2026-07-05
**Status:** Draft for review
**Author:** Lucas Vienna (with Claude)

---

## 1. Overview

**wforacle** is a fast, local-first web app for tracking Warframe farming progression, built around a visual, in-game-styled Star Chart. It is both a personal progression tracker and a farming reference.

**One-sentence core:** *Browse the Star Chart, see each planet's Warframe drops and resources at a glance, tick off what you've earned, and get an opinionated "best place to farm this" — split early-game vs. Steel-Path-squad — all instantly and stored locally.*

The app blends three lenses over a single canonical entity (the Star Chart node):
1. **Drops** — trackable (checkboxes), primarily Warframe parts from Assassination bosses.
2. **Resources** — informational, per planet, with best-farm badges.
3. **Farming quality** — early-game vs. mid/late-game recommendations, surfaced as badges and drill-downs.

## 2. Goals & non-goals

### v1 goals
- A visual, in-game-styled Star Chart as the hero surface (elliptical ring of planet spheres, completion-colored).
- Local-first progression tracking of **Warframe parts** (per-part and whole-frame toggles), persisted to IndexedDB, with an always-visible completion readout.
- Per-planet **resource** display (informational) with early-game / mid-late best-spot badges and a drill-down to farming detail.
- Docs-quality shell: command palette (Ctrl-K), keyboard-friendly, editorial calm, edge-fast.
- **Spoiler-aware progressive disclosure:** default to the fresh, post-*Awakening* starting chart; hide quest-locked regions (and their drops) until the player toggles the relevant quest as complete. Never spoil late-game/story content by default.
- "Loads at the speed of thought" — prerendered static, CDN/edge-served.

### Non-goals (deferred to v2/v3)
- **Prime Warframes** + the Void Relic / Fissure / vault subsystem (a separate acquisition path; see §5).
- **Weapons, companions, full Mastery** tracking.
- **Live worldstate overlays** ("fissures/sorties active now").
- **Account sync / multi-device** — v1 is local-only (IndexedDB).
- **Game-accurate theming** (multiple in-game UI themes) — v1 ships one dark theme; CSS is tokenized so themes drop in later.
- **Mobile-first layout** — desktop-first; mobile is a later concern.
- **Duviri (Circuit)** and **Railjack/Proxima** as tracked surfaces — separate systems, out of the v1 ring.

## 3. Users

Primary user: the author — a Warframe player who wants an at-a-glance progression tracker and farming reference. Secondary: any player who finds it useful. No accounts, no server-side user data.

## 4. Architecture & stack

Islands-style interactivity over mostly-static content, no backend in v1.

- **SvelteKit** (static output via `@sveltejs/adapter-cloudflare`; every page `prerender = true`). Pure-content routes set `csr = false` to ship zero JS. Interactive routes hydrate normally.
- **Svelte 5** (runes) for interactivity.
- **Tailwind CSS** + **shadcn-svelte** for UI primitives (incl. the **Command** component for Ctrl-K).
- **mdsvex** for editorial content (farming guides) as Markdown/Svelte.
- **Star Chart rendering: SVG** — ~14 planet spheres + special-region nodes + orbital arcs + glow, generated from a data array via an ellipse formula (angle → x/y, front-ness → size/brightness/paint-order). DOM-clickable, CSS-styleable, accessible, animatable; no canvas/WebGL engine.
- **State + tracking:** Svelte 5 runes in a shared store handed down via `setContext`/`getContext` (SSR-safe — no module-level server singleton), hydrated in the browser from IndexedDB (guarded with `browser` from `$app/environment`). Write-through to IndexedDB via **`idb`**. Optimistic/synchronous UI; persistence follows.
- **Deploy:** Cloudflare Pages via the Cloudflare adapter. Prerendered static now; door open to edge SSR later (e.g., account sync).

**Rejected alternatives:** *Astro* (islands-first pays off for ~90% static sites; ours is pervasively interactive, and the Astro↔Svelte bridge adds friction). *Next.js* (heavier baseline for ~static content; no SSR need without a backend). *nanostores* (framework-agnostic store unnecessary in a single-framework SvelteKit app; native runes suffice).

## 5. Data model

The app defines its own normalized shape (not WFCD's raw shape).

### Entities
- **Region** — `id, name, kind (planet | special), progressionOrder, unlock {via: junction|quest|key, questId?, junction?}, spoilerGated (bool), factions[], resourceIds[], nodeIds[]`
- **Quest** — `id, name, revealsRegionIds[], revealsFrameIds[]` — the gate for progressive disclosure. Minimal metadata only (name + what it reveals); no story content stored.
- **Node** — `id (SolNode), regionId, name, missionType, faction, isAssassination, bossId?, drops[]`
- **Boss** — `id, name, nodeId, faction` (assassination only)
- **Warframe** — `id, name, acquisition (boss | quest | dojo | bounty | vendor | railjack | duviri | event), nodeId? (if boss-linked), image, parts[]`
- **WarframePart** — `id (frame+slot), frameId, slot (BP | Neuroptics | Chassis | Systems), dropSourceNodeId?` — **the trackable atom**
- **Resource** — `id, name, image, regionIds[], recommendations[]`
- **Recommendation** (curated) — `resourceId, nodeId, phase (early | late), boostersApply (bool), note, source, lastVerified`

### Tracking state (IndexedDB)
- `owned` — set of `WarframePart.id`s. Whole-frame toggle = set/clear all four parts. Completion % = owned parts ÷ total.
- `completedQuests` — set of `Quest.id`s. Drives spoiler-aware disclosure (§8.1): a spoiler-gated region/frame is revealed once its gating quest is in this set.

Structured storage now = trivial extension to weapons/Primes later.

### Star Chart region taxonomy (complete)
The data model includes **all node-based regions**, even where v1 only surfaces some prominently.

**Main planetary rail (14, Junction-locked progression):**
Mercury (11), Venus (14), Earth (14), Mars (17), Phobos (11), Ceres (14), Jupiter (16), Europa (14), Saturn (15), Uranus (14), Neptune (13), Pluto (13), Eris (13), Sedna (16). *(node counts approximate; verified from live data at build.)*

**Special / quest-locked regions (node-based, off the junction rail):**
- **Void** (~13 nodes) — relic/Void missions; accessible after initial progression.
- **Lua** (~8) — *The Second Dream*.
- **Deimos** (~9 + open-world Cambion Drift) — *Heart of Deimos*.
- **Kuva Fortress** (~8) — *The War Within*.
- **Zariman** (~5) — *Angels of the Zariman*.
- **Höllvania** (1999 content) — *The Hex*.

**Out of scope for the v1 ring (separate systems, deferred):** Duviri/Circuit (open-world, not node-based), Railjack/Proxima (Earth/Venus/Saturn/Neptune/Pluto/Veil Proxima), Dojo/Relays (social, no farming nodes).

**Modeling notes (from research):**
- Progression is a **branching tree**, not a linear chain. Mercury unlocks via *Vor's Prize* (no Junction); Europa branches off Jupiter; Deimos/Void have no Junction. Model Junctions as `(hostRegion, unlocksRegion, specter)`, not one-per-planet.
- Only **~18 non-Prime frames** map cleanly to an Assassination node/boss. Quest/bounty/dojo/vendor/Railjack/Duviri frames have no single-node source; **all Primes** route through the Void Relic system. v1 tracks the node-linked set; the rest are modeled with an `acquisition` type and shown, but Primes/weapons are deferred.
- Node→boss and boss→drop are **many-to-many** (e.g., Ceres/Exta = Vor + Kril → Frost).

## 6. Data pipeline (build-time)

A script under `scripts/` produces the app's committed JSON. No runtime API calls — the app ships with its data.

1. **Fetch** WFCD sources: `warframe-worldstate-data/solNodes.json` (Star Chart skeleton), `warframe-drop-data` `missionRewards.json` + reverse indexes (drops with rarity/chance), `warframe-items` `Warframes.json` + `Resources.json` (metadata/images). Pull via `raw.githubusercontent.com/.../gh-pages/data/*.json` (avoids Cloudflare 403) with a normal User-Agent.
2. **Normalize + join** the three datasets (node string ↔ `SolNode` id ↔ item `uniqueName`) with a small **manual alias-override file** for the handful that don't auto-match.
3. **Merge curated overlay** — hand-authored `recommendations` (early/late, boostersApply, note, source, `lastVerified`) + farming-guide prose (mdsvex). Strategy sourced from current `wiki.warframe.com/w/<Resource>_Farming_Guide` pages (maintained), not the dated Reddit/Steam guides.
4. **Emit** compact, app-shaped JSON: a small global bundle (regions, frames, resources) + **per-region slices** for lazy drill-down.
5. **Images** — download the needed subset (~18 frames + ~25 resources + faction/rarity icons), optimize, self-host in `/static` for edge speed (avoid hotlinking).
6. **Refresh** — re-run gated on WFCD `info.json` hash; every recommendation surfaces its `lastVerified` date in the UI.

**Scoping win:** because v1 needs only the ~18 node-linked frames + ~25 resources + Assassination nodes, the dataset is **hand-verifiable end-to-end**. The scary cross-dataset name-join is largely a Primes/weapons problem, deferred with them.

## 7. Local-first tracking

- **Atom:** `WarframePart.id`. **Store:** a runes-backed `owned: SvelteSet<string>` + `$derived` completion counts, provided via context.
- **Persistence:** a `$effect` writes changes through to an IndexedDB object store (`idb`). Reads hydrate once on mount (browser-only).
- **Interaction (OSRS-inspired):** click **anywhere on a part row** to toggle; owned rows fill instantly (optimistic), no spinner. "Toggle whole frame" flips all parts. Always-visible completion readout ("Node Frames 6/18" + bar) is the running-total analog.
- **Booster nuance surfaced in UI:** crate-farm recommendations are flagged "boosters/Steel-Path passive don't apply"; enemy-kill farms flagged that they do.
- **Quest completion** lives in the same local store (`completedQuests`), toggled from the Quests panel; it drives spoiler-aware disclosure (§8.1) rather than counting toward frame completion.

## 8. UI

### 8.1 Spoiler-aware progressive disclosure
The tracker mirrors the player's real progression and avoids spoiling later content.

- **Default state = post-*Awakening* starting chart.** A brand-new install shows the main planetary rail (planets not yet reached render dim/locked, as they do in-game — the rail itself isn't a spoiler) but **hides all spoiler-gated special regions** (Void, Lua, Deimos, Kuva Fortress, Zariman, Höllvania) and any quest-locked frames. Their mere existence can spoil story, so they stay hidden until earned.
- **Quest toggle.** A "Quests / Progress" panel (also reachable via Ctrl-K) lists the small set of gating quests by name only. Marking a quest complete adds it to `completedQuests`, which reveals its `revealsRegionIds` on the ring and its `revealsFrameIds` in tracking — with a subtle reveal animation. Un-toggling re-hides them.
- **No accidental spoilers.** Hidden regions/frames are omitted entirely (not shown greyed with names), and the command palette excludes un-revealed entities. Quest names themselves are the only forward-reference, and are opt-in to read.
- **Escape hatch.** A single "Reveal everything (show spoilers)" switch in settings unhides all regions for players who don't care — off by default.

### Shell
Top bar: brand, **Ctrl-K command palette** ("jump to planet/frame/resource"), always-visible completion readout. One dark theme in v1 (tokenized CSS for future in-game themes). Keyboard-friendly; editorial calm.

### Hero — Star Chart (direction "C", hybrid)
- **Elliptical ring of planet spheres** (SVG), generated from the region data array: angle → position, front-ness → size/brightness/paint-order, giving pseudo-depth like the in-game chart. Central glow stands in for the seated frame (v1); curved orbital arcs connect worlds.
- **Special regions** (Void, Lua, Deimos, Kuva Fortress, Zariman) render as smaller off-ring "anomaly" nodes, echoing how the game floats them off the main ring — **but only once revealed** via their gating quest (§8.1). A fresh chart shows none of them.
- **Completion is shown as color** on each world: green = complete, gold = in progress, dim = untouched, cyan halo = selected.
- Clicking a world selects it; its detail loads in a **panel below the ring** (not a modal, not a separate page) — browse and track stay on one surface.

### Detail panel (per selected region)
- **Left — Assassination + tracking:** boss → frame, with click-to-toggle part rows (owned fills green), drop % from WFCD, part source annotations, "toggle whole frame."
- **Right — Resources (informational):** each resource with early (⚡) / mid-late (💀) best-spot badges, the booster nuance inline, and a `farming ▸` drill-down to the full guide. Read-only (no checkbox) — matches "purely informational."

### Farming guides
Editorial mdsvex pages (organized early/mid/late, echoing thersguide.com's structure) that the resource drill-downs link into. The opinionated "best node per resource" verdict also surfaces as the ring badges.

## 9. Deployment & performance

Prerendered static site on Cloudflare Pages (edge/CDN). Content routes ship zero JS (`csr = false`); interactive surfaces hydrate. Target: instant navigation, optimistic local updates, spinners only on cold start.

## 10. Attribution & licensing

Data derived from WFCD (MIT) open datasets, themselves parsed from Digital Extremes' public drop tables. Credit WFCD; display "not affiliated with Digital Extremes." Warframe and related assets © Digital Extremes.

## 11. Deferred / open (v2+)
- Primes + Void Relic/Fissure/vault tracking (per-part vault status).
- Weapons / companions / full Mastery.
- Live worldstate overlay (active fissures/sorties/invasions).
- Account sync / multi-device.
- Multiple in-game UI themes.
- Mobile-optimized layout.
- Duviri / Railjack surfaces.
- Steel Path toggle mirroring the chart.
