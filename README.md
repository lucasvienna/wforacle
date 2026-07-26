# wforacle

A Warframe Star Chart tracker and farming guide. Mark which Warframe parts you
own, see where every part drops, find the best early- and late-game farm for a
resource, and check live world state (Cetus/Vallis/Cambion cycles and the
global bounty rotation).

**Live at [wforacle.avyiel.dev](https://wforacle.avyiel.dev)** — no account, no
sign-up. Progress is stored in your own browser (IndexedDB); optionally seed it
from a public Warframe account ID.

## Stack

SvelteKit 2 + Svelte 5 (runes), Tailwind 4, TypeScript strict, deployed to
Cloudflare Workers. Fully prerendered except one API route. Node ≥ 24, pnpm 11.

Exactly **one production dependency** (`idb`); everything else is a
devDependency bundled at build time.

There is no `svelte.config.js` — Kit config (preprocess, mdsvex, adapter) lives
inline in `vite.config.ts` via the `sveltekit()` plugin options.

## How it fits together

```
build time   @wfcd/items + warframe-worldstate-data + curated data (scripts/data/)
                  └─ pnpm data:build ─→ validates ─→ static/data/dataset.json
                                                     (158 KB, COMMITTED)

runtime      browser fetches dataset.json
                  └─ createTracker / createWorldStateStore / createImportStore
                     instantiated in +page.svelte's onMount — that page is the
                     DI container; state is passed by explicit prop drilling,
                     no context and no singletons
                  persistence: IndexedDB · offline: hand-rolled service worker

server       ONE dynamic route — /api/worldstate proxies api.warframestat.us
             (4 endpoints, 60s edge cache)
```

### The dataset is a committed artifact

**`pnpm build` does not rebuild the dataset.** `static/data/dataset.json` is
checked in and is what ships. Only `pnpm data:build` regenerates it, and you
must commit the result.

This is deliberate — it keeps deploys reproducible and independent of upstream
availability — but it means a change to anything in `scripts/data/` has no
effect until you run `pnpm data:build` and commit the output.

`pnpm data:build` fails if the assembled dataset is internally inconsistent, if
a curated `nodeLabel` no longer resolves to a real star-chart node, or if entity
counts fall below calibrated floors. It warns (without failing) when a
recommendation has not been re-verified in six months.

Current contents: 19 regions, 388 nodes, 32 node-linked Warframes, 30 resources
— 29 with a farming guide — plus 27 long-form guide bodies in
`src/content/guides/*.svx`.

## Getting started

```sh
pnpm install
pnpm dev            # http://localhost:5173
```

SvelteKit registers the service worker in dev too. If you see a stale shell
after a change, unregister it and clear caches in DevTools.

## Scripts

|                             |                                                     |
| --------------------------- | --------------------------------------------------- |
| `pnpm dev`                  | dev server                                          |
| `pnpm build`                | production build (does **not** rebuild the dataset) |
| `pnpm preview`              | serve the built Worker on :4173                     |
| `pnpm data:build`           | regenerate + validate `static/data/dataset.json`    |
| `pnpm test:unit`            | Vitest (watch); `--run` for a single pass           |
| `pnpm test:coverage`        | Vitest with a coverage summary                      |
| `pnpm test:e2e`             | Playwright (needs a build; serves the built Worker) |
| `pnpm check`                | `svelte-check`                                      |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt + prettier for `.svelte`             |
| `pnpm check:size`           | size budget on the prerendered HTML                 |

Current suite: 439 unit tests across 59 files, 21 Playwright specs.

## Testing notes

- e2e mocks `/api/worldstate` through a shared fixture (`e2e/fixtures.ts`) and
  blocks the live Warframe API, so runs are deterministic and make no outbound
  calls. The mock uses `context.route`, not `page.route` — the latter does not
  intercept requests the service worker issues.
- Assertions that would otherwise hard-code drop rates or node labels read them
  from `dataset.json` at test time, so a routine data refresh does not redden
  the suite for the wrong reason.
- `data-*` attributes are the shared unit/e2e selector contract.

## Deployment

Pushing to `main` deploys to Cloudflare Workers via Workers Builds. `ci.yml`
gates every pull request and push to `main` on lint, format, `svelte-check`,
unit tests, build (including the page-size budget) and e2e.

`refresh-data.yml` runs daily at 06:17 UTC: it bumps the two upstream data
packages, regenerates the dataset, runs unit tests, and commits the result
straight to `main` if anything changed.

> [!WARNING]
> That cron pushes to `main` without going through `ci.yml` — a bot push using
> the default `GITHUB_TOKEN` does not trigger other workflows. Moving it to a
> weekly auto-created PR is planned and needs a fine-grained PAT; see task 1.1
> in [`docs/revamp/04-task-plan.md`](docs/revamp/04-task-plan.md).

## Repository layout

| Path                  |                                                 |
| --------------------- | ----------------------------------------------- |
| `src/lib/model/`      | pure domain types + completion/reveal logic     |
| `src/lib/tracker/`    | tracker factory + IndexedDB persistence         |
| `src/lib/panel/`      | region detail UI                                |
| `src/lib/guides/`     | long-form guide shell + phase vocabulary        |
| `src/lib/worldstate/` | live-cycle store, availability maths, ticker    |
| `src/lib/import/`     | account-ID profile import                       |
| `src/lib/starchart/`  | SVG chart geometry (pure) + component           |
| `src/lib/ui/`         | shared Drawer + focus-restore                   |
| `scripts/data/`       | data pipeline: pure core + curated data-as-code |
| `docs/revamp/`        | 2026 audit, strategy and task plan              |

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). This is a
solo-maintained hobby project, so response times vary.

## Licence

Code is [AGPL-3.0-only](LICENSE). If you run a modified version as a network
service, AGPL §13 requires you to offer its source to the users of that service.

Warframe names, imagery and game data are the property of Digital Extremes and
are used under their fan-content policy; wiki-derived data keeps its own
attribution. See [NOTICE](NOTICE).
