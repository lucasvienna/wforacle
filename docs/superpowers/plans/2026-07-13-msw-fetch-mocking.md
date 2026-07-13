# Replace fetch mocking with MSW — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all ad-hoc `fetch` mocking (`vi.stubGlobal('fetch', …)`, `vi.fn` mocks, and the test-only `fetchProfile` DI) with a single shared Mock Service Worker (`msw/node`) server, using `server.use()` per-test overrides.

**Architecture:** One `setupServer` from `msw/node`, wired into the existing `vitest-setup.ts`, intercepts undici's global `fetch` for every test in the single `jsdom` vitest project. Default handlers live in `src/mocks/`; individual tests override them. Call-count / "not called" assertions move from `vi.fn` records to `server.events.on('request:start', …)`.

**Tech Stack:** vitest 4, `msw` 2.15, SvelteKit, jsdom, Node 26 (undici global `fetch`).

## Global Constraints

- Package manager is **pnpm**. Install dev deps with `pnpm add -D <pkg>`.
- Production source is **unchanged**: `src/lib/worldstate/worldstate.svelte.ts`, `src/lib/import/profileClient.ts`, `src/routes/api/worldstate/+server.ts`, `src/lib/import/importState.svelte.ts` must not be edited.
- MSW v2 API only: import `http`, `HttpResponse` from `msw`; `setupServer` from `msw/node`.
- Undici rejects relative URLs — any test whose code path fetches a relative URL must supply an **absolute** origin. `worldstate.svelte.ts` calls `resolve('/api/worldstate')`, so its test mocks `$app/paths` `resolve` to return an absolute URL.
- After the migration, the only permitted `vi.stubGlobal('fetch', …)` is the single worldstate cache-assertion test, and only if its MSW port fails verification (see Task 2 fallback).
- Run the unit suite with `pnpm test:unit --run`. Do not run `pnpm test` (that also runs Playwright e2e).

---

## File Structure

- `src/mocks/handlers.ts` — default `http` handlers (fallbacks so no request is unhandled).
- `src/mocks/server.ts` — `export const server = setupServer(...handlers)`.
- `vitest-setup.ts` — MSW lifecycle (`listen`/`resetHandlers`/`removeAllListeners`/`close`).
- `src/lib/worldstate/worldstate.svelte.test.ts` — rewritten (absolute-origin `resolve` mock, MSW, request-count spy).
- `src/lib/import/profileClient.test.ts` — rewritten (MSW status/error overrides, request assertions).
- `src/routes/api/worldstate/server.test.ts` — rewritten (MSW keyed on `params.endpoint`).
- `src/lib/import/importState.svelte.test.ts` — rewritten (drop DI, MSW, `request:start` spy).
- `src/lib/import/ImportDialog.svelte.test.ts` — rewritten (drop DI, MSW).

---

## Task 1: MSW infrastructure

Add `msw`, scaffold the shared server, wire it into the vitest setup. Deliverable: infra in place; the existing suite still passes untouched (existing tests still `vi.stubGlobal`, which shadows the MSW-patched fetch, so nothing breaks yet).

**Files:**

- Modify: `package.json` (add `msw` dev dep)
- Create: `src/mocks/handlers.ts`
- Create: `src/mocks/server.ts`
- Modify: `vitest-setup.ts`

**Interfaces:**

- Produces: `server` (a `SetupServerApi`) from `src/mocks/server.ts`; `handlers` array from `src/mocks/handlers.ts`. Tests import `{ server }` and call `server.use(http.get(...))`, `server.events.on('request:start', fn)`.

- [ ] **Step 1: Install msw**

```bash
pnpm add -D msw
```

- [ ] **Step 2: Create default handlers**

Create `src/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw';

// Default handlers so no request is left unhandled (setupServer runs with
// onUnhandledRequest: 'error'). Individual tests override these with
// `server.use(...)` for the specific status / payload they need.
export const handlers = [
	http.get('https://api.warframestat.us/profile/:id', () =>
		HttpResponse.json({ loadout: { xpInfo: [] } }),
	),
	http.get('https://api.warframestat.us/pc/:endpoint', () => HttpResponse.json({})),
	http.get('*/api/worldstate', () => HttpResponse.json({ ok: false })),
];
```

- [ ] **Step 3: Create the server**

Create `src/mocks/server.ts`:

