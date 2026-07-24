import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { PageLoad } from './$types';

export const prerender = true;

// Static route: overrides the dynamic [resource] guide page for credits only.
// The dataset entry still drives cards, hub listing, sitemap and panel links;
// [resource]'s entries() excludes 'credits' so this path prerenders once.
export const load: PageLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === 'credits');
	if (!resource) throw error(404, 'Credits guide data missing from dataset');
	return { resource };
};
