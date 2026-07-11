# World-State Widget + Live Bounty Rotation — Design

**Date:** 2026-07-11
**Status:** Approved (pending spec review → implementation plan)

## Goal

Add a live world-state widget fed by the WFCD status API
(`api.warframestat.us`), and overlay live bounty-rotation availability onto the
open-world frame parts. The widget shows the three open-world **cycles** (Cetus
day/night, Vallis warm/cold, Cambion fass/vome) with countdowns, plus the
**current global bounty rotation letter** (A/B/C) with a countdown to the next
flip. Each open-world component row gains a live availability badge derived from
its curated `rotation` vs. the current letter.

## Key facts (grounding — verified against the live API + wiki)

- **Three cycle endpoints** return `{ state, expiry, ... }`:
  `cetusCycle` (`day`/`night`), `vallisCycle` (`warm`/`cold`),
  `cambionCycle` (`fass`/`vome`).
- **Bounty reward pools rotate `A→B→C→A` every 150 minutes**, globally synced
  across all bounties (Warframe wiki, "Bounty"). There is **no explicit rotation
  field** anywhere in the worldstate JSON (verified: no `rotation`/`cycle` key on
  jobs).
- **The current rotation letter is derivable** from the Narmer weapon present in
  the `syndicateMissions` reward pools: **Verdilac → A, Nepheri → B, Korumm → C**
  (one is always present in the Ostrons/Solaris pools post–New War). Validated
  live: pool contained `Korumm Blueprint` (→ C) while the only Caliban part up was
  Neuroptics, whose curated rotation is C. Consistent.
- **Availability is computed from our own curated `rotation`**, not from
  name-matching the (flattened, over-reporting) reward pool. This is
  deterministic and covers **Qorvex** (all parts Rot C) even though the API
  surfaces **zero** Cavia/Qorvex data, and **Hildryn** (Exploiter Orb, no
  rotation → always available).
- The `syndicateMissions` `expiry` (identical across syndicates) is the
  rotation-flip time.
- App is **fully prerendered** (`+layout.ts: prerender = true`); the service
  worker is **cache-first for everything except `/data/dataset.json`**.

## Non-goals

- No account-specific data (progress, inventory) — the API is account-agnostic.
- No platform switch — hardcode `pc` (cycles/rotations are platform-synced).
- No change to `dataset.json` or the build pipeline — this is a pure runtime
  overlay on top of the existing static data.
- No historical/next-N-rotations schedule beyond "current + when your part is
  next up".

## Architecture

```
warframestat.us  ──►  /api/worldstate (Worker endpoint, edge-cached ~60s)
                          │  trims + derives rotation letter
                          ▼
             worldstate.svelte.ts (client rune store: poll 60s, tick 1s)
                          │
           ┌──────────────┴───────────────┐
           ▼                              ▼
   WorldStateTicker.svelte          RegionPanel.svelte
   (header: cycles + rotation)      (contextual: zone cycle + per-part badge)
```

### 1. Worker endpoint — `src/routes/api/worldstate/+server.ts`

- `export const prerender = false;` (the app is otherwise prerendered — this one
  route runs on the Worker at request time).
- `GET`: fetch four upstream endpoints in parallel from
  `https://api.warframestat.us/pc/{cetusCycle,vallisCycle,cambionCycle,syndicateMissions}?language=en`.
- Compute and return a small JSON payload (below). Derivation logic lives in a
  **pure, unit-tested** `parse.ts` (no network) so the handler is a thin wrapper.
- **Edge cache** via the Workers `caches.default`: key on the request URL; on
  miss, fetch+compute, `cache.put` a clone with `Cache-Control: public,
s-maxage=60, stale-while-revalidate=120`. On hit, return the cached response.
- **Upstream failure** (any fetch rejects / non-2xx): return
  `{ ok: false }` with `Cache-Control: no-store` (so it retries next poll).
  Never throw — the widget must degrade, not break the page.

**Response shape** (`WorldState`):