```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Step 4: Wire lifecycle into vitest-setup.ts**

Add to the top imports and bottom of `vitest-setup.ts` (keep the existing SVGElement polyfill):

```ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
	server.resetHandlers();
	server.events.removeAllListeners();
});
afterAll(() => server.close());
```

- [ ] **Step 5: Run the full unit suite — everything still green**

Run: `pnpm test:unit --run`
Expected: PASS, same counts as before (existing tests still use `vi.stubGlobal`, which overrides fetch and never reaches MSW; the new default handlers are inert until a test opts in).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/mocks/handlers.ts src/mocks/server.ts vitest-setup.ts
git commit -m "test(msw): add shared msw/node server and lifecycle"
```

---

## Task 2: worldstate.svelte.test.ts (risk spike)

This is the riskiest file — it combines fake timers, the relative poll URL (needs an absolute origin from the `resolve` mock), and the `cache: 'no-store'` assertion. Do it second so both risks surface before the easy files. Convert in this order: populate (proves fetch resolves under fake timers) → cache (proves `request.cache`) → the rest.

**Files:**

- Rewrite: `src/lib/worldstate/worldstate.svelte.test.ts`

**Interfaces:**

- Consumes: `server` from `src/mocks/server.ts`; `http`, `HttpResponse` from `msw`.
- Note: the poll URL is `resolve('/api/worldstate')`. Mocking `$app/paths` `resolve` to prefix `http://localhost:3000` makes the URL absolute so undici accepts it; the handler matches `*/api/worldstate`.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/lib/worldstate/worldstate.svelte.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

vi.mock('$app/environment', () => ({ browser: true }));
// resolve('/api/worldstate') must yield an absolute URL for undici; production
// resolve prefixes base ('') and resolves against the origin, but node fetch has
// no origin, so the mock prefixes a concrete one.
vi.mock('$app/paths', () => ({
	resolve: (path: string) => `http://localhost:3000${path}`,
}));

import { createWorldStateStore } from './worldstate.svelte';
import type { WorldState } from './types';

const OK: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'day', expiry: 'c' },
	vallis: { state: 'cold', expiry: 'v' },
	cambion: { state: 'fass', expiry: 'm' },
	rotation: { letter: 'C', expiry: 'e' },
};

const okHandler = () => http.get('*/api/worldstate', () => HttpResponse.json(OK));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createWorldStateStore', () => {
	it('populates state from the first fetch', async () => {
		server.use(okHandler());
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.state).toEqual(OK);
		expect(store.error).toBe(false);
		store.dispose();
	});

	it('bypasses the browser HTTP cache so a long-open tab never polls stale data', async () => {
		let seenCache: string | undefined;
		server.use(
			http.get('*/api/worldstate', ({ request }) => {
				seenCache = request.cache;
				return HttpResponse.json(OK);
			}),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(seenCache).toBe('no-store');
		store.dispose();
	});

	it('sets error and keeps last state when the payload is { ok: false }', async () => {
		server.use(okHandler());
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		// A later matching handler takes precedence in MSW.
		server.use(http.get('*/api/worldstate', () => HttpResponse.json({ ok: false })));
		await store.refresh();
		expect(store.error).toBe(true);
		expect(store.state).toEqual(OK); // last good kept
		store.dispose();
	});

	it('sets error on network rejection', async () => {
		server.use(http.get('*/api/worldstate', () => HttpResponse.error()));
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.error).toBe(true);
		store.dispose();
	});

	it('dispose stops the poll timer (no further fetches)', async () => {
		server.use(okHandler());
		let requests = 0;
		server.events.on('request:start', () => {
			requests += 1;
		});
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		store.dispose();
		const afterDispose = requests;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(requests).toBe(afterDispose);
	});
});
```

- [ ] **Step 2: Run the file**

Run: `pnpm test:unit --run src/lib/worldstate/worldstate.svelte.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: If it fails, apply fallbacks in order (max 3 attempts total)**

Diagnose which assumption broke:

- **`store.state` is null / test times out** → the fetch promise isn't resolving under fake timers. Attempt: change `beforeEach` to fake only the store's own timers, leaving MSW's internals on real timers:
  ```ts
  beforeEach(() =>
  	vi.useFakeTimers({
  		toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
  	}),
  );
  ```
  Keep the `await vi.advanceTimersByTimeAsync(0)` flushes.
