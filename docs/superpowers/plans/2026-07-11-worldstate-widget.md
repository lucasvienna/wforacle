# World-State Widget + Live Bounty Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live world-state widget (Cetus day/night, Vallis warm/cold, Cambion fass/vome + the global bounty rotation letter, all with countdowns) fed by `api.warframestat.us` via an edge-cached Worker endpoint, and overlay live per-part bounty-rotation availability onto the open-world frame rows.

**Architecture:** A `prerender=false` SvelteKit endpoint `/api/worldstate` fetches four upstream endpoints, derives the current rotation letter from the Narmer weapon in the reward pools (Verdilac→A, Nepheri→B, Korumm→C), trims to a tiny payload, and edge-caches ~60s. A browser-only rune store polls it (60s) with one shared 1s countdown tick. A header ticker renders the cycles + rotation; `RegionPanel` renders a per-zone cycle line and a per-part availability chip computed from our curated `rotation` vs the live letter.

**Tech Stack:** SvelteKit (Svelte 5 runes) on Cloudflare Workers, TypeScript, Vitest + `@testing-library/svelte`, Tailwind, pnpm.

## Global Constraints

- Node 24 (`.node-version`); package manager **pnpm**. Unit tests: `pnpm test:unit --run <file>`. Type-check: `pnpm check`.
- **Before every commit run `pnpm format` then `pnpm lint`** — `format:check` (oxfmt + prettier) covers the whole tree and rejects unformatted commits; after `pnpm format` confirm `git status --porcelain` shows only the intended files.
- **Tabs** for indentation. Svelte 5 runes only; edit `.svelte`/`.svelte.ts` with the `svelte:svelte-file-editor` agent / Svelte MCP tools and run `svelte-autofixer` until clean.
- Conventional-commit messages.
- **Never hit the real network in tests** — mock `fetch`. Upstream base is `https://api.warframestat.us/pc`; platform is hardcoded `pc`.
- Spec: `docs/superpowers/specs/2026-07-11-worldstate-widget-design.md`.
- Rotation type is `'A' | 'B' | 'C'` (alias `Letter`); rotation period is **150 minutes**.

---

### Task 1: World-state types + pure availability logic

**Files:**

- Create: `src/lib/worldstate/types.ts`
- Create: `src/lib/worldstate/availability.ts`
- Test: `src/lib/worldstate/availability.test.ts`

**Interfaces:**

- Produces: `Letter = 'A'|'B'|'C'`; `CycleState { state: string; expiry: string }`; `RotationState { letter: Letter|null; expiry: string|null }`; `WorldState { ok, fetchedAt, cetus, vallis, cambion, rotation }`; `partAvailability(rotation, letter): PartAvailability`; `nextActiveAt(rotation, letter, expiry): Date|null`; `formatCountdown(ms): string`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/worldstate/availability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { partAvailability, nextActiveAt, formatCountdown } from './availability';

describe('partAvailability', () => {
	it('undefined rotation is always available (Exploiter Orb)', () => {
		expect(partAvailability(undefined, 'C')).toBe('always');
	});
	it('null letter is unknown (derivation failed)', () => {
		expect(partAvailability('C', null)).toBe('unknown');
	});
	it('"any" is available in every rotation', () => {
		expect(partAvailability('any', 'A')).toBe('available');
	});
	it('exact letter match is available, mismatch is unavailable', () => {
		expect(partAvailability('C', 'C')).toBe('available');
		expect(partAvailability('C', 'A')).toBe('unavailable');
	});
	it('"A/B" matches either A or B, not C', () => {
		expect(partAvailability('A/B', 'A')).toBe('available');
		expect(partAvailability('A/B', 'B')).toBe('available');
		expect(partAvailability('A/B', 'C')).toBe('unavailable');
	});
});

