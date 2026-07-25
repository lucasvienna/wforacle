# 04 — Task Plan

_Sizes: S < 2h · M ≈ half day · L = 1–2 days · XL = break down further.
Risk = chance of breaking existing functionality. Finding IDs refer to
02-audit-findings.md. Owner decisions from README.md are folded in._

## Milestone 0 — Safety Net (before anything else)

| #   | Task                                                                                                                                                                              | Files/areas                                                             | Acceptance criteria                                                                                                    | Size | Risk | Deps |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- |
| 0.1 | Harden Playwright config: `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 2 : 0`, `use: { trace: 'on-first-retry' }`                                                   | `playwright.config.ts`                                                  | A failing CI e2e uploads a trace; a committed `test.only` fails CI                                                     | S    | none | —    |
| 0.2 | Mock `/api/worldstate` in e2e via a shared fixture (`page.route` with a canned WorldState payload)                                                                                | new `e2e/fixtures.ts`, all specs                                        | Zero requests to `warframestat.us` during e2e; suite green with network blocked to that host                           | S    | low  | —    |
| 0.3 | De-brittle dataset-coupled e2e assertions: counts become `>=` or derive from the dataset; exact percentages/labels move to a fixture or are read from `dataset.json` at test time | `e2e/completeness.test.ts:54,103,120,126`, `e2e/guides.test.ts:9,34,58` | A synthetic dataset change (drop rate ±0.1%, +1 key-boss node) keeps e2e green; genuinely broken rendering still fails | S    | low  | —    |
| 0.4 | Add `@vitest/coverage-v8`; report-only in CI (no threshold)                                                                                                                       | `vite.config.ts`, `package.json`, `ci.yml` unit job                     | Coverage summary visible in CI logs                                                                                    | S    | none | —    |

## Milestone 1 — Critical Fixes

| #   | Task                                                                                                                                                                                                                                                                                                                                            | Files/areas                                                                                                             | Acceptance criteria                                                                                                                             | Size | Risk | Deps                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ------------------------------------------------------------------------- |
| 1.1 | **Refresh-data: weekly + PR flow** (sketch below). Change cron to weekly (e.g. `17 6 * * 1`); replace commit-push with an auto-created PR on a fixed bot branch; enable auto-merge; add `concurrency`, `timeout-minutes`, and an `if: failure()` step that opens/updates a pinned issue                                                         | `.github/workflows/refresh-data.yml`                                                                                    | Bot opens a PR; full `ci.yml` runs on it; auto-merges on green; a deliberately-broken dataset produces a red PR, not a deploy; failure notifies | M    | low  | 0.3 (else the first real data change reddens the PR for the wrong reason) |
| 1.2 | **Dataset load error state** (sketch below): `res.ok` + shape sanity check in `loadDataset`; try/catch in the page boot with error + retry UI                                                                                                                                                                                                   | `src/lib/data/dataset.ts`, `src/routes/+page.svelte`, tests                                                             | Blocking the request in DevTools shows an error with a working Retry; unit tests for 404 / network reject / `{}` body                           | M    | low  | —                                                                         |
| 1.3 | Fix the Zariman slug bug + lock it: change `farming.ts:246` to the `'Zariman — …'` prefix (matching `:617`); add a test asserting the Alloy Plate late rec resolves `regionId: 'zariman'`                                                                                                                                                       | `scripts/data/farming.ts:246`, `scripts/data/farming.test.ts` or `assemble.test.ts`; regenerate + commit `dataset.json` | Rec carries the region link; test fails on regression                                                                                           | S    | none | —                                                                         |
| 1.4 | Build-time validation of curated `nodeLabel`s: parse the `"Planet — Node"` prefix and resolve against real node names; explicit allowlist for intentional non-nodes (Anywhere, Sanctuary Onslaught, Höllvania, proxima, fissures); remove-or-revive the dead `rec.nodeId` check (`assemble.ts:120`); warn on `lastVerified` older than 6 months | `scripts/data/assemble.ts` and/or `build-data.ts`, `farming.ts`                                                         | Renaming a node in fixtures makes `pnpm data:build` exit 1; allowlist documented                                                                | M    | low  | 1.3                                                                       |
| 1.5 | Worldstate proxy hardening: fix the wrong-arity `as Parameters<…>` cast (type the four bodies explicitly); `AbortSignal.timeout(5000)` per fetch; `console.error` with endpoint + status in the catch                                                                                                                                           | `src/routes/api/worldstate/+server.ts:20-27,39`                                                                         | Types honest; hung upstream bounded; `wrangler tail` shows failures; existing `server.test.ts` green (extend for timeout path)                  | S    | low  | —                                                                         |
| 1.6 | `.catch` + log on all fire-and-forget persistence writes; optionally surface a "couldn't save" hint                                                                                                                                                                                                                                             | `+page.svelte:62,66`, `importState.svelte.ts:55,63`                                                                     | No unhandled rejection when IDB write rejects; unit test with a rejecting persist callback                                                      | S    | none | —                                                                         |