- **`seenCache` is `'default'` or `undefined`** (only the cache test fails) → revert **only** that one test to manual mocking. Re-add `import { afterEach } from 'vitest'` cleanup and replace the cache test body with:
  ```ts
  it('bypasses the browser HTTP cache so a long-open tab never polls stale data', async () => {
  	const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
  	vi.stubGlobal('fetch', fetchMock);
  	const store = createWorldStateStore();
  	await vi.advanceTimersByTimeAsync(0);
  	expect(fetchMock).toHaveBeenCalledWith(
  		expect.any(String),
  		expect.objectContaining({ cache: 'no-store' }),
  	);
  	store.dispose();
  	vi.unstubAllGlobals();
  });
  ```
  Leave the other four tests on MSW.
- **The whole file cannot pass through MSW after 3 attempts** → restore the original file (`git checkout src/lib/worldstate/worldstate.svelte.test.ts`), note the realized risk in the spec's Risks section, and continue with Tasks 3–5 (the external-API and import tests are unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/lib/worldstate/worldstate.svelte.test.ts docs/superpowers/specs/2026-07-13-msw-fetch-mocking-design.md
git commit -m "test(worldstate): mock the poll with msw"
```

---

## Task 3: profileClient.test.ts

Straightforward external API, no fake timers. Assertions about the outgoing request move from `vi.fn` call args to the intercepted `request`.

**Files:**

- Rewrite: `src/lib/import/profileClient.test.ts`

**Interfaces:**

- Consumes: `server` from `src/mocks/server.ts`; `http`, `HttpResponse` from `msw`; `fetchProfile`, `ProfileError` from `./profileClient`.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/lib/import/profileClient.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { fetchProfile, ProfileError } from './profileClient';

const PROFILE_URL = 'https://api.warframestat.us/profile/:id';

describe('fetchProfile', () => {
	const ID = '517d823a1a4d804218000052';

	it('returns parsed json on success', async () => {
		const body = { loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] } };
		server.use(http.get(PROFILE_URL, () => HttpResponse.json(body)));
		await expect(fetchProfile(ID)).resolves.toEqual(body);
	});

	it('throws a notFound ProfileError on 404', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'notFound' });
	});

	it('throws a rateLimited ProfileError on 403', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 403 })));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'rateLimited' });
	});

	it('throws a network ProfileError when fetch rejects', async () => {
		server.use(http.get(PROFILE_URL, () => HttpResponse.error()));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws an empty ProfileError when the body has no usable data', async () => {
		server.use(http.get(PROFILE_URL, () => HttpResponse.json({})));
		await expect(fetchProfile(ID)).rejects.toBeInstanceOf(ProfileError);
	});

	it('requests the correctly encoded profile URL', async () => {
		let seen: Request | undefined;
		server.use(
			http.get(PROFILE_URL, ({ request }) => {
				seen = request;
				return HttpResponse.json({ loadout: { xpInfo: [{ uniqueName: '/x' }] } });
			}),
		);
		await fetchProfile(ID);
		expect(seen?.url).toBe('https://api.warframestat.us/profile/517d823a1a4d804218000052');
		expect(seen?.headers.get('accept')).toBe('application/json');
	});
});
```

- [ ] **Step 2: Run the file**

Run: `pnpm test:unit --run src/lib/import/profileClient.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Commit**

```bash
git add src/lib/import/profileClient.test.ts
git commit -m "test(import): mock profile fetch with msw"
```

---

## Task 4: server.test.ts (GET /api/worldstate route)

The route fans out to four `.../pc/:endpoint?language=en` requests. One handler keyed on `params.endpoint` serves all four.

**Files:**

- Rewrite: `src/routes/api/worldstate/server.test.ts`

**Interfaces:**

- Consumes: `server` from `src/mocks/server.ts`; `http`, `HttpResponse` from `msw`; `GET` from `./+server`.
- Note: MSW matches the path only; the route's `?language=en` query is ignored by the matcher. `params.endpoint` is one of `cetusCycle | vallisCycle | cambionCycle | syndicateMissions`.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/routes/api/worldstate/server.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { GET } from './+server';

const fixtures: Record<string, unknown> = {
	cetusCycle: { state: 'day', expiry: 'c' },
	vallisCycle: { state: 'cold', expiry: 'v' },
	cambionCycle: { state: 'fass', expiry: 'm' },
	syndicateMissions: [
		{
			syndicate: 'Ostrons',
			expiry: '2026-07-11T21:00:00.000Z',
			jobs: [{ rewardPool: ['Korumm Blueprint'] }],
		},
	],
};

const PC_URL = 'https://api.warframestat.us/pc/:endpoint';

describe('GET /api/worldstate', () => {
	it('returns the composed world state on success', async () => {
		server.use(
			http.get(PC_URL, ({ params }) => HttpResponse.json(fixtures[params.endpoint as string])),
		);
		const res = await GET({} as never);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.ok).toBe(true);
		expect(body.cetus).toEqual({ state: 'day', expiry: 'c' });
		expect(body.rotation).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
		expect(res.headers.get('cache-control')).toMatch(/s-maxage=60/);
	});

	it('returns { ok: false } and no-store on upstream failure', async () => {
		server.use(http.get(PC_URL, () => HttpResponse.error()));
		const res = await GET({} as never);
		expect(await res.json()).toEqual({ ok: false });
		expect(res.headers.get('cache-control')).toBe('no-store');
	});
});
```

