# Inventory Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player seed their tracked state (owned frames → all their parts, plus completed quests) from their live Warframe account by pasting their account ID.

**Architecture:** A pure parse layer maps a fetched public profile to tracked IDs (frames via mastery `uniqueName` folder-matching, quests via heuristic `challengeProgress` markers); a thin client fetches the profile directly from `api.warframestat.us` (CORS open, no proxy); a rune store orchestrates fetch → preview → add-only merge into the existing tracker; a dialog surfaces it, reachable from the command palette and the settings drawer.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, TypeScript, Vitest (+ `@testing-library/svelte`, `fake-indexeddb/auto`), Playwright, `idb`. Build-time data from `@wfcd/items`.

## Global Constraints

- Node `>=24`; package manager `pnpm@11.11.0`. Run scripts with `pnpm`.
- **No new dependencies.** `idb` and `fake-indexeddb` are already present.
- Runes mode is forced for all project files (`$state`/`$derived`/`$effect`).
- Tests are colocated: `*.test.ts` for logic, `*.svelte.test.ts` for components/rune modules. E2E lives in `e2e/*.test.ts`.
- Commands: unit `pnpm test:unit --run`, e2e `pnpm test:e2e`, types `pnpm check`, format `pnpm format`.
- Conventional-commit messages. Every commit compiles, passes existing tests, and is formatted (`pnpm format` before commit).
- Frame identity join key is the Powersuit `uniqueName` **folder** segment (`/Lotus/Powersuits/Cowgirl/CowgirlPrime` → `Cowgirl`); the real `@wfcd/items` source and the DE profile agree on these codenames. Do **not** hand-maintain a display-name codename map.
- Account ID format: exactly 24 hex chars (`/^[a-f0-9]{24}$/`).
- Copy rule: never claim DE endorses sharing the account ID; describe it only as a public in-game identifier that is not a credential.

---

## File Structure

- `src/lib/import/questMarkers.ts` — curated quest-id → challenge-marker map.
- `src/lib/import/parseProfile.ts` — pure profile→ImportResult transforms + shared profile/result types.
- `src/lib/import/accountId.ts` — `normalizeAccountId`.
- `src/lib/import/profileClient.ts` — `fetchProfile` + `ProfileError`.
- `src/lib/import/importState.svelte.ts` — orchestration rune store.
- `src/lib/import/ImportDialog.svelte` — the UI.
- Modified: `src/lib/model/types.ts` (add `uniqueName?`), `scripts/data/build.ts` (retain `uniqueName`), `src/lib/tracker/persistence.ts` (account-id keys), `src/lib/palette/search.ts` (`action` item type), `src/lib/panel/SettingsDrawer.svelte` (`onimport` section), `src/routes/+page.svelte` (wire everything).
- Regenerated: `static/data/dataset.json`.

---

## Task 1: Retain `uniqueName` in the dataset

**Files:**
- Modify: `src/lib/model/types.ts:16-22`
- Modify: `scripts/data/build.ts:210` and `scripts/data/build.ts:256`
- Test: `scripts/data/build.test.ts`
- Regenerate: `static/data/dataset.json`

**Interfaces:**
- Produces: `Warframe.uniqueName?: string` — the raw `@wfcd/items` Powersuit path, e.g. `/Lotus/Powersuits/Rhino/Rhino`. Consumed by Task 3's `frameFolder`.

- [ ] **Step 1: Write the failing test** — add to `scripts/data/build.test.ts` inside the existing `describe('buildFrames', …)` block:

```ts
	it('carries the raw uniqueName through onto each frame', () => {
		const rhino = frames.find((f) => f.id === 'rhino')!;
		expect(rhino.uniqueName).toBe('/Lotus/Powersuits/Rhino/Rhino');
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: FAIL — `rhino.uniqueName` is `undefined`.

- [ ] **Step 3: Add the optional field to the model** — in `src/lib/model/types.ts`, the `Warframe` interface:

```ts
export interface Warframe {
	id: string;
	name: string;
	/** Raw @wfcd/items Powersuit path, e.g. "/Lotus/Powersuits/Cowgirl/Cowgirl".
	 * Used to match a player's mastered frames from their profile. Always set by
	 * the build; optional so seed/test fixtures need not provide it. */
	uniqueName?: string;
	image?: string;
	nodeId?: string;
	parts: WarframePart[];
}
```

- [ ] **Step 4: Retain it in both frame builders** — in `scripts/data/build.ts`, change the `frames.push(...)` on line 210 (in `buildFrames`) to include `uniqueName`:

```ts
		frames.push({ id: frameId, name: wf.name, uniqueName: wf.uniqueName, nodeId: node.id, image: wf.imageName, parts });
