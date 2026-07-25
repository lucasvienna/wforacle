# 02 — Audit Findings

_All line numbers as of commit `683f627`. Findings are labeled **Fact** (verified in
source) or **Judgment** (assessment). No Critical findings. IDs (H1…, A1…, Q1…, etc.)
are referenced by 03-strategy and 04-task-plan._

**The three ugliest, most urgent issues are H1, H2, H3.**

---

## High severity

### H1. Daily data-refresh commits to `main` (auto-deploys) with only unit tests; CI never re-runs

- **Fact:** `.github/workflows/refresh-data.yml:16-26` runs
  `pnpm update @wfcd/items warframe-worldstate-data` → `pnpm data:build` →
  `pnpm test:unit --run` → commits `static/data/dataset.json` + `pnpm-lock.yaml`
  directly to `main` as `wforacle-bot`. No lint, no svelte-check, no build, no e2e.
- **Fact (GitHub behavior):** pushes made with the default `GITHUB_TOKEN` do not
  trigger other workflows — `ci.yml` never runs on the bot commit. `main`
  auto-deploys via Workers Builds.
- **Fact (amplifier):** several e2e assertions are hard-coded against dataset
  contents: `e2e/completeness.test.ts:54` (`toHaveCount(2)` for `[data-key]`),
  `:103` (exact `11.11%`), `:120` (`9.3%`); `e2e/guides.test.ts:9,34,58` (exact node
  labels). A routine drop-rate change deploys fine, then reddens CI on the _next
  human PR_, misattributing the failure.
- **Fact:** no failure notification step, no `concurrency`, no `timeout-minutes`;
  GitHub auto-disables cron workflows after 60 days of repo inactivity (silent
  staleness).
- **Why it matters:** a daily, unreviewed, partially-tested production deploy path.
- → Task 1.1 (now weekly + PR per decisions log).

### H2. Unhandled dataset-load failure = permanent blank page

- **Fact:** `src/lib/data/dataset.ts:4-8` — no `res.ok` check; `res.json()` cast
  unvalidated. Client caller `src/routes/+page.svelte:57-76` is `onMount(async …)`
  with no try/catch. A 404/500/`Response.error()` (e.g. SW offline path,
  `src/service-worker.ts:55`) → unhandled rejection, `dataset` stays `null`, UI shows
  "Loading Star Chart…" (`+page.svelte:258`) forever. No error state, no retry, and
  no client-side error reporting exists anywhere (O2).
- **Why it matters:** single point of failure for the entire app; failure is invisible
  to the maintainer. → Task 1.2.

### H3. Every `/guides/[resource]` page embeds the full ~158 KB dataset in its HTML

- **Fact:** `src/routes/guides/[resource]/+page.ts:8-9` is a _universal_ load calling
  `loadDataset(fetch)` with `prerender = true` (`:6`) — SvelteKit serializes the
  fetched dataset into each prerendered page as a `data-sveltekit-fetched` replay
  blob. Verified in build output: `.svelte-kit/cloudflare/guides/tellurium.html` =
  **217,640 bytes** vs ~23.5 KB for the homepage. ×29 prerendered guide pages.
- **Fact:** the fix pattern exists in-repo, applied twice with explanatory comments:
  `src/routes/+page.server.ts:5-13` and `src/routes/guides/+page.server.ts:7-10`.
  The `[resource]` route's own comment (`+page.ts:35-38`) addresses the client-chunk
  concern but missed the HTML-embed concern.
- **Why it matters:** ~9× page weight on the SEO landing pages; directly blocks the
  Lighthouse ≥ 97 goal. → Task 2.1.

---

## Medium severity

### A2. `credits`/`affinity` guides are a 253-line clone (plus cloned tests, plus a 3rd/4th phase-vocabulary copy)

- **Fact (diff-measured):** 253 of ~350 lines byte-identical between
  `src/routes/guides/credits/+page.svelte` and `affinity/+page.svelte`:
  `PHASE_LABEL`/`PHASE_TAG` (`credits:12-21` ≡ `affinity:12-21`), 25-line `recCard`
  snippet (`credits:141-165` ≡ `affinity:153-177`), section shells, myths/sources
  loops. Test files are line-for-line clones with fixture strings swapped.
- **Fact:** third identical `PHASE_LABEL`/`PHASE_TAG` at
  `guides/[resource]/+page.svelte:11-20`; fourth re-spelled phase/emoji/color
  vocabulary at `src/lib/panel/ResourceRail.svelte:35-55`.
