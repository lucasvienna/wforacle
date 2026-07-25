# 01 — Repository Map

_As of commit `683f627`, 2026-07-25. 298 commits, ~12,845 lines of TS/Svelte
(excluding node_modules/build), ~20 MB with static assets._

## Purpose & maturity

**wforacle** — a Warframe Star Chart farming tracker: track owned Warframe
parts/quests, see where parts drop, resource farming guides, live world-state
(day/night cycles, bounty rotations). Live at **https://wforacle.avyiel.dev**.
Maturity: **small production service**, solo-maintained, SEO-invested, deployed
continuously from `main` via Cloudflare Workers Builds.

## Tech stack

- SvelteKit 2 + Svelte 5, **runes mode forced project-wide** (`vite.config.ts:16-18`)
- **No `svelte.config.js`** — Kit config (preprocess, mdsvex, adapter) lives inline in
  `vite.config.ts` via the newer `sveltekit()` plugin options API
- Tailwind 4, TypeScript strict, mdsvex for guide prose (`.svx`)
- Deploy target: Cloudflare Workers (`@sveltejs/adapter-cloudflare`, `wrangler.jsonc`)
- Fully prerendered (`src/routes/+layout.ts:1`) except `/api/worldstate`
- **Zero production npm dependencies except `idb`** (everything else is dev, bundled at
  build time)
- Tooling: oxlint + oxfmt (+ prettier for `.svelte` only), Vitest + Testing Library +
  MSW + fake-indexeddb, Playwright (desktop Chromium only)
- Node ≥ 24, pnpm 11

## Architecture sketch

```
build time:  @wfcd/items + warframe-worldstate-data + curated data (scripts/data/*)
                └─ scripts/build-data.ts → validates → static/data/dataset.json
                   (158,214 bytes, tab-indented, COMMITTED — pnpm build does NOT rebuild it)
runtime:     browser fetches dataset.json → createTracker / createWorldStateStore /
             createImportStore (factories instantiated in +page.svelte onMount;
             state shared by explicit prop drilling, no context, no singletons)
             persistence: IndexedDB via idb · offline: hand-rolled service worker
             (stale-while-revalidate dataset / network-first API / cache-first shell)
server:      ONE dynamic route — /api/worldstate proxies api.warframestat.us
             (4 endpoints, 60s edge cache via caches.default)
ops:         ci.yml (6 gated jobs on PR + main) · refresh-data.yml (daily cron,
             commits dataset to main — see finding T1) · Workers Builds auto-deploy
```

## Key directories

| Path                              | Description                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/model/`                  | Pure domain types + completion/reveal logic; dependency-free core                                                                                                           |
| `src/lib/tracker/`                | Tracker factory (SvelteSet + `$effect.root` persistence) + IndexedDB layer (`persistence.ts`)                                                                               |
| `src/lib/panel/`                  | Region detail UI — RegionPanel, FrameCard, PartRow, AspectGroup, QuestsPanel, ResourceRail, SettingsDrawer                                                                  |
| `src/lib/worldstate/`             | Live-cycle store, availability math, ticker component; `types.ts` shared with the API route                                                                                 |
| `src/lib/import/`                 | Account-ID profile import: validation, fetch client, parser, dialog, store                                                                                                  |
| `src/lib/palette/`                | ⌘K command palette + search scoring                                                                                                                                         |
| `src/lib/starchart/`              | SVG chart geometry (pure) + StarChart component                                                                                                                             |
| `src/lib/seo/`                    | SeoHead, meta/jsonld builders, site config (`PUBLIC_SITE_URL`)                                                                                                              |
| `src/lib/sw/`                     | SW update detection + UpdateToast                                                                                                                                           |
| `src/lib/data/`                   | `dataset.ts` (the single loader) + `seed.ts` (133-line test fixture living in prod path)                                                                                    |
| `src/routes/`                     | `+page.svelte` (335-line composition root), `/guides` (hub + bespoke credits/affinity + `[resource]` template), `/api/worldstate`, `sitemap.xml`, `llms.txt`                |
| `src/content/guides/*.svx`        | 27 mdsvex long-form guide bodies                                                                                                                                            |
| `scripts/data/`                   | Data pipeline: pure `build.ts`/`assemble.ts`/`parse.ts` + curated data-as-code (`farming.ts` 846 lines, `curated.ts`, `openworld.ts`, `special.ts`) + JSON fixtures + tests |
| `scripts/`                        | `build-data.ts` entrypoint, `gen-og.mjs`, two manual `fetch-*.sh` asset scripts                                                                                             |
| `static/`                         | `data/dataset.json` (the shipping artifact), frames/resources/planets WebP                                                                                                  |
| `docs/superpowers/{plans,specs}/` | 15+ dated implementation plans/specs — the real historical documentation                                                                                                    |
| `.github/workflows/`              | `ci.yml` (strong), `refresh-data.yml` (the weak link — finding T1)                                                                                                          |
| `e2e/`                            | 7 Playwright specs                                                                                                                                                          |

## Entry points & data flow

- **Client entry:** `src/routes/+page.svelte` `onMount` (`:57-76`) — loads dataset,
  builds tracker with persistence callbacks, hydrates from IndexedDB, starts
  worldstate polling, inits import store. This page **is** the DI container.
- **Server entry:** `src/routes/api/worldstate/+server.ts` — the only runtime handler.
- **Build entry:** `scripts/build-data.ts` (`pnpm data:build`) — run by the cron
  workflow and by hand; **not** part of `pnpm build`.

## Conventions in force (align with these; they are deliberate)

1. Factory functions returning getter-objects for reactive stores; **no module-level
   reactive state anywhere in `src/lib`** (SSR-safety is fully achieved).
2. DI via constructor/function args (`createTracker(frames, persist?, persistQuests?)`).
3. Pure-function modules with direct unit tests (`geometry.ts`, `availability.ts`,
   `search.ts`, entire `scripts/data/` core).
4. `data-*` attributes as the shared unit/e2e selector contract.
5. "Shape-named" regression fixtures ("Jupiter-shaped", "Gyre-shaped") whose comments
   link bug → fix → test.
6. Why-comments recording engineering decisions (replay-blob avoidance, `no-store`
   rationale, SW `waitUntil` semantics). Do not strip these.
7. Trunk-based flow; PRs to `main`; `pnpm format` + `pnpm lint` before every PR.

## Surprises found

- `README.md` is the untouched `sv` scaffold — no product description for a live site.
- Public repo, **no LICENSE**, empty GitHub description (→ tasks 3.1; decision: AGPLv3).
- The committed `.env` is _fine_: documented public-only build config
  (`PUBLIC_SITE_URL`), with the `.gitignore` carve-out explained inline.
- `pnpm build` does not run the data build; the committed `dataset.json` is the
  shipping artifact. Intentional and defensible, but documented nowhere a newcomer
  would look (→ task 3.1).
- `worker-configuration.d.ts` exists on disk but is NOT git-tracked (generated by
  `wrangler types`; `.gitignore` covers it). An earlier draft of this audit
  claimed otherwise — verified false.
