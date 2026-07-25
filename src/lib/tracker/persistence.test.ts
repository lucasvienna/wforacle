import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	loadOwned,
	saveOwned,
	loadQuests,
	saveQuests,
	loadAccountId,
	saveAccountId,
	clearAccountId,
	persist,
} from './persistence';

describe('persistence', () => {
	beforeEach(async () => {
		await saveOwned([]);
		await saveQuests([]);
	});
	it('persists and reloads owned ids', async () => {
		await saveOwned(['rhino:bp', 'rhino:chassis']);
		expect((await loadOwned()).sort()).toEqual(['rhino:bp', 'rhino:chassis']);
	});
	it('returns empty when nothing stored', async () => {
		await saveOwned([]);
		expect(await loadOwned()).toEqual([]);
	});
	it('persists and reloads completed quest ids', async () => {
		await saveQuests(['heartofdeimos']);
		expect(await loadQuests()).toEqual(['heartofdeimos']);
	});
	it('returns empty when no quests stored', async () => {
		await saveQuests([]);
		expect(await loadQuests()).toEqual([]);
	});
});

describe('persist (fire-and-forget writes)', () => {
	afterEach(() => vi.restoreAllMocks());

	it('logs a rejected write instead of dropping it', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		persist('saving owned parts', Promise.reject(new Error('QuotaExceededError')));
		await vi.waitFor(() => expect(spy).toHaveBeenCalled());

		const logged = spy.mock.calls.flat().join(' ');
		expect(logged).toContain('owned parts');
	});

	it('leaves no unhandled rejection behind', async () => {
		// The actual regression being guarded. These writes run from a $effect
		// and a click handler with nothing above them to catch — a dropped
		// promise means the user's progress silently fails to save, with the
		// only evidence an unhandledrejection nobody is listening for.
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);

		try {
			persist('saving owned parts', Promise.reject(new Error('blocked IDB')));
			// Two macrotask turns: Node reports unhandled rejections after the
			// microtask queue drains, so a same-tick assertion would pass even
			// with a genuinely dropped promise.
			await new Promise((r) => setTimeout(r, 0));
			await new Promise((r) => setTimeout(r, 0));

			expect(unhandled).not.toHaveBeenCalled();
			expect(spy).toHaveBeenCalled();
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});
});

describe('account id persistence', () => {
	it('round-trips and clears the account id', async () => {
		expect(await loadAccountId()).toBeNull();
		await saveAccountId('517d823a1a4d804218000052');
		expect(await loadAccountId()).toBe('517d823a1a4d804218000052');
		await clearAccountId();
		expect(await loadAccountId()).toBeNull();
	});
});