- **Fact — divergence already exists:** `[resource]/+page.svelte:82-86` renders a
  fallback when `rec.boosterNote` is absent; `credits:152` / `affinity:164` render
  bare `{rec.boosterNote}` (field optional per `types.ts:70`). Latent, not live.
- **Escalation:** Endo + Focus guides are planned (decisions log #3) → this becomes a
  prerequisite. → Task 2.2.

### A3. RegionPanel carries 141 lines of pure logic in its `<script>`, forcing the repo's largest test file

- **Fact:** `src/lib/panel/RegionPanel.svelte:1-162` — six pure formatters
  (`assassinationSourceText:47`, `owSourceText:65`, `zoneCycleLine:93`,
  `owAvailabilityChip:107`, `owSummary:136`, `defaultExpanded`) + three lookup tables,
  none DOM-touching. Result: `RegionPanel.svelte.test.ts` is **1,134 lines**, every
  formatting rule asserted through `render()` + DOM queries. Contrast
  `starchart/geometry.ts` + its 197-line direct test.
- Complexity hotspots (branch counts): `owSummary` ~10, `statusOf`
  (`+page.svelte:83-99`) ~10, SW fetch listener (`service-worker.ts:35-96`) ~12,
  `owAvailabilityChip` ~9, `layoutAnomalies` (`geometry.ts:46-112`) 67 LOC.
- → Task 2.3.

### Q2. Fire-and-forget persistence writes can silently lose progress

- **Fact:** `saveOwned`/`saveQuests` are async (`persistence.ts:24,32`); promises
  dropped at `+page.svelte:62,66`. Same for `void saveAccountId(id)` at
  `importState.svelte.ts:55` and `:63`. Quota/blocked-IDB failure → unhandled
  rejection; user's checkmarks silently gone next visit. → Task 1.6.

### Q3. Provably-wrong type assertion over unvalidated upstream JSON in the worldstate proxy

- **Fact:** `src/routes/api/worldstate/+server.ts:20-27` casts a **4-element**
  `Promise.all` result `as Parameters<typeof buildWorldState>` — a **5-tuple** (the
  5th arg, timestamp, is supplied separately at `:28`). Compiles/works only because
  destructuring takes 4. Four unvalidated JSON bodies asserted into typed shapes.
- Mitigations that exist: `parse.ts:9-10` fallback cycles; `parse.ts:27-28`
  `Object.hasOwn` prototype-pollution guard.
- **Fact:** the `catch {}` at `:39-43` discards which endpoint/status failed (the
  useful error built at `:23` is thrown away); nothing is logged despite Workers
  `invocation_logs` being enabled. No `AbortSignal.timeout` on the fetches (`:22`).
- → Task 1.5.

### D1. Curated free-text labels have no drift canary — one shipped data bug proves it

- **Fact:** all 55 recommendations in `scripts/data/farming.ts` have
  `nodeId: undefined`, so the validation at `scripts/data/assemble.ts:120` is **dead
  code**. `nodeLabel` is free text rendered directly
  (`src/lib/panel/ResourceRail.svelte:71-89`, `guides/[resource]/+page.svelte:78`).
  A game-update node rename keeps the build green and the site wrong.
- **Fact — live bug:** `farming.ts:246` `'Zariman Ten Zero — Tuvul Commons…'`
  slugifies to `zarimantenzero` ≠ region id `zariman` (`scripts/data/special.ts:31`),
  so `recRegionId` (`assemble.ts:29-32`) silently returns `undefined` — Alloy Plate's
  late rec ships without its region link. `farming.ts:617` uses the correct
  `'Zariman — …'` prefix. Unasserted by any test.
- **Fact:** 10+ node-label string literals duplicated across recs (e.g.
  `'Uranus — Assur…'` at `:266,:286,:486`); `lastVerified` format-checked
  (`farming.test.ts`) but never age-checked.
- → Tasks 1.3, 1.4.

### T2. Playwright config lacks CI resilience

- **Fact:** `playwright.config.ts` (12 lines) sets only `webServer`/`testDir`. No
  `forbidOnly: !!process.env.CI` (a stray `test.only` silently shrinks the suite and
  passes green), no `retries`, no `trace` — the failure report CI uploads
  (`ci.yml:104-109`) contains no trace/screenshot. → Task 0.1.

### T3. e2e hits the live Warframe API

- **Fact:** no spec routes `/api/worldstate` (only the profile endpoint is mocked,
  `e2e/import.test.ts:13`); the homepage starts polling on load
  (`+page.svelte:73`). Every e2e run makes real outbound requests; anything near
  rotation chips is nondeterministic. → Task 0.2.

### T4. No coverage measurement; the untested spots are the single points of failure

- **Fact:** no `@vitest/coverage-*` dependency or config. Untested/happy-path-only:
  `dataset.ts` error paths (its one test asserts the injected value round-trips,
  `src/lib/data/dataset.test.ts:5-14`); `persistence.test.ts` (no quota/blocked-IDB/
  migration); `src/service-worker.ts` (96 lines, one indirect offline e2e);
  `src/routes/+page.server.ts` (consumer test fabricates its fixture,
  `src/routes/page.svelte.test.ts:69-81` — producer/consumer can drift).
- → Tasks 0.4, 3.2.

### O2. Zero client-side error visibility

- **Fact:** no error reporting, no `window.onerror`/`unhandledrejection` handler; the
  failure-prone paths (H2, Q2, `worldstate.svelte.ts:28-30` `catch { error = true }`)
  swallow specifics. **Judgment:** no SaaS needed; `console.error` + existing Workers
  logs suffice. → folded into 1.2/1.5/1.6.

### Doc1. README is the untouched `sv` scaffold

- **Fact:** `README.md:1-43` — no product description, live URL, data-pipeline
  contract (esp. that `pnpm build` does NOT rebuild the dataset), or cron mention.
  → Task 3.1.

---

## Low severity

- **A4a.** `importState.svelte.ts:6` hard-imports `tracker/persistence` while
  injecting `fetchProfile` via DI (`:12`) — inconsistent with `createTracker`'s full
  inversion (`tracker.svelte.ts:5-9`; wired at `+page.svelte:59-67`). Three factories,
  three DI philosophies (`createWorldStateStore()` injects nothing, starts
  `setInterval`s on construction, `worldstate.svelte.ts:33-39`). Also stores its key
  in the tracker's IDB store (`persistence.ts:8`).
- **A4b.** Worldstate domain logic split across lib/routes:
  `src/routes/api/worldstate/parse.ts:1` imports `$lib/worldstate/types`;
  `buildWorldState`/`toCycle` belong in `lib/worldstate/`.
- **A4c.** Duplicated widgets: cycle-glyph maps (`RegionPanel.svelte:84-91` ≡
  `WorldStateTicker.svelte:8-15`); checkbox-row (`PartRow.svelte:20-44` ≡
  `QuestsPanel.svelte:20-44`; same Enter/Space handler a 3rd time at
  `StarChart.svelte:72-77`); three hand-rolled dialog focus-trap/restore
  implementations (`ImportDialog.svelte:19-47`, `SettingsDrawer.svelte:22-50`,
  `CommandPalette.svelte:29-41`); "guides list" projection identical in
  `guides/+page.server.ts:13-16` and `llms.txt/+server.ts:10-13`. → Tasks 2.4, 3.6.
- **Q4a.** `node.frameId!` at `+page.svelte:90` and `+page.server.ts:23` where the
  repo's own type-predicate idiom (`regionFrames.ts:35`) solves it properly.
- **Q4b.** `WarframePart.rotation`/`bountyTier` stringly-typed (`types.ts:12-13`),
  re-parsed in 3 places (`availability.ts:17,30`, `RegionPanel.svelte:68-72`) while
  sibling fields are proper unions.
- **Q4c.** `ProfileError.kind` (`profileClient.ts:3-13`) populated with 4 kinds,
  never read — `importState.svelte.ts:37-40` flattens to `.message`. → Task 3.3.
- **Q4d.** `Resource.image`/`Warframe.image` built into the dataset but never read by
  any component (icons come from `asset('/resources/${id}.webp')` etc.) — dead
  payload. Also `regionFrames.ts:38` `dataset.openWorldFarms ?? []` contradicts the
  required type (`types.ts:118`). → Task 3.4.
- **Q4e.** `seed.ts` (133 lines) is test-only but lives in `src/lib/data/`;
  `isRegionRevealed`, `frameFolder`, `matchOwnedFrames`, `matchCompletedQuests`
  exported only for tests; `PaletteItem.type` includes `'action'` never produced by
  `buildPaletteItems`; `handlePick` (`+page.svelte:128-133`) non-exhaustive, silent
  fall-through; `'venus'` default duplicated (`+page.svelte:44,117`). → Task 3.6.
- **S1.** No security headers/CSP anywhere (no `hooks.server.ts`, no `kit.csp`, no
  custom `_headers`). Tolerable for a no-auth static site; cheap win. → Task 3.5.
- **S2.** No timeout on the 4 upstream fetches (`+server.ts:22`); mitigated by edge
  cache hit path (`:15-17`). → Task 1.5.
- **S3.** `pnpm audit`: prod clean; dev has 1 high (`sharp <0.35.0` via
  wrangler→miniflare, build-time only — cleared by pending wrangler bump) and 1 low
  (`cookie` via Kit). Caveat: with zero prod deps, "prod audit clean" understates
  runtime exposure (Kit bundles into `_worker.js` from devDependencies).
- **P2.** Worldstate polls every 60 s with no `document.hidden` gating, no error
  backoff (`worldstate.svelte.ts:35-38`); `sw/update.ts:6-7` module-scope
  `lastCheck = Date.now()` makes the first check within 2 min a silent no-op, and the
  throttle has a small await race (`:37-38`). → Task 3.5.
- **D2.** Pipeline failure mode on missing upstream fields is uniformly _silent skip_
  (`scripts/data/build.ts:227,242-245,258` — a frame can vanish with no log line),
  backstopped only by count floors (`build-data.ts:48-111`); a partial regression
  above the floors passes silently. `static/resources/affinity.webp` exists but
  `fetch-resource-images.sh` cannot reproduce it (hand-list drift).
- **T5.** e2e gaps: desktop Chromium only; no a11y assertions; no import-failure or
  SW-update journeys; no 404 route test. A few tautological tests
  (`seed.test.ts:38-41`, `dataset.test.ts:11`).
- **Doc2.** Public repo, no LICENSE, empty GitHub description. → Task 3.1
  (decision: AGPLv3).
- **O1.** Deployment entirely outside CI (Workers Builds on push) — combined with H1,
  the only _gated_ path to production is the human-PR path.
- **O3.** Every CI job repeats `pnpm install` (6×); acceptable given pnpm store cache.

---

## Security summary

Healthy — no exploitable findings. No user input reaches any URL except the profile
import, strictly validated (`accountId.ts:7-13` `/^[a-f0-9]{24}$/`,
`encodeURIComponent` at `profileClient.ts:23`, 15 s timeout `:25`, distinct error
kinds `:33-43`). Single `{@html}` is the JSON-LD script with `<` → `\u003c` escaping
over non-user data (`SeoHead.svelte:35-37`). SW ignores cross-origin/non-GET and
caches only `res.ok` (`service-worker.ts:37-39,50,74,92`), version-scoped cache
eviction bounds growth. No secrets in history (grep clean). Committed `.env` is
public-by-design and documented.

---

## Strengths — preserve these

1. **Factory-based state, zero module-level reactive singletons** — the #1 SvelteKit
   SSR footgun fully avoided; all stores disposed (`+page.svelte:78-81`).
2. **Pure-core/thin-shell discipline** in `model/`, `geometry.ts`, `availability.ts`,
   `search.ts`, and the entire data pipeline (1,168 test lines vs 1,116 pipeline
   lines, fixture-based).
3. **Real layered validation on generated data:** referential integrity
   (`assemble.ts:93-144`) + calibrated canary floors + named-entity assertions
   (`build-data.ts:48-111`), provenance stamped into the artifact (`:116`).
4. **CI gate completeness:** lint + format + typecheck + unit + build + e2e on every
   PR and push to main, with concurrency-cancel, pnpm + Playwright caching, and
   build-artifact reuse.
5. **Load-bearing why-comments** (replay-blob avoidance at `+page.server.ts:5-12`;
   `cache: 'no-store'` rationale at `worldstate.svelte.ts:14-19`; SW `waitUntil` at
   `service-worker.ts:56-59`; prerender-crawler reasoning at
   `guides/[resource]/+page.ts:23-38`).
6. **Accessibility done for real:** focus traps on all three overlays + focus
   restore; full combobox ARIA in `CommandPalette:99-124`; `role="group"` rationale
   comments in `FrameCard:162-165`.
7. **MSW-as-proof-tool testing:** `onUnhandledRequest: 'error'`
   (`vitest-setup.ts:7`); request-count negative assertions
   (`importState.svelte.test.ts:46-55`, `worldstate.svelte.test.ts:74-86`);
   shape-named regression fixtures. Zero `.skip`/`.only` in the whole suite.
8. **PartRow's `Snippet<[boolean]>` design** (`PartRow.svelte:14`) — the right
   Svelte 5 primitive; callers style, the row owns semantics.
