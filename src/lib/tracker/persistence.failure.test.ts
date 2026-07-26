import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Failure paths for the IndexedDB layer (audit T4). These live in their own
 * file because they need `idb` mocked at module scope, which would break the
 * happy-path round-trip tests in persistence.test.ts that use the real
 * fake-indexeddb.
 *
 * The two failures that actually happen in the wild: a blocked database
 * (private browsing, Firefox strict mode) and an exhausted quota.
 */
const idb = vi.hoisted(() => ({ openDB: vi.fn() }));
vi.mock('idb', () => idb);

// persistence.ts memoises its open-database promise at module scope, so each
// test needs a fresh copy of the module rather than a shared one.
async function freshPersistence() {
	vi.resetModules();
	return import('./persistence');
}

beforeEach(() => {
	idb.openDB.mockReset();
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe('a blocked IndexedDB', () => {
	beforeEach(() => {
		idb.openDB.mockImplementation(() =>
			Promise.reject(new DOMException('database blocked', 'InvalidStateError')),
		);
	});

	it('rejects a read instead of silently returning empty state', async () => {
		// Returning [] here would look identical to "new user with no progress",
		// which is the worst possible failure mode: it invites the app to
		// overwrite real saved data with nothing.
		const { loadOwned } = await freshPersistence();
		await expect(loadOwned()).rejects.toThrow(/blocked/i);
	});

	it('rejects a write', async () => {
		const { saveOwned } = await freshPersistence();
		await expect(saveOwned(['rhino:bp'])).rejects.toThrow(/blocked/i);
	});

	it('is logged rather than dropped when it goes through persist()', async () => {
		// The pairing that matters: the write rejects, and persist() is what
		// stops that becoming an unhandled rejection nobody ever sees.
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { persist, saveOwned } = await freshPersistence();

		persist('saving owned parts', saveOwned(['rhino:bp']));
		await vi.waitFor(() => expect(spy).toHaveBeenCalled());

		expect(spy.mock.calls.flat().join(' ')).toContain('saving owned parts');
	});
});

describe('an exhausted quota', () => {
	beforeEach(() => {
		idb.openDB.mockResolvedValue({
			get: vi.fn().mockResolvedValue(['rhino:bp']),
			put: vi.fn().mockRejectedValue(new DOMException('quota exceeded', 'QuotaExceededError')),
			delete: vi.fn().mockRejectedValue(new DOMException('quota exceeded', 'QuotaExceededError')),
		});
	});

	it('rejects the write', async () => {
		const { saveQuests } = await freshPersistence();
		await expect(saveQuests(['heartofdeimos'])).rejects.toThrow(/quota/i);
	});

	it('still serves reads — a full database can be read, just not written', async () => {
		const { loadOwned } = await freshPersistence();
		await expect(loadOwned()).resolves.toEqual(['rhino:bp']);
	});

	it('is logged rather than dropped when it goes through persist()', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { persist, saveAccountId } = await freshPersistence();

		persist('saving account id', saveAccountId('517d823a1a4d804218000052'));
		await vi.waitFor(() => expect(spy).toHaveBeenCalled());

		expect(spy.mock.calls.flat().join(' ')).toContain('saving account id');
	});
});

describe('server-side rendering (no IndexedDB at all)', () => {
	// The `!browser && typeof indexedDB === 'undefined'` guard on every function
	// is what keeps prerendering from crashing. It never fires under the normal
	// test setup because fake-indexeddb defines a global, so it sat uncovered —
	// and an unexercised SSR guard is exactly the kind that quietly stops
	// working.
	beforeEach(() => {
		vi.doMock('$app/environment', () => ({ browser: false }));
		vi.stubGlobal('indexedDB', undefined);
	});
	afterEach(() => {
		vi.doUnmock('$app/environment');
		vi.unstubAllGlobals();
	});

	it('returns empty defaults from reads without opening a database', async () => {
		const { loadOwned, loadQuests, loadAccountId } = await freshPersistence();

		await expect(loadOwned()).resolves.toEqual([]);
		await expect(loadQuests()).resolves.toEqual([]);
		await expect(loadAccountId()).resolves.toBeNull();
		expect(idb.openDB).not.toHaveBeenCalled();
	});

	it('makes writes a no-op rather than throwing', async () => {
		const { saveOwned, saveQuests, saveAccountId, clearAccountId } = await freshPersistence();

		await expect(saveOwned(['rhino:bp'])).resolves.toBeUndefined();
		await expect(saveQuests(['heartofdeimos'])).resolves.toBeUndefined();
		await expect(saveAccountId('517d823a1a4d804218000052')).resolves.toBeUndefined();
		await expect(clearAccountId()).resolves.toBeUndefined();
		expect(idb.openDB).not.toHaveBeenCalled();
	});
});
