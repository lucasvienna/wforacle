import { describe, it, expect, beforeEach } from 'vitest';
import {
	loadOwned,
	saveOwned,
	loadQuests,
	saveQuests,
	loadAccountId,
	saveAccountId,
	clearAccountId,
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

describe('account id persistence', () => {
	it('round-trips and clears the account id', async () => {
		expect(await loadAccountId()).toBeNull();
		await saveAccountId('517d823a1a4d804218000052');
		expect(await loadAccountId()).toBe('517d823a1a4d804218000052');
		await clearAccountId();
		expect(await loadAccountId()).toBeNull();
	});
});