```

and the `frames.push(...)` on line 256 (in `buildOpenWorldFrames`):

```ts
		frames.push({ id: frameId, name: wf.name, uniqueName: wf.uniqueName, nodeId, image: wf.imageName, parts });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/build.test.ts`
Expected: PASS.

- [ ] **Step 6: Regenerate the shipped dataset**

Run: `pnpm data:build`
Expected: writes `static/data/dataset.json`; every `warframes[]` entry now has a `uniqueName`. Sanity-check:

Run: `node -e "const d=require('./static/data/dataset.json');console.log(d.data.warframes.every(f=>f.uniqueName), d.data.warframes.find(f=>f.id==='mesa')?.uniqueName)"`
Expected: `true /Lotus/Powersuits/Cowgirl/Cowgirl`

- [ ] **Step 7: Format and commit**

```bash
pnpm format
git add src/lib/model/types.ts scripts/data/build.ts scripts/data/build.test.ts static/data/dataset.json
git commit -m "feat(data): retain warframe uniqueName for profile matching"
```

---

## Task 2: `normalizeAccountId`

**Files:**
- Create: `src/lib/import/accountId.ts`
- Test: `src/lib/import/accountId.test.ts`

**Interfaces:**
- Produces: `normalizeAccountId(raw: string): string | null` — lowercased 24-hex id, or null. Consumed by Tasks 6.

- [ ] **Step 1: Write the failing test** — create `src/lib/import/accountId.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeAccountId } from './accountId';

