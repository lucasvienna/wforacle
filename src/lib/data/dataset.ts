import { asset } from '$app/paths';
import type { Dataset } from '$lib/model/types';

/**
 * Load the shipping dataset.
 *
 * Throws descriptively rather than returning a half-built object: this is the
 * app's single point of failure, and every caller is better off with a loud
 * error than with `undefined` propagating into the UI. The client caller
 * renders a retry (+page.svelte); the prerender-time callers (+page.server.ts,
 * sitemap.xml, llms.txt) should fail the build, which they now do.
 *
 * The shape check is deliberately a sanity check, not schema validation — the
 * project carries no runtime validator by design (docs/revamp/03-strategy.md).
 * It exists to catch the failure that actually happens: a well-formed JSON
 * response that isn't the dataset (an SPA fallback page, an error envelope, an
 * empty object), which would otherwise sail through `res.ok` and surface much
 * later as "regions is undefined".
 */
export async function loadDataset(fetchFn: typeof fetch = fetch): Promise<Dataset> {
	const res = await fetchFn(asset('/data/dataset.json'));
	if (!res.ok) throw new Error(`dataset fetch failed: HTTP ${res.status}`);
	const payload = (await res.json()) as { version?: string; data?: Dataset } | null;
	const data = payload?.data;
	if (!data || !Array.isArray(data.regions) || data.regions.length === 0)
		throw new Error('dataset payload has no regions');
	return data;
}
