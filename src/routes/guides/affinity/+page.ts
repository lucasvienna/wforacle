import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { PageLoad } from './$types';

export const prerender = true;

// Static route: overrides the dynamic [resource] guide page for affinity only.
// The dataset entry still drives cards, hub listing, sitemap and panel links;
// [resource]'s entries() excludes 'affinity' so this path prerenders once.
export const load: PageLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === 'affinity');
	if (!resource) throw error(404, 'Affinity guide data missing from dataset');
	return { resource };
};
