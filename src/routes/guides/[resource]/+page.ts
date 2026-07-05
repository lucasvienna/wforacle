import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { Component } from 'svelte';
import type { PageLoad } from './$types';
// The full dataset is committed to static/ (see static/data/dataset.json) —
// importing it directly (rather than only via `fetch` in `load`) lets
// `entries()` below enumerate every resource id at build time.
import raw from '../../../../static/data/dataset.json';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === params.resource);
	if (!resource) throw error(404, 'Unknown resource');

	// Dynamically import the matching long-form guide if one has been
	// written; most resources only get the structured recommendations
	// below, and get `guide: null` here.
	const guides = import.meta.glob('/src/content/guides/*.svx');
	const key = `/src/content/guides/${params.resource}.svx`;
	const guide = key in guides ? ((await guides[key]()) as { default: Component }).default : null;

	return { resource, guide };
};

// SvelteKit's prerender crawler only discovers dynamic routes by following
// <a> links from other prerendered pages. The RegionPanel only links to
// resources that appear on a region (`regionIds.length > 0`) — Argon Crystal
// is a Void-only resource with `regionIds: []`, so it has no panel link and
// would 404 at `/guides/argoncrystal` without an explicit entries() list.
// Enumerate every resource id from the dataset so all of them prerender.
export function entries() {
	return raw.data.resources.map((r) => ({ resource: r.id }));
}
