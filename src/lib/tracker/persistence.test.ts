import { describe, it, expect, beforeEach } from 'vitest';
import { loadOwned, saveOwned } from './persistence';

describe('persistence', () => {
	beforeEach(async () => {
		await saveOwned([]);
	});
	it('persists and reloads owned ids', async () => {
		await saveOwned(['rhino:bp', 'rhino:chassis']);
		expect((await loadOwned()).sort()).toEqual(['rhino:bp', 'rhino:chassis']);
	});
	it('returns empty when nothing stored', async () => {
		await saveOwned([]);
		expect(await loadOwned()).toEqual([]);
	});
});
