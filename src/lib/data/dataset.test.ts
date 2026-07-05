import { describe, it, expect, vi } from 'vitest';
import { loadDataset } from './dataset';
import { seed } from './seed';

describe('loadDataset', () => {
	it('fetches and unwraps the dataset payload', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue({ json: () => Promise.resolve({ version: 'x', data: seed }) });
		const ds = await loadDataset(fetchFn as unknown as typeof fetch);
		expect(ds.regions[0].name).toBeTruthy();
		expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/data/dataset.json'));
	});
});