## Milestone 2 — High-Leverage Improvements

| #   | Task                                                                                                                                                                                                                                                                                                                                                       | Files/areas                                                                                                                                        | Acceptance criteria                                                                                                                                                                         | Size | Risk   | Deps    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ | ------- |
| 2.1 | **Server load for `guides/[resource]`** (sketch below) — kill the ~190 KB replay blob on 29 pages                                                                                                                                                                                                                                                          | `guides/[resource]/+page.ts` → `+page.server.ts` (+ thin universal load or in-component glob for the mdsvex guide)                                 | Every `guides/*.html` < 30 KB with zero `data-sveltekit-fetched` blobs; guides e2e green                                                                                                    | M    | medium | 0.1–0.3 |
| 2.2 | Extract `GuideLongform` + shared `guidePhases.ts`; reduce credits/affinity pages to data files. **Prerequisite for the planned Endo and Focus guides** (decision #3)                                                                                                                                                                                       | new `src/lib/guides/`, `guides/{credits,affinity}/+page.svelte`, `guides/[resource]/+page.svelte:11-20`, `ResourceRail.svelte:35-55`, merged tests | One `PHASE_LABEL` definition in `src`; both pages visually equivalent; unified `boosterNote` fallback (A2 divergence closed); adding a new longform guide requires no copied section shells | L    | medium | —       |
| 2.3 | Extract RegionPanel pure formatters into `panel/sourceText.ts` + `panel/chips.ts` with direct unit tests; shrink the DOM test accordingly                                                                                                                                                                                                                  | `RegionPanel.svelte:37-162`, new modules + tests                                                                                                   | RegionPanel `<script>` < 60 lines; `RegionPanel.svelte.test.ts` shrinks ≥ 40%; suite measurably faster                                                                                      | L    | medium | —       |
| 2.4 | Single `Drawer.svelte` (focus trap, restore, Escape, backdrop) used by ImportDialog + SettingsDrawer; shared focus-restore helper for CommandPalette                                                                                                                                                                                                       | `src/lib/panel/` or `src/lib/ui/`, 3 components                                                                                                    | One focus-restore implementation; settings/import/palette e2e green                                                                                                                         | M    | medium | —       |
| 2.5 | **Lighthouse baseline + follow-ups** (decision #5): script LH runs (mobile + desktop) against the built output for `/`, `/guides`, one `[resource]` page, `/guides/credits`; record before/after 2.1; then fix whatever the report names until ≥ 97 everywhere (candidates: font loading, dataset fetch preload on `/`, image `fetchpriority`, unused CSS) | `scripts/` (LH runner), findings-driven                                                                                                            | Documented baseline table in this repo; LH ≥ 97 mobile + desktop on all four pages against production build                                                                                 | M–L  | low    | 2.1     |
| 2.6 | CI perf guard: size-budget assertion on built HTML (e.g. fail if any `guides/*.html` > 40 KB or `index.html` > 40 KB) — cheap proxy that prevents the replay-blob class from returning; optionally Lighthouse CI later                                                                                                                                     | `ci.yml` build job or a small script                                                                                                               | CI fails if a page regresses past budget; budget values documented                                                                                                                          | S    | none   | 2.1     |

## Milestone 3 — Quality & Polish

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Files/areas                                                                       | Acceptance criteria                                                                                             | Size | Risk |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| 3.1 | README rewrite (purpose, live URL, architecture, data-pipeline contract incl. "committed dataset is the artifact; `pnpm build` does not rebuild it", scripts, weekly refresh cron) + **LICENSE: AGPLv3** with a NOTICE section (code = AGPLv3; Warframe names/imagery © Digital Extremes under their fan-content policy; wiki-derived data attributed per the wiki's license) + short CONTRIBUTING note (solo-focused, PRs welcome) + GitHub repo description | `README.md`, `LICENSE`, `CONTRIBUTING.md`                                         | New contributor can build + test from README alone; license posture unambiguous                                 | M    | none |
| 3.2 | Failure-path tests: `persistence.ts` (blocked IDB, quota), `dataset.ts` malformed payloads (if not fully covered by 1.2), SW behaviors worth pinning                                                                                                                                                                                                                                                                                                          | test files                                                                        | T4 gaps closed                                                                                                  | M    | none |
| 3.3 | Consume `ProfileError.kind` for differentiated import error UI (404 vs rate-limit vs network), or delete the field                                                                                                                                                                                                                                                                                                                                            | `importState.svelte.ts:37-40`, `ImportDialog.svelte`                              | Distinct messages rendered + tested, or dead field removed                                                      | S    | low  |
| 3.4 | Type tightening + dataset slimming: `rotation`/`bountyTier` as unions; replace `frameId!` (`+page.svelte:90`, `+page.server.ts:23`) with the `regionFrames.ts:35` type-predicate idiom; drop never-read `Resource.image`/`Warframe.image` from the dataset; resolve the `openWorldFarms ?? []` type contradiction                                                                                                                                             | `types.ts`, `scripts/data/build.ts`/`assemble.ts`, call sites; regenerate dataset | svelte-check green; dataset bytes shrink; no `!` on frameId                                                     | M    | low  |
| 3.5 | Security/runtime polish: baseline headers via `kit.csp` or `static/_headers` (`nosniff`, `frame-ancestors`, `Referrer-Policy`, CSP); pause worldstate polling on `document.hidden` (+ resume refresh on visible); fix the `sw/update.ts` first-2-min no-op                                                                                                                                                                                                    | config, `worldstate.svelte.ts:33-39`, `sw/update.ts:6-7,34-38`                    | Headers on prod responses; no fetches while hidden (fake-timer test); update check works immediately after load | S–M  | low  |
| 3.6 | Housekeeping: move `seed.ts` to a fixtures path; un-export test-only helpers (`parseProfile` internals, `isRegionRevealed`); exhaustiveness in `handlePick` (`+page.svelte:128-133`); dedupe `'venus'` default (`:44,117`), cycle-glyph maps, checkbox-row widget (QuestsPanel via PartRow snippet), Enter/Space handler as an action, `guideResources(ds)` selector for the guides-list projection                                                           | various                                                                           | Grep-verifiable; zero behavior change; all tests green                                                          | M    | low  |

## Quick wins (all S — can be done immediately, in any order)

1. **0.1** Playwright hardening — three lines; turns opaque CI failures into debuggable ones.
2. **1.3** Zariman slug fix — a shipped data bug; one-line data edit + one test + regenerated dataset.
3. **1.5** Proxy cast/timeout/log — removes the repo's worst type lie and its blindest failure path in ~20 lines.
4. **1.6** Persistence `.catch` — four call sites.
5. **3.1 (LICENSE half only)** — add AGPLv3 now; the repo is public today with all-rights-reserved ambiguity.

## Suggested execution order

M0 (0.1→0.4 in one PR) → quick wins 1.3/1.5/1.6 (one small PR) → 1.1 → 1.2 → 1.4 →
2.1 → 2.6 → 2.5 → 2.2 (before starting the Endo guide) → 2.3 → 2.4 → M3 as time allows.

---

## Implementation sketches — top 3

### 1.1 Refresh-data: weekly + PR flow

**Approach.** Change the cron to `17 6 * * 1` (weekly, Monday). Replace the
commit-push step with PR creation on a fixed branch (`bot/data-refresh`,
force-updated each run so runs never stack), via `peter-evans/create-pull-request`
or `gh pr create`. Enable auto-merge on the PR so it lands once `ci.yml` goes green.

**Key steps.**

1. Token choice is the crux: the default `GITHUB_TOKEN`'s pushes/PRs do **not**
   trigger other workflows — which is the exact hole being fixed. Use a fine-grained
   PAT (contents + pull-requests write) stored as a repo secret, or a GitHub App
   token. With that token, `ci.yml` runs on the bot PR normally.
2. Add `concurrency: { group: refresh-data, cancel-in-progress: false }` and
   `timeout-minutes: 15`.
3. Add an `if: failure()` step that opens/updates a pinned "data refresh failed"
   issue (e.g. `gh issue create`/`gh issue comment` with a stable label).
4. Keep the existing guard order: `data:build` (validation floors) → `test:unit`
   → PR. Stage only `static/data/dataset.json` + `pnpm-lock.yaml` as today.

**Pitfalls.** Do 0.3 first, or the first genuine drop-rate change turns the refresh
PR red for the wrong reason (which is technically the system working, but noisy).
Auto-merge requires it to be enabled in repo settings and branch protection that
requires the CI checks. A lingering unmerged refresh PR should be force-updated,
not duplicated — fixed branch name handles this.

### 1.2 Dataset load error state

**Approach.** Make `loadDataset` throw descriptively; make the page render a
recoverable error state.

**Key steps.**

1. `dataset.ts`: `if (!res.ok) throw new Error(\`dataset fetch failed: ${res.status}\`)`;
after parsing, sanity-check `payload?.data?.regions` is a non-empty array before
   returning (throw otherwise). No new deps.
2. `+page.svelte`: extract the `onMount` body into `async function boot()`; add
   `let loadError = $state<string | null>(null)`; wrap `boot()` in try/catch
   (`console.error(e)` + set a user-safe message). Render an error block with a
   Retry button (calls `boot()` again) alongside the existing
   "Loading Star Chart…" branch (`:258`).
3. Tests (MSW one-liners): 404 handler, network error handler, `{}` body — each
   asserts the error UI appears and Retry refetches.

**Pitfalls.** The SW serves the dataset stale-while-revalidate — a cached good
dataset with a failing network is _success_, not error; only surface the error when
no data arrived. Don't put the raw error text in the UI (keep it in `console.error`).
The server-side callers (`+page.server.ts`, `sitemap.xml`, `llms.txt`) will now fail
prerender loudly on a bad dataset — that is desirable; no change needed there.

### 2.1 Server load for `guides/[resource]`

**Approach.** Split the current universal load: dataset resolution moves to a server
load (no replay blob); the mdsvex guide component — which cannot cross the
server→client serialization boundary — resolves in a thin universal load.

**Key steps.**

1. Create `+page.server.ts` with `PageServerLoad`: `loadDataset(fetch)`, find the
   resource, `error(404)` if missing, return `{ resource }` **only** (never the whole
   dataset). Move `entries()` here unchanged (it already dynamic-imports the JSON).
2. Slim `+page.ts` to a `PageLoad` that receives `data` from the server load and
   resolves only the `import.meta.glob('/src/content/guides/*.svx')` component:
   `return { ...data, guide }`. Component modules do not create replay blobs.
3. Verify: `pnpm build && wc -c .svelte-kit/cloudflare/guides/*.html` — every page
   drops from ~217 KB to ~25 KB; `grep -c data-sveltekit-fetched` on each = 0.
4. Run the guides e2e (`e2e/guides.test.ts` has prerender 200-checks) and
   `page.svelte.test.ts` for the route (fixtures may reference the old load shape).

**Pitfalls.** Keep `prerender = true` on the server load file. Don't re-import the
dataset statically anywhere in `+page.ts`/`+page.svelte` — that re-creates the
client-chunk duplication the original comment (`+page.ts:35-38`) avoided. The
`credits`/`affinity` exclusion logic in `entries()` must move verbatim. After 2.2
lands, revisit whether `[resource]` and the bespoke pages can share the same route.

---

## Resolved / dropped items

- **Open Question 6 (worker-configuration.d.ts):** resolved — file was never
  git-tracked; `.gitignore` already covers it. No task.
- **Daily vs weekly refresh:** resolved — weekly (decision #2).
- **License:** resolved — AGPLv3 (decision #1; rationale: the product is a hosted
  web service, and plain GPLv3's copyleft does not trigger on network use — a third
  party could host a modified fork without publishing changes; AGPL §13 closes that.
  LGPL is designed for linkable libraries and buys nothing here. Trade-off accepted:
  AGPL deters some casual contributors — acceptable for a solo-focused project).
