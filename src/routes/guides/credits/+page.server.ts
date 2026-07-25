import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { PageServerLoad } from './$types';

export const prerender = true;

// Static route: overrides the dynamic [resource] guide page for credits only.
// The dataset entry still drives cards, hub listing, sitemap and panel links;
// [resource]'s entries() excludes 'credits' so this path prerenders once.
//
// Server (not universal) load, for the same reason as [resource]: a universal
// load's fetch of dataset.json gets serialised into the prerendered HTML as a
// data-sveltekit-fetched replay blob. This page was the largest in the whole
// build because of it.
export const load: PageServerLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === 'credits');
	if (!resource) throw error(404, 'Credits guide data missing from dataset');
	return { resource };
};
