# Replace fetch mocking with MSW — Design

**Date:** 2026-07-13
**Status:** Approved

## Goal

Replace ad-hoc `fetch` mocking (`vi.stubGlobal('fetch', …)`, `vi.fn` mock functions,
and the `fetchProfile` dependency injection used only for tests) with
[Mock Service Worker](https://mswjs.io/). One shared `msw/node` server intercepts
every network boundary the test suite exercises, and tests declare per-case
behaviour with `server.use()` overrides.

## Scope

The suite runs as a single `jsdom` vitest project (`vite.config.ts`) with one
setup file (`vitest-setup.ts`) over node's global `fetch` (undici). A single
`setupServer` from `msw/node` therefore intercepts all of the following:

| Boundary             | URL                                                    | Test file                                                                                 |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Profile API          | `https://api.warframestat.us/profile/:id`              | `src/lib/import/profileClient.test.ts`                                                    |
| Worldstate upstream  | `https://api.warframestat.us/pc/:endpoint?language=en` | `src/routes/api/worldstate/server.test.ts`                                                |
| Internal poll        | `/api/worldstate` (relative, `base === ''`)            | `src/lib/worldstate/worldstate.svelte.test.ts`                                            |
| Profile via store DI | `.../profile/:id` (through `createImportStore`)        | `src/lib/import/importState.svelte.test.ts`, `src/lib/import/ImportDialog.svelte.test.ts` |

The `importState` and `ImportDialog` tests currently inject a fake
`fetchProfile`. They drop that injection and fall through the store's default
`realFetch`, which then hits MSW. The store keeps its DI _capability_
(`deps.fetchProfile`) — production code is unchanged; only the tests stop
injecting a fake.

Out of scope: tests that use `vi.fn`/`vi.mock` for non-network purposes
(`SettingsDrawer`, `StarChart`, `CommandPalette`, `page.svelte`, `RegionPanel`,
`WorldStateTicker`, `parse.test`, `dataset.test`) are untouched.

## Architecture

### New files

- **`src/mocks/handlers.ts`** — default `http.get` handlers returning
  representative fixtures for `.../profile/:id`, `.../pc/:endpoint`, and
  `*/api/worldstate`. Defaults exist so no test errors on an unhandled request;
  most tests override with `server.use()`.
- **`src/mocks/server.ts`** — `export const server = setupServer(...handlers)`.

### Changed files

- **`vitest-setup.ts`** — add lifecycle:
  ```ts
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  ```
- **`package.json`** — add `msw` as a dev dependency.

### Assertion strategy

Assertions that today read a `vi.fn`'s call record move to MSW equivalents:

- _"fetch called with URL/headers"_ → assert on the intercepted `request`
  inside the handler (`request.url`, `request.headers.get('accept')`), or via
  `server.events.on('request:start', …)`. This asserts what the server
  **received**, which is stronger than asserting call arguments.
- _"fetch not called"_ / _"no further fetches after dispose"_ → count requests
  with `server.events.on('request:start', listener)` and assert the count.

## Per-file conversion

### `profileClient.test.ts`

- success / notFound(404) / rateLimited(403) / empty-body(200 `{}`) →
  `server.use(http.get('https://api.warframestat.us/profile/:id', …))` returning
  `HttpResponse.json(...)` or `new HttpResponse(null, { status })`.
- network rejection → `HttpResponse.error()`.
- URL-encoding + `accept` header → capture `request` in the handler and assert
  `request.url === 'https://api.warframestat.us/profile/517d823a1a4d804218000052'`
  and `request.headers.get('accept') === 'application/json'`.

### `server.test.ts` (`GET /api/worldstate`)

- success → one `http.get('https://api.warframestat.us/pc/:endpoint', …)` keyed
  on `params.endpoint`, returning the matching fixture.
- upstream failure → handler returns `HttpResponse.error()` (or 500) for the
  endpoints so `r.ok` is false and the route yields `{ ok: false }` with
  `cache-control: no-store`.

### `worldstate.svelte.test.ts`

- populates state → `http.get('*/api/worldstate', () => HttpResponse.json(OK))`.
- **cache test** (`'bypasses the browser HTTP cache…'`) → handler captures
  `request.cache` and asserts `'no-store'`. **Fallback:** if undici does not
  preserve `request.cache`, this single test reverts to `vi.stubGlobal` and the
  other four tests still move to MSW.
- `{ ok: false }` keeps last state → one-time override (`{ once: true }`)
  returning `HttpResponse.json({ ok: false })` before `store.refresh()`.
- network rejection → `HttpResponse.error()`.
- dispose stops poll → count `request:start` events; assert none fire after
  `dispose()` + advancing timers.

### `importState.svelte.test.ts` & `ImportDialog.svelte.test.ts`

- Drop `{ fetchProfile: … }` injection; rely on the store default.
- preview/apply cases → `server.use()` returns the test's `PROFILE`.
- "rejects a malformed id without fetching" → assert `request:start` fired zero
  times (the id is rejected before any fetch).

## Risks & fallbacks

1. **`request.cache` fidelity.** undici may report `'default'` regardless of the
   `cache: 'no-store'` init. Mitigation: revert only the single cache-assertion
   worldstate test to `vi.stubGlobal` (pre-approved).
2. **MSW + `vi.useFakeTimers()`.** worldstate tests use fake timers;
   `advanceTimersByTimeAsync(0)` must flush the microtasks that resolve an MSW
   response. This is the fiddliest interaction and is verified **first**. If it
   cannot be made to resolve cleanly, worldstate stays on manual mocking and
   only profileClient / server / import tests move — flagged rather than forced.

## Success criteria

- `pnpm test:unit --run` passes with the same behavioural coverage as before.
- No `vi.stubGlobal('fetch', …)` remains, except (at most) the single worldstate
  cache-assertion test if risk 1 or 2 forces a revert.
- Production source (`worldstate.svelte.ts`, `profileClient.ts`, `+server.ts`,
  `importState.svelte.ts`) is unchanged.