describe('nextActiveAt', () => {
	const expiry = '2026-07-11T21:00:00.000Z';
	it('returns null when available now, for "any", and when unknown', () => {
		expect(nextActiveAt('C', 'C', expiry)).toBeNull();
		expect(nextActiveAt('any', 'A', expiry)).toBeNull();
		expect(nextActiveAt('C', null, expiry)).toBeNull();
		expect(nextActiveAt(undefined, 'A', expiry)).toBeNull();
	});
	it('need C while A is current → next C window is one flip after expiry (150m)', () => {
		// windows after A: expiry→B, expiry+150m→C
		const at = nextActiveAt('C', 'A', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T23:30:00.000Z');
	});
	it('need B while A is current → B starts right at expiry', () => {
		const at = nextActiveAt('B', 'A', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T21:00:00.000Z');
	});
	it('"A/B" while C is current → the sooner one (A) at expiry', () => {
		const at = nextActiveAt('A/B', 'C', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T21:00:00.000Z');
	});
});

describe('formatCountdown', () => {
	it('formats h/m/s, dropping smaller units when a larger is present', () => {
		expect(formatCountdown(75 * 60 * 1000)).toBe('1h15m');
		expect(formatCountdown(90 * 1000)).toBe('1m');
		expect(formatCountdown(5 * 1000)).toBe('5s');
		expect(formatCountdown(0)).toBe('0s');
		expect(formatCountdown(-10)).toBe('0s');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/worldstate/availability.test.ts`
Expected: FAIL — module `./availability` does not exist.

- [ ] **Step 3: Create the types**

Create `src/lib/worldstate/types.ts`:

```ts
export type Letter = 'A' | 'B' | 'C';

export interface CycleState {
	state: string; // "day"|"night" | "warm"|"cold" | "fass"|"vome" | "unknown"
	expiry: string; // ISO8601 ("" when missing)
}

export interface RotationState {
	letter: Letter | null; // null = underivable (no Narmer weapon found)
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

- [ ] **Step 4: Create the availability logic**

Create `src/lib/worldstate/availability.ts`:

```ts
import type { Letter } from './types';

export type PartAvailability = 'available' | 'unavailable' | 'always' | 'unknown';

const LETTERS: Letter[] = ['A', 'B', 'C'];
const ROTATION_MS = 150 * 60 * 1000;

/** Availability of a component given its curated rotation and the live letter.
 * rotation is WarframePart.rotation: 'any' | 'A' | 'B' | 'C' | 'A/B' | undefined. */
export function partAvailability(
	rotation: string | undefined,
	letter: Letter | null,
): PartAvailability {
	if (rotation === undefined) return 'always';
	if (letter === null) return 'unknown';
	if (rotation === 'any') return 'available';
	return rotation.split('/').includes(letter) ? 'available' : 'unavailable';
}

/** When the part's required rotation is next active. Null when available now,
 * "any"/undefined, or the letter/expiry are unknown. Rotations cycle A→B→C→A
 * every 150 min; window i (1-based) starts at expiry + (i-1)·150min. */
export function nextActiveAt(
	rotation: string | undefined,
	letter: Letter | null,
	expiry: string | null,
): Date | null {
	if (rotation === undefined || rotation === 'any' || letter === null || expiry === null)
		return null;
	const required = rotation.split('/');
	if (required.includes(letter)) return null; // available now
	const curIdx = LETTERS.indexOf(letter);
	const expiryMs = new Date(expiry).getTime();
	for (let i = 1; i <= 3; i++) {
		const winLetter = LETTERS[(curIdx + i) % 3];
		if (required.includes(winLetter)) return new Date(expiryMs + (i - 1) * ROTATION_MS);
	}
	return null;
}

/** "1h15m" | "24m" | "38s" | "0s". Clamps negatives to "0s". */
export function formatCountdown(ms: number): string {
	if (ms <= 0) return '0s';
	const total = Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return `${h}h${m}m`;
	if (m > 0) return `${m}m`;
	return `${s}s`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/worldstate/availability.test.ts && pnpm check`
Expected: PASS; type-check clean.

- [ ] **Step 6: Format, lint, commit**

```bash
pnpm format && pnpm lint
git add src/lib/worldstate/types.ts src/lib/worldstate/availability.ts src/lib/worldstate/availability.test.ts
git commit -m "feat(worldstate): types + pure availability/countdown logic"
```

---

### Task 2: Pure upstream parse/derive

**Files:**

- Create: `src/routes/api/worldstate/parse.ts`
- Test: `src/routes/api/worldstate/parse.test.ts`

**Interfaces:**

- Consumes: `CycleState`, `Letter`, `RotationState`, `WorldState` from `$lib/worldstate/types` (Task 1).
- Produces: `toCycle(raw): CycleState`; `deriveRotation(syndicates): RotationState`; `buildWorldState(cetus, vallis, cambion, syndicates, nowIso): WorldState`.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/api/worldstate/parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toCycle, deriveRotation, buildWorldState } from './parse';

const syndicate = (expiry: string, ...rewards: string[]) => ({
	syndicate: 'Ostrons',
	expiry,
	jobs: [{ rewardPool: rewards }],
});

describe('deriveRotation', () => {
	it('maps the Narmer weapon to its rotation letter (Korumm → C)', () => {
		const r = deriveRotation([
			syndicate('2026-07-11T21:00:00.000Z', 'Korumm Blueprint', 'Caliban Neuroptics Blueprint'),
		]);
		expect(r).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
	});
	it('maps Verdilac → A and Nepheri → B', () => {
		expect(deriveRotation([syndicate('x', 'Verdilac Blueprint')]).letter).toBe('A');
		expect(deriveRotation([syndicate('x', 'Nepheri Blueprint')]).letter).toBe('B');
	});
	it('returns null letter and expiry when no Narmer weapon is present', () => {
		expect(deriveRotation([syndicate('x', '200 Endo', 'Aya')])).toEqual({
			letter: null,
			expiry: null,
		});
	});
	it('takes expiry from the first syndicate that has one', () => {
		const r = deriveRotation([
			{ syndicate: 'Cavia', jobs: [] },
			syndicate('2026-07-11T21:00:00.000Z', 'Korumm Blueprint'),
		]);
		expect(r.expiry).toBe('2026-07-11T21:00:00.000Z');
	});
});

describe('toCycle', () => {
	it('trims to state + expiry', () => {
		expect(toCycle({ state: 'night', expiry: 'T', isDay: false } as never)).toEqual({
			state: 'night',
			expiry: 'T',
		});
	});
	it('defaults missing fields', () => {
		expect(toCycle({} as never)).toEqual({ state: 'unknown', expiry: '' });
	});
});

describe('buildWorldState', () => {
	it('composes ok payload from the four sources', () => {
		const ws = buildWorldState(
			{ state: 'day', expiry: 'c' },
			{ state: 'cold', expiry: 'v' },
			{ state: 'fass', expiry: 'm' },
			[syndicate('2026-07-11T21:00:00.000Z', 'Korumm Blueprint')],
			'2026-07-11T20:39:00.000Z',
		);
		expect(ws).toEqual({
			ok: true,
			fetchedAt: '2026-07-11T20:39:00.000Z',
			cetus: { state: 'day', expiry: 'c' },
			vallis: { state: 'cold', expiry: 'v' },
			cambion: { state: 'fass', expiry: 'm' },
			rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/routes/api/worldstate/parse.test.ts`
Expected: FAIL — module `./parse` does not exist.

- [ ] **Step 3: Create the parser**

Create `src/routes/api/worldstate/parse.ts`:

```ts
import type { CycleState, Letter, RotationState, WorldState } from '$lib/worldstate/types';

type RawCycle = { state?: string; expiry?: string };
type RawSyndicate = { syndicate?: string; expiry?: string; jobs?: { rewardPool?: string[] }[] };

const WEAPON_TO_LETTER: Record<string, Letter> = { Verdilac: 'A', Nepheri: 'B', Korumm: 'C' };

export function toCycle(raw: RawCycle): CycleState {
	return { state: raw?.state ?? 'unknown', expiry: raw?.expiry ?? '' };
}

/** Derive the current global rotation letter from the Narmer weapon present in
 * the reward pools (one of Verdilac/Nepheri/Korumm is always live post–New War).
 * Null when none is found (API change / pre-New-War snapshot). */
export function deriveRotation(syndicates: RawSyndicate[]): RotationState {
	const pool = syndicates.flatMap((m) => (m.jobs ?? []).flatMap((j) => j.rewardPool ?? []));
	let letter: Letter | null = null;
	for (const reward of pool) {
		const name = reward.split(' ')[0];
		if (name in WEAPON_TO_LETTER) {
			letter = WEAPON_TO_LETTER[name];
			break;
		}
	}
	const expiry = syndicates.find((m) => m.expiry)?.expiry ?? null;
	return { letter, expiry: letter ? expiry : null };
}

export function buildWorldState(
	cetus: RawCycle,
	vallis: RawCycle,
	cambion: RawCycle,
	syndicates: RawSyndicate[],
	nowIso: string,
): WorldState {
	return {
		ok: true,
		fetchedAt: nowIso,
		cetus: toCycle(cetus),
		vallis: toCycle(vallis),
		cambion: toCycle(cambion),
		rotation: deriveRotation(syndicates),
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/routes/api/worldstate/parse.test.ts && pnpm check`
Expected: PASS; type-check clean.

- [ ] **Step 5: Format, lint, commit**

```bash
pnpm format && pnpm lint
git add src/routes/api/worldstate/parse.ts src/routes/api/worldstate/parse.test.ts
git commit -m "feat(worldstate): pure upstream parse + rotation derivation"
```

---

### Task 3: Worker endpoint `/api/worldstate`

**Files:**

- Create: `src/routes/api/worldstate/+server.ts`
- Test: `src/routes/api/worldstate/server.test.ts`

**Interfaces:**

- Consumes: `buildWorldState` (Task 2).
- Produces: `GET` request handler returning the `WorldState` JSON (or `{ ok: false }` on upstream failure); `export const prerender = false`.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/api/worldstate/server.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET } from './+server';

function mockFetch(byEndpoint: Record<string, unknown>, fail = false) {
	return vi.fn(async (url: string) => {
		if (fail) throw new Error('network down');
		const key = Object.keys(byEndpoint).find((k) => url.includes(k))!;
		return { ok: true, json: async () => byEndpoint[key] } as Response;
	});
}

afterEach(() => vi.unstubAllGlobals());

const fixtures = {
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

describe('GET /api/worldstate', () => {
	it('returns the composed world state on success', async () => {
		vi.stubGlobal('fetch', mockFetch(fixtures));
		const res = await GET({} as never);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.cetus).toEqual({ state: 'day', expiry: 'c' });
		expect(body.rotation).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
		expect(res.headers.get('cache-control')).toMatch(/s-maxage=60/);
	});
	it('returns { ok: false } and no-store on upstream failure', async () => {
		vi.stubGlobal('fetch', mockFetch(fixtures, true));
		const res = await GET({} as never);
		expect(await res.json()).toEqual({ ok: false });
		expect(res.headers.get('cache-control')).toBe('no-store');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/routes/api/worldstate/server.test.ts`
Expected: FAIL — `./+server` has no `GET` export.

- [ ] **Step 3: Create the endpoint**

Create `src/routes/api/worldstate/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { buildWorldState } from './parse';

export const prerender = false;

const BASE = 'https://api.warframestat.us/pc';
const ENDPOINTS = ['cetusCycle', 'vallisCycle', 'cambionCycle', 'syndicateMissions'] as const;

// Synthetic, stable key for the Workers edge cache (caches.default). Absent in
// dev/test — guarded so the handler still works uncached there.
const CACHE_KEY = 'https://worldstate.internal/api/worldstate';

export const GET: RequestHandler = async () => {
	const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	if (edge) {
		const hit = await edge.match(CACHE_KEY);
		if (hit) return hit;
	}
	try {
		const [cetus, vallis, cambion, syndicates] = await Promise.all(
			ENDPOINTS.map((e) =>
				fetch(`${BASE}/${e}?language=en`).then((r) => {
					if (!r.ok) throw new Error(`${e} ${r.status}`);
					return r.json();
				}),
			),
		);
		const body = buildWorldState(cetus, vallis, cambion, syndicates, new Date().toISOString());
		const res = new Response(JSON.stringify(body), {
			headers: {
				'content-type': 'application/json',
				'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
			},
		});
		if (edge) await edge.put(CACHE_KEY, res.clone());
		return res;
	} catch {
		return new Response(JSON.stringify({ ok: false }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
		});
	}
};
```

- [ ] **Step 4: Run tests + type-check**

Run: `pnpm test:unit --run src/routes/api/worldstate/server.test.ts && pnpm check`
Expected: PASS. (`pnpm check` runs `svelte-kit sync` first so `./$types` resolves.)

- [ ] **Step 5: Format, lint, commit**

```bash
pnpm format && pnpm lint
git add src/routes/api/worldstate/+server.ts src/routes/api/worldstate/server.test.ts
git commit -m "feat(worldstate): edge-cached /api/worldstate Worker endpoint"
```

---

### Task 4: Client rune store

**Files:**

- Create: `src/lib/worldstate/worldstate.svelte.ts`
- Test: `src/lib/worldstate/worldstate.svelte.test.ts`

**Interfaces:**

- Consumes: `WorldState` (Task 1); the `/api/worldstate` endpoint (Task 3).
- Produces: `createWorldStateStore(): WorldStateStore` with getters `state: WorldState | null`, `error: boolean`, `now: number`, and methods `refresh(): Promise<void>`, `dispose(): void`. Auto-starts (browser-only): one 60s poll + one 1s tick.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/worldstate/worldstate.svelte.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ base: '' }));

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

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('createWorldStateStore', () => {
	it('populates state from the first fetch', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ json: async () => OK }) as Response),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.state).toEqual(OK);
		expect(store.error).toBe(false);
		store.dispose();
	});
	it('sets error and keeps last state when the payload is { ok: false }', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
		vi.stubGlobal('fetch', fetchMock);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		fetchMock.mockResolvedValueOnce({ json: async () => ({ ok: false }) } as Response);
		await store.refresh();
		expect(store.error).toBe(true);
		expect(store.state).toEqual(OK); // last good kept
		store.dispose();
	});
	it('sets error on network rejection', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('down');
			}),
		);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		expect(store.error).toBe(true);
		store.dispose();
	});
	it('dispose stops the poll timer (no further fetches)', async () => {
		const fetchMock = vi.fn(async () => ({ json: async () => OK }) as Response);
		vi.stubGlobal('fetch', fetchMock);
		const store = createWorldStateStore();
		await vi.advanceTimersByTimeAsync(0);
		store.dispose();
		fetchMock.mockClear();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/worldstate/worldstate.svelte.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the store**

Create `src/lib/worldstate/worldstate.svelte.ts`:

```ts
import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { WorldState } from './types';

export function createWorldStateStore() {
	let state = $state<WorldState | null>(null);
	let error = $state(false);
	let now = $state(Date.now());
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let tickTimer: ReturnType<typeof setInterval> | undefined;

	async function refresh() {
		try {
			const res = await fetch(`${base}/api/worldstate`);
			const data = (await res.json()) as WorldState | { ok: false };
			if (data && (data as WorldState).ok) {
				state = data as WorldState;
				error = false;
			} else {
				error = true; // keep last good `state`
			}
		} catch {
			error = true;
		}
	}

	if (browser) {
		refresh();
		pollTimer = setInterval(refresh, 60_000);
		tickTimer = setInterval(() => {
			now = Date.now();
		}, 1000);
	}

	return {
		get state() {
			return state;
		},
		get error() {
			return error;
		},
		get now() {
			return now;
		},
		refresh,
		dispose() {
			if (pollTimer) clearInterval(pollTimer);
			if (tickTimer) clearInterval(tickTimer);
		},
	};
}

export type WorldStateStore = ReturnType<typeof createWorldStateStore>;
```

- [ ] **Step 4: Run tests + type-check**

Run: `pnpm test:unit --run src/lib/worldstate/worldstate.svelte.test.ts && pnpm check`
Expected: PASS.

- [ ] **Step 5: Format, lint, commit**

```bash
pnpm format && pnpm lint
git add src/lib/worldstate/worldstate.svelte.ts src/lib/worldstate/worldstate.svelte.test.ts
git commit -m "feat(worldstate): browser rune store (poll 60s + 1s tick)"
```

---

### Task 5: Header ticker component

**Files:**

- Create: `src/lib/worldstate/WorldStateTicker.svelte`
- Test: `src/lib/worldstate/WorldStateTicker.svelte.test.ts`

**Interfaces:**

- Consumes: `WorldStateStore` shape (`state`, `error`, `now`) from Task 4; `formatCountdown` (Task 1).
- Produces: `<WorldStateTicker store={...} />` rendering cycles + rotation, or loading/error fallbacks. (Tests pass a plain object with `state`/`error`/`now` — the component only reads those getters.)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/worldstate/WorldStateTicker.svelte.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WorldStateTicker from './WorldStateTicker.svelte';
import type { WorldState } from './types';

const now = Date.parse('2026-07-11T20:39:00.000Z');
const state: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'night', expiry: '2026-07-11T21:00:00.000Z' },
	vallis: { state: 'cold', expiry: '2026-07-11T20:57:00.000Z' },
	cambion: { state: 'fass', expiry: '2026-07-11T21:00:00.000Z' },
	rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
};

describe('WorldStateTicker', () => {
	it('renders cycles with countdowns and the rotation letter', () => {
		render(WorldStateTicker, { store: { state, error: false, now } });
		expect(screen.getByText(/Cetus night · 21m/)).toBeInTheDocument();
		expect(screen.getByText(/Vallis cold · 18m/)).toBeInTheDocument();
		expect(screen.getByText(/Cambion fass · 21m/)).toBeInTheDocument();
		expect(screen.getByText(/Rotation C · flips 21m/)).toBeInTheDocument();
	});
	it('omits the rotation chip when the letter is unknown', () => {
		const s = { ...state, rotation: { letter: null, expiry: null } };
		render(WorldStateTicker, { store: { state: s, error: false, now } });
		expect(screen.queryByText(/Rotation/)).toBeNull();
	});
	it('shows an unavailable fallback on error with no state', () => {
		render(WorldStateTicker, { store: { state: null, error: true, now } });
		expect(screen.getByText(/live status unavailable/i)).toBeInTheDocument();
	});
	it('shows a loading fallback before the first payload', () => {
		render(WorldStateTicker, { store: { state: null, error: false, now } });
		expect(screen.getByText(/loading live status/i)).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/worldstate/WorldStateTicker.svelte.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create the component**

Create `src/lib/worldstate/WorldStateTicker.svelte` (use the `svelte:svelte-file-editor` agent / Svelte MCP tools; run `svelte-autofixer` until clean):

```svelte
<script lang="ts">
	import type { WorldStateStore } from './worldstate.svelte';
	import { formatCountdown } from './availability';

	let { store }: { store: Pick<WorldStateStore, 'state' | 'error' | 'now'> } = $props();

	const GLYPH: Record<string, string> = {
		day: '☀',
		night: '🌙',
		warm: '🔥',
		cold: '❄',
		fass: '🟠',
		vome: '🔵',
	};

	function left(expiry: string): string {
		return formatCountdown(new Date(expiry).getTime() - store.now);
	}
</script>

{#if store.state}
	{@const ws = store.state}
	<div
		data-worldstate
		class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wf-muted"
	>
		<span title="Cetus / Plains of Eidolon">{GLYPH[ws.cetus.state] ?? ''} Cetus {ws.cetus.state} · {left(ws.cetus.expiry)}</span>
		<span title="Orb Vallis">{GLYPH[ws.vallis.state] ?? ''} Vallis {ws.vallis.state} · {left(ws.vallis.expiry)}</span>
		<span title="Cambion Drift">{GLYPH[ws.cambion.state] ?? ''} Cambion {ws.cambion.state} · {left(ws.cambion.expiry)}</span>
		{#if ws.rotation.letter}
			<span class="text-wf-gold" title="Global bounty reward rotation"
				>Rotation {ws.rotation.letter}{#if ws.rotation.expiry} · flips {left(ws.rotation.expiry)}{/if}</span
			>
		{/if}
	</div>
{:else if store.error}
	<div data-worldstate class="text-xs text-wf-muted">⚠ live status unavailable</div>
{:else}
	<div data-worldstate class="text-xs text-wf-muted">Loading live status…</div>
{/if}
```

- [ ] **Step 4: Run tests + type-check**

Run: `pnpm test:unit --run src/lib/worldstate/WorldStateTicker.svelte.test.ts && pnpm check`
Expected: PASS.

- [ ] **Step 5: Format, lint, commit**

```bash
pnpm format && pnpm lint
git add src/lib/worldstate/WorldStateTicker.svelte src/lib/worldstate/WorldStateTicker.svelte.test.ts
git commit -m "feat(worldstate): header ticker (cycles + rotation + countdowns)"
```

---

### Task 6: RegionPanel contextual overlay

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: `WorldState` (Task 1); `partAvailability`, `nextActiveAt`, `formatCountdown` (Task 1).
- Produces: `RegionPanel` gains optional props `worldState?: WorldState | null` and `now?: number`; renders a per-zone cycle line and a per-open-world-part availability chip. Assassination rendering is unchanged (no chips).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/panel/RegionPanel.svelte.test.ts` a new describe (reuse the file's existing `render`, `screen`, `createTracker`, `Dataset` imports):

```ts
import type { WorldState } from '$lib/worldstate/types';

const wsNow = Date.parse('2026-07-11T20:39:00.000Z');
const worldState: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'night', expiry: '2026-07-11T21:00:00.000Z' },
	vallis: { state: 'cold', expiry: '2026-07-11T20:57:00.000Z' },
	cambion: { state: 'fass', expiry: '2026-07-11T21:00:00.000Z' },
	rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
};

// Earth zone with Gara: Neuroptics is Rot C (up now), Systems is Rot A (not this
// rotation); plus Hildryn-style always-available part with no rotation.
const owAvail: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['plains'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
	],
	bosses: [],
	warframes: [
		{
			id: 'gara',
			name: 'Gara',
			nodeId: 'plains',
			parts: [
				{ id: 'gara:bp', frameId: 'gara', slot: 'bp' },
				{
					id: 'gara:neuroptics',
					frameId: 'gara',
					slot: 'neuroptics',
					dropSourceNodeId: 'plains',
					chance: 47,
					bountyTier: 'L20–40',
					rotation: 'C',
				},
				{
					id: 'gara:systems',
					frameId: 'gara',
					slot: 'systems',
					dropSourceNodeId: 'plains',
					chance: 45,
					bountyTier: 'L10–30',
					rotation: 'A',
				},
				{
					id: 'gara:chassis',
					frameId: 'gara',
					slot: 'chassis',
					dropSourceNodeId: 'plains',
					chance: 39,
				},
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'gara',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: "Complete Saya's Vigil",
		},
	],
};

describe('RegionPanel — world-state overlay', () => {
	it('marks a part up now when its rotation matches the live letter', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:neuroptics"]') as HTMLElement;
		expect(row.textContent).toMatch(/up now · resets 21m/);
	});
	it('marks a part not-this-rotation with the next-up countdown', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:systems"]') as HTMLElement;
		expect(row.textContent).toMatch(/Rot A · up in/);
	});
	it('marks a rotation-less component as always available', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:chassis"]') as HTMLElement;
		expect(row.textContent).toMatch(/always available/);
	});
	it('renders the zone cycle line for the region', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		expect(screen.getByText(/night · 21m/)).toBeInTheDocument();
	});
	it('renders no chips or cycle line when worldState is absent', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
		});
		expect(document.querySelector('[data-part="gara:neuroptics"]')!.textContent).not.toMatch(
			/up now/,
		);
		expect(screen.queryByText(/night ·/)).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts -t "world-state overlay"`
Expected: FAIL — no chips / cycle line rendered yet.

- [ ] **Step 3: Implement the overlay** (use the `svelte:svelte-file-editor` agent; run `svelte-autofixer` until clean)

3a. Extend the `<script>`. Add imports and props (add to the existing `let { ... } = $props()`):

```ts
import type { WorldState } from '$lib/worldstate/types';
import { partAvailability, nextActiveAt, formatCountdown } from '$lib/worldstate/availability';
```

Change the props destructure to include the two new optional props:

```ts
let {
	dataset,
	regionId,
	tracker,
	worldState = null,
	now = Date.now(),
}: {
	dataset: Dataset;
	regionId: string;
	tracker: Tracker;
	worldState?: WorldState | null;
	now?: number;
} = $props();
```

Add helpers (near `owSourceText`):

```ts
const ZONE_CYCLE: Record<string, 'cetus' | 'vallis' | 'cambion'> = {
	'Plains of Eidolon': 'cetus',
	'Orb Vallis': 'vallis',
	'Cambion Drift': 'cambion',
};
const CYCLE_GLYPH: Record<string, string> = {
	day: '☀',
	night: '🌙',
	warm: '🔥',
	cold: '❄',
	fass: '🟠',
	vome: '🔵',
};

function zoneCycleLine(nodeName: string): string | null {
	if (!worldState) return null;
	const key = ZONE_CYCLE[nodeName];
	if (!key) return null;
	const cyc = worldState[key];
	return `${CYCLE_GLYPH[cyc.state] ?? ''} ${cyc.state} · ${formatCountdown(new Date(cyc.expiry).getTime() - now)}`;
}

// Availability chip for an open-world component row. Null → render nothing
// (bp slot, unknown rotation, or no live data).
function owAvailabilityChip(part: WarframePart): { cls: string; text: string } | null {
	if (!worldState || part.slot === 'bp') return null;
	const rot = worldState.rotation;
	const a = partAvailability(part.rotation, rot.letter);
	if (a === 'available') {
		const resets = rot.expiry
			? ` · resets ${formatCountdown(new Date(rot.expiry).getTime() - now)}`
			: '';
		return { cls: 'text-emerald-300', text: `● up now${resets}` };
	}
	if (a === 'always') return { cls: 'text-emerald-300', text: '● always available' };
	if (a === 'unavailable') {
		const next = nextActiveAt(part.rotation, rot.letter, rot.expiry);
		const when = next ? ` · up in ${formatCountdown(next.getTime() - now)}` : '';
		return { cls: 'text-wf-muted', text: `○ Rot ${part.rotation}${when}` };
	}
	return null;
}
```

3b. Thread an availability callback through the shared `frameCard` snippet. Change its signature to accept an optional 4th parameter and render the chip inside the part row. Update the snippet declaration:

```svelte
{#snippet frameCard(
	frame: Warframe,
	subLine: string,
	sourceText: (part: WarframePart) => string,
	avail?: (part: WarframePart) => { cls: string; text: string } | null,
)}
```

Inside the snippet's part-row `{#each frame.parts as part (part.id)}` loop, after the existing source `<span class="ml-auto …">{sourceText(part)}</span>`, add the chip on its own line under the row's flex container. Replace the single source span line with source + chip:

```svelte
					<span class="ml-auto text-xs text-wf-muted">{sourceText(part)}</span>
					{#if avail}
						{@const chip = avail(part)}
						{#if chip}
							<span class="ml-2 shrink-0 text-[11px] {chip.cls}">{chip.text}</span>
						{/if}
					{/if}
```

3c. Pass the callback only from the open-world caller (assassination stays `undefined`). In the open-world `{#each zone.entries …}` block, update the render call:

```svelte
						{@render frameCard(frame, `Blueprint: ${farm.bpSource}`, (part) => owSourceText(part, farm), owAvailabilityChip)}
```

3d. Add the zone cycle line to the open-world zone header. In the zone header `<div class="mb-4 flex items-start justify-between gap-3">`, add below the `<h3>{zone.node.name}</h3>` (inside the left cell) — or after the faction tag — a cycle line:

```svelte
						{#if zoneCycleLine(zone.node.name)}
							<p class="mt-0.5 text-xs text-wf-muted" data-zone-cycle>{zoneCycleLine(zone.node.name)}</p>
						{/if}
```

(The assassination `{@render frameCard(...)}` call keeps three args — no chip.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: PASS — the new overlay cases and ALL pre-existing RegionPanel cases (assassination, open-world static, Equinox, key hint, resources) still pass; the chip must not appear on assassination rows or when `worldState` is null.

- [ ] **Step 5: Format, lint, check, commit**

```bash
pnpm format && pnpm lint && pnpm check
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(worldstate): RegionPanel cycle line + per-part availability chip"
```

---

### Task 7: Wire into the page + service worker

**Files:**

- Modify: `src/routes/+page.svelte`
- Modify: `src/service-worker.ts`
- Test: `src/routes/page.svelte.test.ts` (adjust if the store's fetch breaks it)

**Interfaces:**

- Consumes: `createWorldStateStore` (Task 4), `WorldStateTicker` (Task 5), `RegionPanel` overlay props (Task 6).

- [ ] **Step 1: Mount the store and render the ticker** (use the `svelte:svelte-file-editor` agent)

In `src/routes/+page.svelte`:

Add imports:

```ts
import { createWorldStateStore, type WorldStateStore } from '$lib/worldstate/worldstate.svelte';
import WorldStateTicker from '$lib/worldstate/WorldStateTicker.svelte';
```

Add state (near the other `$state`):

```ts
let ws = $state<WorldStateStore | null>(null);
```

Create it in `onMount` (after the tracker is set up) and dispose it in `onDestroy`:

```ts
ws = createWorldStateStore();
```

```ts
onDestroy(() => {
	tracker?.dispose();
	ws?.dispose();
});
```

Render the ticker in the header — add it inside the `<header>`'s `ml-auto` group, before the Search button (so it sits left of the controls):

```svelte
			{#if ws}
				<WorldStateTicker store={ws} />
			{/if}
```

Pass the overlay props to `RegionPanel`:

```svelte
			<RegionPanel
				dataset={data}
				regionId={selectedId}
				{tracker}
				worldState={ws?.state ?? null}
				now={ws?.now ?? Date.now()}
			/>
```

- [ ] **Step 2: Add the service-worker network-first rule**

In `src/service-worker.ts`, inside the `fetch` listener, **before** the "Everything else: cache-first" block, add:

```ts
// Live world state: network-first (never freeze it in the cache-first
// branch). Fall back to the last cached copy when offline.
if (url.pathname.endsWith('/api/worldstate')) {
	e.respondWith(
		caches.open(CACHE).then(async (cache) => {
			try {
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			} catch {
				return (await cache.match(req)) ?? Response.error();
			}
		}),
	);
	return;
}
```

- [ ] **Step 3: Keep the page test green**

Run: `pnpm test:unit --run src/routes/page.svelte.test.ts`
Expected: PASS. If the test now fails because the store's `onMount` `fetch('/api/worldstate')` is unmocked, add a passthrough at the top of the test file (before rendering) so the store errors softly without affecting assertions:

```ts
import { vi } from 'vitest';
// world-state store fetch — resolve to a soft failure so the ticker shows its
// fallback without touching the network.
vi.stubGlobal(
	'fetch',
	vi.fn(async (url: string) =>
		url.includes('/api/worldstate')
			? ({ json: async () => ({ ok: false }) } as Response)
			: ({
					json: async () => ({
						version: '',
						data: {
							regions: [],
							nodes: [],
							bosses: [],
							warframes: [],
							resources: [],
							quests: [],
							openWorldFarms: [],
						},
					}),
				} as Response),
	),
);
```

(Only add this if the existing test doesn't already stub `fetch`; if it does, extend that stub to handle `/api/worldstate`.)

- [ ] **Step 4: Full suite + type-check + lint + format**

Run: `pnpm test:unit --run && pnpm check && pnpm lint && pnpm format:check`
Expected: all PASS/clean.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/routes/+page.svelte src/service-worker.ts src/routes/page.svelte.test.ts
git commit -m "feat(worldstate): mount store, header ticker, RegionPanel overlay, SW rule"
```

---

### Task 8: Verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm test:unit --run && pnpm check && pnpm lint && pnpm format:check && pnpm test:e2e`
Expected: all PASS/clean.

- [ ] **Step 2: Drive the app (verification-before-completion)**

Run `pnpm dev` (the SvelteKit dev server serves `/api/worldstate`, which fetches upstream live). In the browser / via Playwright MCP:

- Header shows the ticker: three cycles with live countdowns + `Rotation <letter> · flips <time>`.
- `GET /api/worldstate` returns `ok:true` with cycles + a non-null rotation letter (check the network panel / `curl http://localhost:5173/api/worldstate`).
- Select **Earth** → Plains of Eidolon zone shows a cycle line, and Gara/Revenant/Caliban component rows show availability chips (`● up now · resets …`, `○ Rot X · up in …`, or `● always available` for Hildryn on Venus).
- Cross-check the derived rotation letter against the current Narmer weapon at `curl -s https://api.warframestat.us/pc/syndicateMissions | grep -oE 'Verdilac|Nepheri|Korumm'`.

- [ ] **Step 3: Commit any fixups**

```bash
git add -A && git commit -m "chore(worldstate): verification fixups" || echo "nothing to fix"
```

---

## Self-Review

**Spec coverage:**

- Two data sources + `/api/worldstate` edge-cached endpoint → Task 3; pure derive/parse → Task 2. ✓
- Rotation letter from Narmer weapon (Verdilac/Nepheri/Korumm) → Task 2. ✓
- Availability from curated `rotation` (covers Qorvex/Hildryn) + next-active math → Task 1. ✓
- Client store (60s poll + 1s tick, fail-soft) → Task 4. ✓
- Header ticker (cycles + rotation + countdowns, loading/error) → Task 5. ✓
- Contextual RegionPanel (zone cycle line + per-part chip; null-safe) → Task 6. ✓
- Page wiring + SW network-first → Task 7. ✓
- `prerender = false`; hardcoded `pc`; no dataset/pipeline change → Tasks 3, spec non-goals. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete; every command has expected output. ✓

**Type consistency:** `Letter`/`CycleState`/`RotationState`/`WorldState` defined in Task 1, consumed unchanged in Tasks 2–7; `WorldStateStore` shape (`state`/`error`/`now`/`refresh`/`dispose`) consistent between Tasks 4/5/7; `partAvailability`/`nextActiveAt`/`formatCountdown` signatures identical across Tasks 1/6; RegionPanel `worldState`/`now` props match `+page.svelte`'s pass-through. ✓