describe('normalizeAccountId', () => {
	const ID = '517d823a1a4d804218000052';

	it('accepts a clean 24-hex id', () => {
		expect(normalizeAccountId(ID)).toBe(ID);
	});
	it('trims surrounding whitespace', () => {
		expect(normalizeAccountId(`  ${ID}\n`)).toBe(ID);
	});
	it('strips wrapping quotes', () => {
		expect(normalizeAccountId(`"${ID}"`)).toBe(ID);
	});
	it('extracts the id from a pasted user_id field', () => {
		expect(normalizeAccountId(`"user_id": "${ID}"`)).toBe(ID);
	});
	it('lowercases hex', () => {
		expect(normalizeAccountId(ID.toUpperCase())).toBe(ID);
	});
	it('rejects a display name', () => {
		expect(normalizeAccountId('Tobiah')).toBeNull();
	});
	it('rejects a too-short id', () => {
		expect(normalizeAccountId('517d823a')).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/import/accountId.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/lib/import/accountId.ts`:

```ts
/** Normalize a pasted account id. Tolerates the common paste mistakes — a
 * "user_id" label, wrapping quotes, a colon, and whitespace — by dropping the
 * label word then stripping every non-hex character, and finally requires
 * exactly 24 hex chars. Returns the lowercased id, or null if it doesn't look
 * like an account id. (A full user-data JSON blob is intentionally out of
 * scope; this normalizes an id, it does not parse JSON.) */
export function normalizeAccountId(raw: string): string | null {
	const cleaned = raw
		.replace(/user_id/gi, '')
		.replace(/[^a-fA-F0-9]/g, '')
		.toLowerCase();
	return /^[a-f0-9]{24}$/.test(cleaned) ? cleaned : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit --run src/lib/import/accountId.test.ts`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add src/lib/import/accountId.ts src/lib/import/accountId.test.ts
git commit -m "feat(import): normalize pasted account id"
```

---

## Task 3: Profile parsing (`questMarkers.ts` + `parseProfile.ts`)

**Files:**
- Create: `src/lib/import/questMarkers.ts`
- Create: `src/lib/import/parseProfile.ts`
- Test: `src/lib/import/parseProfile.test.ts`

**Interfaces:**
- Consumes: `Warframe` (with `uniqueName?`), `Dataset` from `$lib/model/types`.
- Produces:
  - `interface ProfileXpEntry { uniqueName: string; xp?: number }`
  - `interface RawProfile { loadout?: { xpInfo?: ProfileXpEntry[] }; challengeProgress?: { name: string; progress?: number }[] }`
  - `interface ImportResult { frameIds: string[]; partIds: string[]; questIds: string[]; ownedUntrackedCount: number }`
  - `frameFolder(uniqueName: string): string | null`
  - `matchOwnedFrames(profile, frames): { frameIds; partIds; ownedUntrackedCount }`
  - `matchCompletedQuests(profile, quests): string[]`
  - `parseProfile(profile: RawProfile, dataset: Dataset): ImportResult`
  - Consumed by Tasks 6 (store) and 7 (dialog renders `ImportResult`).

- [ ] **Step 1: Write the failing test** — create `src/lib/import/parseProfile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { frameFolder, matchOwnedFrames, matchCompletedQuests, parseProfile } from './parseProfile';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

function frame(id: string, uniqueName: string, slots: string[]): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: slots.map((slot) => ({ id: `${id}:${slot}`, frameId: id, slot: slot as never })),
	};
}

const frames: Warframe[] = [
	frame('rhino', '/Lotus/Powersuits/Rhino/Rhino', ['bp', 'neuroptics', 'chassis', 'systems']),
	frame('mesa', '/Lotus/Powersuits/Cowgirl/Cowgirl', ['bp', 'neuroptics', 'chassis', 'systems']),
	frame('equinox', '/Lotus/Powersuits/YinYang/YinYang', ['bp', 'dayaspect', 'nightaspect']),
];

const dataset = {
	warframes: frames,
	quests: [{ id: 'thewarwithin' }, { id: 'theseconddream' }],
} as unknown as Dataset;

describe('frameFolder', () => {
	it('returns the parent folder segment', () => {
		expect(frameFolder('/Lotus/Powersuits/Rhino/Rhino')).toBe('Rhino');
	});
	it('collapses Prime/Umbra variants onto the base folder', () => {
		expect(frameFolder('/Lotus/Powersuits/Cowgirl/CowgirlPrime')).toBe('Cowgirl');
	});
	it('ignores non-powersuit paths', () => {
		expect(frameFolder('/Lotus/Types/Sentinels/SentinelPowersuits/ShadePowerSuit')).toBeNull();
	});
	it('ignores archwings', () => {
		expect(frameFolder('/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack')).toBeNull();
	});
});

describe('matchOwnedFrames', () => {
	const profile: RawProfile = {
		loadout: {
			xpInfo: [
				{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' },
				{ uniqueName: '/Lotus/Powersuits/Cowgirl/CowgirlPrime' }, // Mesa Prime → Mesa
				{ uniqueName: '/Lotus/Powersuits/Volt/Volt' }, // owned but untracked
				{ uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton' }, // not a frame
			],
		},
	};
	const res = matchOwnedFrames(profile, frames);
	it('matches base and variant frames by folder', () => {
		expect(res.frameIds.sort()).toEqual(['mesa', 'rhino']);
	});
	it('expands each owned frame to all its part ids', () => {
		expect(res.partIds).toContain('rhino:bp');
		expect(res.partIds).toContain('mesa:systems');
		expect(res.partIds).toHaveLength(8);
	});
	it('counts owned powersuits that are not tracked frames', () => {
		expect(res.ownedUntrackedCount).toBe(1); // Volt only; the weapon is ignored
	});
});

describe('matchCompletedQuests', () => {
	it('detects a quest when any marker challenge is present', () => {
		const profile: RawProfile = { challengeProgress: [{ name: 'TheWarWithin', progress: 1 }] };
		expect(matchCompletedQuests(profile, dataset.quests)).toEqual(['thewarwithin']);
	});
	it('returns nothing when no markers match', () => {
		const profile: RawProfile = { challengeProgress: [{ name: 'ApplyMod' }] };
		expect(matchCompletedQuests(profile, dataset.quests)).toEqual([]);
	});
});

describe('parseProfile', () => {
	it('combines frame and quest detection', () => {
		const profile: RawProfile = {
			loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/YinYang/YinYang' }] },
			challengeProgress: [{ name: 'SecondDreamTitleChallenge' }],
		};
		const res = parseProfile(profile, dataset);
		expect(res.frameIds).toEqual(['equinox']);
		expect(res.partIds.sort()).toEqual(['equinox:bp', 'equinox:dayaspect', 'equinox:nightaspect']);
		expect(res.questIds).toEqual(['theseconddream']);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/import/parseProfile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the quest-marker map** — `src/lib/import/questMarkers.ts`:

```ts
/** Best-effort map from a tracked quest id to the `challengeProgress` marker
 * challenge name(s) that indicate the quest is complete. A quest counts as done
 * when ANY of its markers is present. These are heuristic — the DE profile has
 * no explicit quest log — which is why import always previews before applying.
 * Keys must match dataset quest ids. */
export const QUEST_MARKERS: Record<string, string[]> = {
	theseconddream: ['SecondDreamTitleChallenge'],
	thewarwithin: ['TheWarWithin'],
	heartofdeimos: ['MummyQuestKillBroodMother'],
	angelsofthezariman: ['VMCompleteQuestVox'],
};
```

- [ ] **Step 4: Implement the parser** — `src/lib/import/parseProfile.ts`:

```ts
import type { Dataset, Warframe } from '$lib/model/types';
import { QUEST_MARKERS } from './questMarkers';

/** One item's mastery-affinity entry from a profile's xpInfo list. */
export interface ProfileXpEntry {
	uniqueName: string;
	xp?: number;
}

/** The slices of a warframestat.us profile this feature reads. */
export interface RawProfile {
	loadout?: { xpInfo?: ProfileXpEntry[] };
	challengeProgress?: { name: string; progress?: number }[];
}

export interface ImportResult {
	/** Tracked frame ids the player has mastered. */
	frameIds: string[];
	/** Every part id of those frames (bp + components). */
	partIds: string[];
	/** Tracked quest ids detected as complete. */
	questIds: string[];
	/** Owned powersuits that don't map to a tracked frame (drives the preview note). */
	ownedUntrackedCount: number;
}

/** The parent-folder codename segment of a Powersuit uniqueName, e.g.
 * "/Lotus/Powersuits/Cowgirl/CowgirlPrime" -> "Cowgirl". Prime/Umbra variants
 * share the base folder, so this collapses them onto the base frame. Returns
 * null for non-Powersuit paths and for archwings (not tracked frames). */
export function frameFolder(uniqueName: string): string | null {
	const segs = uniqueName.split('/').filter(Boolean);
	const i = segs.indexOf('Powersuits');
	if (i === -1 || segs.length < i + 2) return null;
	if (segs[i + 1] === 'Archwing') return null;
	return segs[segs.length - 2];
}

export function matchOwnedFrames(
	profile: RawProfile,
	frames: Warframe[],
): { frameIds: string[]; partIds: string[]; ownedUntrackedCount: number } {
	const frameByFolder = new Map<string, Warframe>();
	for (const f of frames) {
		if (!f.uniqueName) continue;
		const folder = frameFolder(f.uniqueName);
		if (folder) frameByFolder.set(folder, f);
	}
	const owned = new Set<string>();
	const untracked = new Set<string>();
	for (const entry of profile.loadout?.xpInfo ?? []) {
		const folder = frameFolder(entry.uniqueName);
		if (!folder) continue; // weapon / sentinel / archwing — not a tracked frame
		const frame = frameByFolder.get(folder);
		if (frame) owned.add(frame.id);
		else untracked.add(folder);
	}
	const byId = new Map(frames.map((f) => [f.id, f]));
	const frameIds = [...owned];
	const partIds: string[] = [];
	for (const id of frameIds) for (const p of byId.get(id)!.parts) partIds.push(p.id);
	return { frameIds, partIds, ownedUntrackedCount: untracked.size };
}

export function matchCompletedQuests(profile: RawProfile, quests: { id: string }[]): string[] {
	const names = new Set((profile.challengeProgress ?? []).map((c) => c.name));
	const done: string[] = [];
	for (const q of quests) {
		const markers = QUEST_MARKERS[q.id] ?? [];
		if (markers.some((m) => names.has(m))) done.push(q.id);
	}
	return done;
}

export function parseProfile(profile: RawProfile, dataset: Dataset): ImportResult {
	const { frameIds, partIds, ownedUntrackedCount } = matchOwnedFrames(profile, dataset.warframes);
	const questIds = matchCompletedQuests(profile, dataset.quests);
	return { frameIds, partIds, questIds, ownedUntrackedCount };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/import/parseProfile.test.ts`
Expected: PASS (all cases). Note the untracked test expects `1` — the `Volt` powersuit counts, the `Braton` weapon does not.

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add src/lib/import/questMarkers.ts src/lib/import/parseProfile.ts src/lib/import/parseProfile.test.ts
git commit -m "feat(import): parse owned frames and completed quests from a profile"
```

---

## Task 4: Profile client (`fetchProfile` + `ProfileError`)

**Files:**
- Create: `src/lib/import/profileClient.ts`
- Test: `src/lib/import/profileClient.test.ts`

**Interfaces:**
- Consumes: `RawProfile` from `./parseProfile`.
- Produces:
  - `class ProfileError extends Error { kind: 'notFound' | 'network' | 'rateLimited' | 'empty' }`
  - `fetchProfile(accountId: string): Promise<RawProfile>` — throws `ProfileError` with a user-facing `message`. Consumed by Task 6.

- [ ] **Step 1: Write the failing test** — create `src/lib/import/profileClient.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchProfile, ProfileError } from './profileClient';

function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
	vi.stubGlobal('fetch', vi.fn(async () => res as Response));
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchProfile', () => {
	const ID = '517d823a1a4d804218000052';

	it('returns parsed json on success', async () => {
		const body = { loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] } };
		mockFetch({ ok: true, status: 200, json: async () => body });
		await expect(fetchProfile(ID)).resolves.toEqual(body);
	});

	it('throws a notFound ProfileError on 404', async () => {
		mockFetch({ ok: false, status: 404, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'notFound' });
	});

	it('throws a rateLimited ProfileError on 403', async () => {
		mockFetch({ ok: false, status: 403, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'rateLimited' });
	});

	it('throws a network ProfileError when fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws an empty ProfileError when the body has no usable data', async () => {
		mockFetch({ ok: true, status: 200, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toBeInstanceOf(ProfileError);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/import/profileClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/lib/import/profileClient.ts`:

```ts
import type { RawProfile } from './parseProfile';

export type ProfileErrorKind = 'notFound' | 'network' | 'rateLimited' | 'empty';

export class ProfileError extends Error {
	constructor(
		message: string,
		readonly kind: ProfileErrorKind,
	) {
		super(message);
		this.name = 'ProfileError';
	}
}

const BASE = 'https://api.warframestat.us/profile';

/** Fetch a player's public profile by account id, directly from warframestat.us
 * (CORS is open, no proxy needed). Throws ProfileError with a user-facing
 * message on any failure. */
export async function fetchProfile(accountId: string): Promise<RawProfile> {
	let res: Response;
	try {
		res = await fetch(`${BASE}/${accountId}`, { headers: { accept: 'application/json' } });
	} catch {
		throw new ProfileError(
			"Couldn't reach the profile service. Check your connection and try again.",
			'network',
		);
	}
	if (res.status === 404)
		throw new ProfileError(
			'No profile found. Use your account ID from warframe.com/api/user-data, not your display name.',
			'notFound',
		);
	if (res.status === 403 || res.status === 429)
		throw new ProfileError(
			'The profile service is rate-limiting requests right now. Please try again in a moment.',
			'rateLimited',
		);
	if (!res.ok)
		throw new ProfileError("Couldn't load that profile. Please try again.", 'network');

	const data = (await res.json()) as RawProfile;
	if (!data || (!data.loadout?.xpInfo && !data.challengeProgress))
		throw new ProfileError('That profile returned no usable data.', 'empty');
	return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/import/profileClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add src/lib/import/profileClient.ts src/lib/import/profileClient.test.ts
git commit -m "feat(import): fetch player profile with typed errors"
```

---

## Task 5: Account-ID persistence

**Files:**
- Modify: `src/lib/tracker/persistence.ts`
- Test: `src/lib/tracker/persistence.test.ts`

**Interfaces:**
- Produces (added to `persistence.ts`):
  - `loadAccountId(): Promise<string | null>`
  - `saveAccountId(id: string): Promise<void>`
  - `clearAccountId(): Promise<void>`
  - Consumed by Task 6. Uses the existing `wforacle`/`tracking` store, new key `accountId`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/tracker/persistence.test.ts` a new block (keep existing imports; add the three names to the existing `import { … } from './persistence'`):

```ts
describe('account id persistence', () => {
	it('round-trips and clears the account id', async () => {
		const { loadAccountId, saveAccountId, clearAccountId } = await import('./persistence');
		expect(await loadAccountId()).toBeNull();
		await saveAccountId('517d823a1a4d804218000052');
		expect(await loadAccountId()).toBe('517d823a1a4d804218000052');
		await clearAccountId();
		expect(await loadAccountId()).toBeNull();
	});
});
```

(If `persistence.test.ts` lacks a `describe` import, add `import { describe, it, expect } from 'vitest';` — match the file's existing style.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/tracker/persistence.test.ts`
Expected: FAIL — `loadAccountId` is not exported.

- [ ] **Step 3: Implement** — in `src/lib/tracker/persistence.ts`, add the key constant next to the others and the three functions at the end:

```ts
const KEY_ACCOUNT = 'accountId';
```

```ts
export async function loadAccountId(): Promise<string | null> {
	if (!browser && typeof indexedDB === 'undefined') return null;
	return (await (await db()).get(STORE, KEY_ACCOUNT)) ?? null;
}
export async function saveAccountId(id: string): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).put(STORE, id, KEY_ACCOUNT);
}
export async function clearAccountId(): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).delete(STORE, KEY_ACCOUNT);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/tracker/persistence.test.ts`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add src/lib/tracker/persistence.ts src/lib/tracker/persistence.test.ts
git commit -m "feat(tracker): persist remembered account id"
```

---

## Task 6: Import orchestration store

**Files:**
- Create: `src/lib/import/importState.svelte.ts`
- Test: `src/lib/import/importState.svelte.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `Tracker`, `fetchProfile`/`ProfileError`, `parseProfile`/`ImportResult`, `normalizeAccountId`, persistence account-id fns.
- Produces:
  - `createImportStore(dataset: Dataset, deps?: { fetchProfile?: typeof fetchProfile }): ImportStore`
  - Store shape: getters `phase: 'idle'|'loading'|'preview'|'error'`, `result: ImportResult | null`, `error: string`, `rememberedId: string | null`; methods `init(): Promise<void>`, `run(rawId: string): Promise<void>`, `apply(tracker, rawId, remember): void`, `forget(): void`, `reset(): void`.
  - Consumed by Tasks 7 and 8.

- [ ] **Step 1: Write the failing test** — create `src/lib/import/importState.svelte.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createImportStore } from './importState.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';
import { createTracker } from '$lib/tracker/tracker.svelte';

function frame(id: string, uniqueName: string): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: ['bp', 'chassis'].map((slot) => ({ id: `${id}:${slot}`, frameId: id, slot: slot as never })),
	};
}
const frames = [frame('rhino', '/Lotus/Powersuits/Rhino/Rhino')];
const dataset = { warframes: frames, quests: [{ id: 'thewarwithin' }] } as unknown as Dataset;

const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
	challengeProgress: [{ name: 'TheWarWithin' }],
};

describe('createImportStore', () => {
	it('runs a fetch and produces a preview', async () => {
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		await store.run('517d823a1a4d804218000052');
		expect(store.phase).toBe('preview');
		expect(store.result?.frameIds).toEqual(['rhino']);
		expect(store.result?.questIds).toEqual(['thewarwithin']);
	});

	it('rejects a malformed account id without fetching', async () => {
		const fetchProfile = vi.fn();
		const store = createImportStore(dataset, { fetchProfile });
		await store.run('not-an-id');
		expect(store.phase).toBe('error');
		expect(fetchProfile).not.toHaveBeenCalled();
	});

	it('surfaces a ProfileError message', async () => {
		const { ProfileError } = await import('./profileClient');
		const store = createImportStore(dataset, {
			fetchProfile: async () => { throw new ProfileError('nope', 'notFound'); },
		});
		await store.run('517d823a1a4d804218000052');
		expect(store.phase).toBe('error');
		expect(store.error).toBe('nope');
	});

	it('apply merges add-only into the tracker', async () => {
		const tracker = createTracker(frames);
		tracker.togglePart('rhino:neuroptics'); // pre-existing manual check not in the profile
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		await store.run('517d823a1a4d804218000052');
		store.apply(tracker, '517d823a1a4d804218000052', false);
		expect(tracker.isOwned('rhino:bp')).toBe(true); // from import
		expect(tracker.isOwned('rhino:chassis')).toBe(true); // from import
		expect(tracker.isOwned('rhino:neuroptics')).toBe(true); // preserved
		expect(tracker.isQuestDone('thewarwithin')).toBe(true);
		expect(store.phase).toBe('idle');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/import/importState.svelte.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/lib/import/importState.svelte.ts`:

```ts
import type { Dataset } from '$lib/model/types';
import type { Tracker } from '$lib/tracker/tracker.svelte';
import { fetchProfile as realFetch, ProfileError } from './profileClient';
import { parseProfile, type ImportResult } from './parseProfile';
import { normalizeAccountId } from './accountId';
import { loadAccountId, saveAccountId, clearAccountId } from '$lib/tracker/persistence';

type Phase = 'idle' | 'loading' | 'preview' | 'error';

export function createImportStore(
	dataset: Dataset,
	deps: { fetchProfile?: typeof realFetch } = {},
) {
	const fetchProfile = deps.fetchProfile ?? realFetch;
	let phase = $state<Phase>('idle');
	let result = $state<ImportResult | null>(null);
	let error = $state('');
	let rememberedId = $state<string | null>(null);

	async function init() {
		rememberedId = await loadAccountId();
	}

	async function run(rawId: string) {
		const id = normalizeAccountId(rawId);
		if (!id) {
			phase = 'error';
			error = "That doesn't look like a 24-character account ID.";
			return;
		}
		phase = 'loading';
		error = '';
		try {
			const profile = await fetchProfile(id);
			result = parseProfile(profile, dataset);
			phase = 'preview';
		} catch (e) {
			phase = 'error';
			error = e instanceof ProfileError ? e.message : 'Something went wrong. Please try again.';
		}
	}

	function apply(tracker: Tracker, rawId: string, remember: boolean) {
		if (!result) return;
		const parts = new Set(tracker.snapshot());
		for (const p of result.partIds) parts.add(p);
		tracker.load([...parts]);
		const quests = new Set(tracker.questSnapshot());
		for (const q of result.questIds) quests.add(q);
		tracker.loadQuestState([...quests]);

		const id = normalizeAccountId(rawId);
		if (remember && id) {
			rememberedId = id;
			void saveAccountId(id);
		}
		phase = 'idle';
		result = null;
	}

	function forget() {
		rememberedId = null;
		void clearAccountId();
	}

	function reset() {
		phase = 'idle';
		result = null;
		error = '';
	}

	return {
		init,
		run,
		apply,
		forget,
		reset,
		get phase() {
			return phase;
		},
		get result() {
			return result;
		},
		get error() {
			return error;
		},
		get rememberedId() {
			return rememberedId;
		},
	};
}
export type ImportStore = ReturnType<typeof createImportStore>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/import/importState.svelte.test.ts`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add src/lib/import/importState.svelte.ts src/lib/import/importState.svelte.test.ts
git commit -m "feat(import): orchestration store for fetch, preview, merge"
```

---

## Task 7: `ImportDialog.svelte`

**Files:**
- Create: `src/lib/import/ImportDialog.svelte`
- Test: `src/lib/import/ImportDialog.svelte.test.ts`

**Interfaces:**
- Consumes: `ImportStore` (Task 6), `Tracker`.
- Props: `{ store: ImportStore; tracker: Tracker; open: boolean; onclose: () => void }`.
- DOM hooks for tests/e2e: `[data-import-dialog]`, `[data-account-input]`, `[data-import-run]`, `[data-import-apply]`, `[data-import-remember]`, `[data-import-forget]`, `[data-import-error]`, `[data-import-preview]`.

- [ ] **Step 1: Write the failing test** — create `src/lib/import/ImportDialog.svelte.test.ts`:

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ImportDialog from './ImportDialog.svelte';
import { createImportStore } from './importState.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

function frame(id: string, uniqueName: string): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: ['bp', 'chassis'].map((slot) => ({ id: `${id}:${slot}`, frameId: id, slot: slot as never })),
	};
}
const frames = [frame('rhino', '/Lotus/Powersuits/Rhino/Rhino')];
const dataset = { warframes: frames, quests: [] } as unknown as Dataset;
const PROFILE: RawProfile = { loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] } };

function setup() {
	const tracker = createTracker(frames);
	const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
	render(ImportDialog, { store, tracker, open: true, onclose: vi.fn() });
	return { tracker };
}

describe('ImportDialog', () => {
	it('renders nothing when closed', () => {
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		render(ImportDialog, { store, tracker: createTracker(frames), open: false, onclose: vi.fn() });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('fetches, previews, and applies to the tracker', async () => {
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

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/import/ImportDialog.svelte.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `src/lib/import/ImportDialog.svelte`:

```svelte
<script lang="ts">
	import { tick } from 'svelte';
	import { trapFocus } from '$lib/actions/trapFocus';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import type { ImportStore } from './importState.svelte';

	let {
		store,
		tracker,
		open,
		onclose,
	}: {
		store: ImportStore;
		tracker: Tracker;
		open: boolean;
		onclose: () => void;
	} = $props();

	let value = $state('');
	let remember = $state(true);
	let closeBtn: HTMLButtonElement | undefined = $state();
	let prevFocus: HTMLElement | null = null;

	$effect(() => {
		if (open) {
			store.reset();
			value = store.rememberedId ?? '';
			prevFocus =
				typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
			tick().then(() => closeBtn?.focus());
		} else {
			prevFocus?.focus?.();
		}
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
	function doApply() {
		store.apply(tracker, value, remember);
		onclose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50" onclick={onBackdropClick} role="presentation"></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Import from account"
		data-import-dialog
		class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-wf-edge bg-wf-panel p-5"
		onkeydown={onKey}
		tabindex="-1"
		use:trapFocus
	>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-wf-gold">Import from account</h2>
			<button
				bind:this={closeBtn}
				data-import-close
				type="button"
				aria-label="Close import"
				class="text-wf-muted hover:text-wf-cyan"
				onclick={onclose}
			>
				✕
			</button>
		</div>

		<label class="text-sm text-wf-muted" for="account-id-input">Account ID</label>
		<input
			id="account-id-input"
			data-account-input
			bind:value
			type="text"
			autocomplete="off"
			spellcheck="false"
			placeholder="24-character account ID"
			class="w-full rounded border border-wf-edge bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-wf-muted focus:outline-none"
		/>

		<details class="rounded-lg border border-wf-edge p-3 text-xs text-wf-muted">
			<summary class="cursor-pointer text-wf-cyan">How to find your account ID</summary>
			<ol class="mt-2 list-decimal space-y-1 pl-4">
				<li>
					Open
					<a
						class="text-wf-cyan underline"
						href="https://www.warframe.com/api/user-data"
						target="_blank"
						rel="noopener noreferrer">warframe.com/api/user-data</a
					> and log in if prompted.
				</li>
				<li>Copy the value after <code>"user_id":</code> — a 24-character code.</li>
				<li>Paste it above.</li>
			</ol>
			<p class="mt-2">
				This is not your display name. Your account ID is a public in-game identifier and is not a
				password or login credential — we only send it to the profile API, and store it (if you
				allow) in your own browser.
			</p>
		</details>

		{#if store.phase === 'error'}
			<p data-import-error class="text-sm text-amber-300">{store.error}</p>
		{/if}

		{#if store.phase === 'preview' && store.result}
			<div data-import-preview class="rounded-lg border border-wf-edge p-3 text-sm text-slate-200">
				<p>
					<b class="text-wf-gold">{store.result.frameIds.length}</b> frames →
					<b class="text-wf-gold">{store.result.partIds.length}</b> parts
				</p>
				<p><b class="text-wf-gold">{store.result.questIds.length}</b> completed quests</p>
				{#if store.result.ownedUntrackedCount > 0}
					<p class="mt-1 text-xs text-wf-muted">
						{store.result.ownedUntrackedCount} owned frames aren't tracked farms (skipped).
					</p>
				{/if}
				<p class="mt-2 text-xs text-wf-muted">Applying only adds checks — nothing is un-checked.</p>
			</div>
			<label class="flex items-center gap-2 text-sm text-wf-muted">
				<input data-import-remember type="checkbox" bind:checked={remember} />
				Remember my account ID on this device
			</label>
			<button
				data-import-apply
				type="button"
				onclick={doApply}
				class="rounded border border-wf-cyan/40 bg-wf-cyan/10 px-3 py-1.5 text-sm text-wf-cyan"
			>
				Apply import
			</button>
		{:else}
			<button
				data-import-run
				type="button"
				disabled={store.phase === 'loading'}
				onclick={() => store.run(value)}
				class="rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan disabled:opacity-50"
			>
				{store.phase === 'loading' ? 'Fetching…' : 'Fetch my inventory'}
			</button>
		{/if}

		{#if store.rememberedId}
			<button
				data-import-forget
				type="button"
				onclick={() => store.forget()}
				class="self-start text-xs text-wf-muted underline hover:text-wf-cyan"
			>
				Forget saved account ID
			</button>
		{/if}
	</div>
{/if}
```

- [ ] **Step 4: Validate the component with the Svelte MCP autofixer**

Call the `svelte-autofixer` MCP tool on `src/lib/import/ImportDialog.svelte` and apply any correctness fixes it reports (re-run until clean). This matches the project's Svelte workflow.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/import/ImportDialog.svelte.test.ts`
Expected: PASS.

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add src/lib/import/ImportDialog.svelte src/lib/import/ImportDialog.svelte.test.ts
git commit -m "feat(import): import dialog with account-id help and preview"
```

---

## Task 8: Wire into the app (palette action, drawer section, page)

**Files:**
- Modify: `src/lib/palette/search.ts:3-9` (extend `PaletteItem` type)
- Modify: `src/lib/panel/SettingsDrawer.svelte` (add `onimport` prop + button)
- Modify: `src/routes/+page.svelte`
- Test: `e2e/import.test.ts`

**Interfaces:**
- Consumes: `createImportStore`/`ImportStore`, `ImportDialog`, everything above.
- Produces: a runnable end-to-end import flow.

- [ ] **Step 1: Write the failing e2e test** — create `e2e/import.test.ts`:

```ts
import { test, expect } from '@playwright/test';

const ID = '517d823a1a4d804218000052';

// A canned profile: owns Rhino (real dataset uniqueName folder) and has the
// War Within marker challenge.
const PROFILE = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
	challengeProgress: [{ name: 'TheWarWithin' }],
};

test('imports owned frames from an account profile', async ({ page }) => {
	await page.route('**/api.warframestat.us/profile/**', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PROFILE) }),
	);

	await page.goto('/');
	const readout = page.locator('header b');
	const part = page.locator('[data-part="rhino:chassis"]');
	await expect(readout).toHaveText(/^0\//);

	// Open via the command palette.
	await page.keyboard.press('Control+k');
	await page.locator('[role="combobox"]').fill('import');
	await page.keyboard.press('Enter');

	await expect(page.locator('[data-import-dialog]')).toBeVisible();
	await page.locator('[data-account-input]').fill(ID);
	await page.locator('[data-import-run]').click();

	await expect(page.locator('[data-import-preview]')).toBeVisible();
	await page.locator('[data-import-apply]').click();

	// Venus is selected by default → Rhino's card is visible; its parts are now owned.
	await expect(part).toHaveAttribute('data-owned', 'true');
	await expect(readout).not.toHaveText(/^0\//);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e import.test.ts`
Expected: FAIL — no `[data-import-dialog]` / no import palette action.

- [ ] **Step 3: Extend the palette item type** — in `src/lib/palette/search.ts`, widen the `type` union:

```ts
export type PaletteItem = {
	type: 'region' | 'frame' | 'resource' | 'action';
	id: string;
	label: string;
	sublabel: string;
	targetRegionId?: string;
};
```

(No other change to `search.ts` — action items are appended by the page, not by `buildPaletteItems`.)

- [ ] **Step 4: Add an import section to the settings drawer** — in `src/lib/panel/SettingsDrawer.svelte`, add `onimport` to the props type and destructuring:

```ts
	let {
		dataset,
		tracker,
		open,
		onclose,
		onimport,
	}: {
		dataset: Dataset;
		tracker: Tracker;
		open: boolean;
		onclose: () => void;
		onimport: () => void;
	} = $props();
```

and add this section directly above the existing `Tracking` section (before the `<section …>Reset tracked parts…</section>`):

```svelte
		<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
			<h2 class="mb-1 text-lg font-semibold text-wf-gold">Import from account</h2>
			<p class="mb-3 text-xs text-wf-muted">
				Seed your tracked frames and quests from your Warframe account.
			</p>
			<button
				data-open-import
				type="button"
				onclick={onimport}
				class="rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
			>
				Import from account…
			</button>
		</section>
```

- [ ] **Step 5: Wire the page** — in `src/routes/+page.svelte`:

Add imports (after the existing palette import):

```ts
	import ImportDialog from '$lib/import/ImportDialog.svelte';
	import { createImportStore, type ImportStore } from '$lib/import/importState.svelte';
```

Add state (near the other `$state` declarations):

```ts
	let importStore = $state<ImportStore | null>(null);
	let importOpen = $state(false);
```

In `onMount`, after `tracker = t;` (tracker is ready), create and init the store:

```ts
		importStore = createImportStore(ds);
		importStore.init();
```

Define the import action item and append it to the palette items. Add this constant in the `<script>`:

```ts
	const IMPORT_ACTION: PaletteItem = {
		type: 'action',
		id: 'import',
		label: 'Import from account',
		sublabel: 'Sync owned frames & quests',
	};
```

Change the `paletteItems` derived to append it:

```ts
	let paletteItems = $derived(
		data
			? [...buildPaletteItems(data, new Set(visible.map((r) => r.id))), IMPORT_ACTION]
			: ([] as PaletteItem[]),
	);
```

Handle the action in `handlePick`:

```ts
	function handlePick(item: PaletteItem) {
		if (item.type === 'action' && item.id === 'import') importOpen = true;
		else if (item.targetRegionId) selectedId = item.targetRegionId;
		else if (item.type === 'resource') goto(`${base}/guides/${item.id}`);
	}
```

Pass `onimport` to the settings drawer (update its usage):

```svelte
		<SettingsDrawer
			dataset={data}
			{tracker}
			open={settingsOpen}
			onclose={() => (settingsOpen = false)}
			onimport={() => {
				settingsOpen = false;
				importOpen = true;
			}}
		/>
```

Render the dialog (next to the `SettingsDrawer` block, inside the same `{#if data && tracker}`), guarded on the store:

```svelte
		{#if importStore}
			<ImportDialog
				store={importStore}
				{tracker}
				open={importOpen}
				onclose={() => (importOpen = false)}
			/>
		{/if}
```

- [ ] **Step 6: Validate touched Svelte files with the MCP autofixer**

Call `svelte-autofixer` on `src/lib/panel/SettingsDrawer.svelte` and `src/routes/+page.svelte`; apply reported correctness fixes.

- [ ] **Step 7: Update the existing SettingsDrawer test for the new required prop** — in `src/lib/panel/SettingsDrawer.svelte.test.ts`, add `onimport: vi.fn()` to every `render(SettingsDrawer, { … })` call (it's a required prop now). Then:

Run: `pnpm test:unit --run src/lib/panel/SettingsDrawer.svelte.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the full check + e2e**

Run: `pnpm check`
Expected: no type errors.

Run: `pnpm test:e2e import.test.ts`
Expected: PASS.

- [ ] **Step 9: Format and commit**

```bash
pnpm format
git add src/lib/palette/search.ts src/lib/panel/SettingsDrawer.svelte src/lib/panel/SettingsDrawer.svelte.test.ts src/routes/+page.svelte e2e/import.test.ts
git commit -m "feat(import): wire import dialog into palette and settings drawer"
```

---

## Final verification

- [ ] **Full unit suite**

Run: `pnpm test:unit --run`
Expected: all pass.

- [ ] **Full e2e suite**

Run: `pnpm test:e2e`
Expected: all pass.

- [ ] **Types + lint + format**

Run: `pnpm check && pnpm lint:check && pnpm format:check`
Expected: clean.

---

## Self-Review (completed during planning)

- **Spec coverage:** scope frames+quests (Tasks 3,6,8), preview-then-merge add-only (Task 6 `apply`, Task 7 preview), palette + drawer entry points (Task 8), remembered account ID with Forget (Tasks 5,6,7), direct CORS fetch (Task 4), all-or-nothing per frame (Task 3 folder→all parts), account-ID help panel + normalize paste (Tasks 2,7), corrected reassurance copy (Task 7), `uniqueName` retention (Task 1). Out-of-scope items (proxy, live sync, node import, full-JSON paste) are intentionally absent.
- **Placeholder scan:** none — every code step is complete.
- **Type consistency:** `RawProfile`/`ImportResult`/`ProfileError` defined in Tasks 3–4 and reused verbatim in 6–7; `createImportStore(dataset, deps)` and `apply(tracker, rawId, remember)` signatures match across Tasks 6–8; `Warframe.uniqueName?` (Task 1) is the key `frameFolder` reads (Task 3). `PaletteItem.type` extended in Task 8 before use.