- [ ] **Step 2: Run the file**

Run: `pnpm test:unit --run src/routes/api/worldstate/server.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/worldstate/server.test.ts
git commit -m "test(worldstate): mock upstream endpoints with msw"
```

---

## Task 5: import store & dialog (drop DI, route through MSW)

Both files inject a fake `fetchProfile` today. Drop the injection so `createImportStore` uses its default `realFetch`, which hits MSW. The "not fetched" assertion moves to a `request:start` counter. The "surfaces a ProfileError message" test now exercises the real `notFound` copy (the store can no longer be handed a custom-message error), so its expected string changes to the real message.

**Files:**

- Rewrite: `src/lib/import/importState.svelte.test.ts`
- Rewrite: `src/lib/import/ImportDialog.svelte.test.ts`

**Interfaces:**

- Consumes: `server` from `src/mocks/server.ts`; `http`, `HttpResponse` from `msw`; `createImportStore` from `./importState.svelte`.
- Note: `createImportStore(dataset)` (no second arg) uses the default `realFetch`. A valid account id triggers a real `fetch` to `.../profile/:id`; a malformed id is rejected before any fetch.

- [ ] **Step 1: Rewrite importState.svelte.test.ts**

Replace the entire contents of `src/lib/import/importState.svelte.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { createImportStore } from './importState.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';
import { createTracker } from '$lib/tracker/tracker.svelte';

const ID = '517d823a1a4d804218000052';
const PROFILE_URL = 'https://api.warframestat.us/profile/:id';

function frame(id: string, uniqueName: string): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: ['bp', 'chassis'].map((slot) => ({
			id: `${id}:${slot}`,
			frameId: id,
			slot: slot as never,
		})),
	};
}
const frames = [frame('rhino', '/Lotus/Powersuits/Rhino/Rhino')];
const dataset = { warframes: frames, quests: [{ id: 'thewarwithin' }] } as unknown as Dataset;

const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
	challengeProgress: [{ name: 'TheWarWithin' }],
};

function useProfile(profile: unknown) {
	server.use(http.get(PROFILE_URL, () => HttpResponse.json(profile)));
}

describe('createImportStore', () => {
	it('runs a fetch and produces a preview', async () => {
		useProfile(PROFILE);
		const store = createImportStore(dataset);
		await store.run(ID);
		expect(store.phase).toBe('preview');
		expect(store.result?.frameIds).toEqual(['rhino']);
		expect(store.result?.questIds).toEqual(['thewarwithin']);
	});

	it('rejects a malformed account id without fetching', async () => {
		let requests = 0;
		server.events.on('request:start', () => {
			requests += 1;
		});
		const store = createImportStore(dataset);
		await store.run('not-an-id');
		expect(store.phase).toBe('error');
		expect(requests).toBe(0);
	});

	it('surfaces a ProfileError message', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));
		const store = createImportStore(dataset);
		await store.run(ID);
		expect(store.phase).toBe('error');
		expect(store.error).toBe(
			'No profile found. Use your account ID from warframe.com/api/user-data, not your display name.',
		);
	});

	it('apply merges add-only into the tracker', async () => {
		useProfile(PROFILE);
		const tracker = createTracker(frames);
		tracker.togglePart('rhino:neuroptics'); // pre-existing manual check not in the profile
		const store = createImportStore(dataset);
		await store.run(ID);
		store.apply(tracker, ID, false);
		expect(tracker.isOwned('rhino:bp')).toBe(true); // from import
		expect(tracker.isOwned('rhino:chassis')).toBe(true); // from import
		expect(tracker.isOwned('rhino:neuroptics')).toBe(true); // preserved
		expect(tracker.isQuestDone('thewarwithin')).toBe(true);
		expect(store.phase).toBe('idle');
	});
});
```

- [ ] **Step 2: Run importState**