```ts
export interface CycleState {
	state: string; // "day"|"night" | "warm"|"cold" | "fass"|"vome"
	expiry: string; // ISO8601
}
export interface RotationState {
	letter: 'A' | 'B' | 'C' | null; // null = underivable (no Narmer weapon found)
	expiry: string | null; // next flip; null when letter is null
}
export interface WorldState {
	ok: boolean;
	fetchedAt: string; // ISO8601
	cetus: CycleState;
	vallis: CycleState;
	cambion: CycleState;
	rotation: RotationState;
}
```

### 2. Pure parse/derive — `src/routes/api/worldstate/parse.ts`

Unit-tested pure functions over raw upstream JSON:

- `deriveRotation(syndicateMissions): RotationState`
  - Union all `jobs[].rewardPool` strings across syndicates.
  - `Verdilac → A`, `Nepheri → B`, `Korumm → C` (match `/^(Verdilac|Nepheri|Korumm)\b/`).
  - Exactly one expected; if none (or the field is missing) → `{ letter: null,
expiry: null }`. `expiry` = first syndicate's `expiry`.
- `toCycle(raw): CycleState` → `{ state: raw.state, expiry: raw.expiry }`.
- `buildWorldState(cetus, vallis, cambion, syndicates, nowIso): WorldState`.

### 3. Availability logic — `src/lib/worldstate/availability.ts` (pure, tested)

Shared by the ticker and RegionPanel; no network.

```ts
export type PartAvailability = 'available' | 'unavailable' | 'always' | 'unknown';

/** rotation: the part's curated WarframePart.rotation
 *  ('any' | 'A' | 'B' | 'C' | 'A/B' | undefined); letter: current global letter. */
export function partAvailability(
	rotation: string | undefined,
	letter: 'A' | 'B' | 'C' | null,
): PartAvailability;
//  undefined            → 'always'    (Exploiter Orb / non-bounty component)
//  letter === null      → 'unknown'   (derivation failed → show static only)
//  'any'                → 'available'
//  rotation.split('/').includes(letter) → 'available'
//  otherwise            → 'unavailable'

const ROTATION_MINUTES = 150;
/** When the part's required rotation is next active, given the current letter,
 *  the flip `expiry`, and `now`. Returns null when available now or unknown. */
export function nextActiveAt(
	rotation: string | undefined,
	letter: 'A' | 'B' | 'C' | null,
	expiry: string | null,
	now: number,
): Date | null;
//  Walk future windows: window i (1-based) has letter rotate(letter, i),
//  starts at expiry + (i-1)*150min. Return the start of the first window whose
//  letter is in the part's required set. 'A/B' matches whichever comes first.
```

### 4. Client store — `src/lib/worldstate/worldstate.svelte.ts`

A rune-based store (mirrors `tracker.svelte.ts` style), browser-only:

- `createWorldStateStore()` returns `{ state, error, refresh, dispose }` where
  `state` is `$state<WorldState | null>`.
- On create (guard `browser`): `refresh()` once, then `setInterval(refresh, 60_000)`.
- `refresh()`: `fetch('/api/worldstate')`; on `ok:false` or network error set
  `error` and keep the last good `state`.
- Countdowns re-render off a single shared 1-second tick: the store owns a
  `now` value (`$state<number>`, epoch ms) updated by one `setInterval(…, 1000)`
  and exposed via a `now` getter. Components compute `expiry - store.now` — no
  per-component timers. (One 60s poll timer + one 1s tick timer total.)
- `dispose()` clears both intervals. `+page.svelte` creates the store in
  `onMount` and disposes in `onDestroy` (next to the tracker).

`formatCountdown(ms): string` helper → `"1h20m"`, `"24m"`, `"38s"` (shared).

### 5. Header ticker — `src/lib/worldstate/WorldStateTicker.svelte`

Compact strip placed in the `+page.svelte` header (in the `ml-auto` group,
before Search, or as a second line under the title on small screens). Renders:

- Three cycles: glyph + label + countdown, e.g.
  `🌙 Cetus night · 24m` · `❄ Vallis cold · 18m` · `🍄 Cambion fass · 24m`.
  Glyphs: day ☀ / night 🌙, warm 🔥 / cold ❄, fass 🟠 / vome 🔵 (or text).
- Rotation: `Rotation C · flips 21m` (muted when `letter === null`).
- Loading: a muted placeholder. Error/offline: `⚠ live status unavailable`
  (from `store.error` with no prior `state`). Never blocks layout.

