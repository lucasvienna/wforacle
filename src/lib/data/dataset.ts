import { base } from '$app/paths';
import type { Dataset } from '$lib/model/types';

export async function loadDataset(fetchFn: typeof fetch = fetch): Promise<Dataset> {
	const res = await fetchFn(`${base}/data/dataset.json`);
	const payload = (await res.json()) as { version: string; data: Dataset };
	return payload.data;
}