Run: `pnpm test:unit --run src/lib/import/importState.svelte.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Rewrite ImportDialog.svelte.test.ts**

Replace the entire contents of `src/lib/import/ImportDialog.svelte.test.ts` with:

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import ImportDialog from './ImportDialog.svelte';
import { createImportStore } from './importState.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

const PROFILE_URL = 'https://api.warframestat.us/profile/:id';

function frame(id: string, uniqueName: string): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: ['bp', 'chassis'].map((slot) => ({
			id: `${id}:${slot}`,
			frameId: id,
			slot: slot as never,
		})),
	};
}
const frames = [frame('rhino', '/Lotus/Powersuits/Rhino/Rhino')];
const dataset = { warframes: frames, quests: [] } as unknown as Dataset;
const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
};

function useProfile(profile: unknown) {
	server.use(http.get(PROFILE_URL, () => HttpResponse.json(profile)));
}

function setup() {
	const tracker = createTracker(frames);
	const store = createImportStore(dataset);
	render(ImportDialog, { store, tracker, open: true, onclose: vi.fn() });
	return { tracker };
}

describe('ImportDialog', () => {
	it('renders nothing when closed', () => {
		const store = createImportStore(dataset);
		render(ImportDialog, { store, tracker: createTracker(frames), open: false, onclose: vi.fn() });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('fetches, previews, and applies to the tracker', async () => {
		useProfile(PROFILE);
		const { tracker } = setup();
		await fireEvent.input(document.querySelector('[data-account-input]') as HTMLElement, {
			target: { value: '517d823a1a4d804218000052' },
		});
		await fireEvent.click(document.querySelector('[data-import-run]') as HTMLElement);
		await waitFor(() => expect(document.querySelector('[data-import-preview]')).toBeTruthy());
		await fireEvent.click(document.querySelector('[data-import-apply]') as HTMLElement);
		expect(tracker.isOwned('rhino:bp')).toBe(true);
	});

	it('shows an error for a malformed id', async () => {
		setup();
		await fireEvent.input(document.querySelector('[data-account-input]') as HTMLElement, {
			target: { value: 'nope' },
		});
		await fireEvent.click(document.querySelector('[data-import-run]') as HTMLElement);
		await waitFor(() => expect(document.querySelector('[data-import-error]')).toBeTruthy());
	});
});
```

- [ ] **Step 4: Run ImportDialog**

Run: `pnpm test:unit --run src/lib/import/ImportDialog.svelte.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/importState.svelte.test.ts src/lib/import/ImportDialog.svelte.test.ts
git commit -m "test(import): route store DI tests through msw"
```

---

## Task 6: Full-suite verification & cleanup

**Files:** none (verification only, plus a possible lint fix).

- [ ] **Step 1: Confirm no stray fetch stubs remain**

Run: `grep -rn "stubGlobal('fetch'" src`
Expected: no output — unless Task 2's fallback kept the single worldstate cache test on `vi.stubGlobal`, in which case exactly that one line is allowed.

- [ ] **Step 2: Run the whole unit suite**

Run: `pnpm test:unit --run`
Expected: PASS, with the same total behavioural coverage as before the migration.

- [ ] **Step 3: Lint / typecheck**

Run: `pnpm lint && pnpm check`
Expected: PASS. (If `pnpm check` is not defined, run `pnpm exec svelte-check --tsconfig ./tsconfig.json`.) Fix any unused-import or type errors introduced by the rewrites.

- [ ] **Step 4: Final commit (only if Step 3 required fixes)**

```bash
git add -A
git commit -m "test(msw): lint fixes after fetch-mock migration"
```

---

## Self-Review

- **Spec coverage:** every boundary in the spec's scope table maps to a task — profile API → Task 3; pc endpoints → Task 4; internal poll → Task 2; store DI → Task 5; infra (handlers/server/setup) → Task 1; both risks have explicit fallbacks in Task 2. ✔
- **Placeholder scan:** every code step contains complete file contents; no TBD/TODO/"similar to". ✔
- **Type consistency:** `server` (from `src/mocks/server.ts`), `http`/`HttpResponse` (from `msw`), and the handler URL patterns (`:id`, `:endpoint`) are used identically across Tasks 2–5; `createImportStore(dataset)` single-arg form matches the store's `deps = {}` default. ✔
- **Behavioural deltas noted:** (1) the "surfaces a ProfileError message" assertion changes to the real `notFound` copy because DI no longer supplies a custom message; (2) request-argument assertions become request-received assertions. Both are called out in Task 5 / spec. ✔