### 6. Contextual in `RegionPanel.svelte`

`RegionPanel` gains an optional `worldState?: WorldState | null` prop (passed
from `+page.svelte`). For open-world regions:

- **Zone cycle line** under each open-world zone header: the region's relevant
  cycle (`earth→cetus`, `venus→vallis`, `deimos→cambion`), e.g.
  `Plains of Eidolon · 🌙 night · 24m`.
- **Per component-part badge** appended to each open-world part row (extend the
  existing open-world row rendering — the `frameCard` snippet already renders
  these rows via `owSourceText`; add a small availability chip beside it):
  - `available` → `● up now · resets {countdown}` (emerald).
  - `unavailable` → `○ Rot {rotation} · up in {nextActiveAt countdown}` (muted).
  - `always` → `● always available` (Hildryn).
  - `unknown` → no chip (static row only).
- The bp row shows no availability chip (blueprint is quest/market, not a bounty
  rotation).

`worldState` is `null` until the first poll resolves (and on error) → rows
render static-only, exactly as today.

### 7. Service worker

Add a rule in `src/service-worker.ts` (before the generic cache-first branch):
`/api/worldstate` is **network-first** — try network, and on failure fall back
to the cached copy if any (so offline shows last-known, and the client's own
error path still degrades). Never let the cache-first branch freeze it.

## Testing

- `src/routes/api/worldstate/parse.test.ts`: `deriveRotation` (Verdilac/Nepheri/
  Korumm → A/B/C; none → null; picks first syndicate expiry), `toCycle`,
  `buildWorldState` — from trimmed real-API fixtures.
- `src/lib/worldstate/availability.test.ts`: `partAvailability` for
  any/A/B/C/`A/B`/undefined/`letter=null`; `nextActiveAt` window math
  (available-now → null; C-needed-while-A → correct 150-min offset;
  `A/B` picks the sooner); `formatCountdown` formatting.
- `src/lib/worldstate/WorldStateTicker.svelte.test.ts`: renders cycle states +
  countdowns; muted rotation when `letter=null`; error/loading states.
- `src/lib/panel/RegionPanel.svelte.test.ts` (extend): open-world rows show the
  right chip for `available`/`unavailable`/`always`/`unknown`; no chip when
  `worldState` is null; zone cycle line renders.
- `+server.ts` handler: mock global `fetch` → returns trimmed payload on success;
  `{ ok:false }` on upstream failure; sets cache headers. (Vitest with a stubbed
  `fetch` and a stubbed `caches.default`.)
- `src/routes/page.svelte.test.ts` (extend if needed): ticker mounts without
  breaking the page when the store errors.

## Files touched

- **New:** `src/routes/api/worldstate/+server.ts`, `.../parse.ts`, `.../parse.test.ts`
- **New:** `src/lib/worldstate/types.ts`, `availability.ts`, `availability.test.ts`,
  `worldstate.svelte.ts`, `WorldStateTicker.svelte`, `WorldStateTicker.svelte.test.ts`
- **Modify:** `src/routes/+page.svelte` (mount store, render ticker, pass
  `worldState` to RegionPanel), `src/lib/panel/RegionPanel.svelte` (+ its test),
  `src/service-worker.ts` (network-first for `/api/worldstate`).

## Assumptions / risks

- **Rotation `expiry` = syndicateMissions `expiry`.** Per the wiki the bounty
  refresh and rotation flip share the 150-min cycle; the API exposes one
  `expiry`. If they ever diverge, the flip countdown is slightly off. Documented.
- **Narmer-weapon derivation** depends on one of Verdilac/Nepheri/Korumm always
  being in the pool. If the API changes or none is found, `letter=null` →
  overlay hides, static-only. Fail-soft, never wrong.
- **Qorvex/Cavia gap** is sidestepped by computing from curated `rotation`, not
  the API pool — Qorvex shows correctly against the global letter.
- **Edge cache** relies on `caches.default` in the Workers runtime; if
  unavailable in a given environment the endpoint still works (just uncached),
  and upstream is hit at most once per client poll (60s).
- **CORS/uptime** of warframestat.us is shielded by the Worker proxy; the widget
  degrades to "unavailable" if upstream is down.
