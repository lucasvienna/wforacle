import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { Component } from 'svelte';
import type { PageLoad } from './$types';

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
//
// Only resources with a curated recommendation get a guide page (Argon Crystal
// has recs but no panel link — regionIds: [] — so it still needs an explicit
// entry). Informational-only resources (Ferrite, Salvage, …) have no guide and
// aren't linked from the panel, so they are not prerendered here.
//
// The dataset is imported dynamically (rather than as a top-level static
// import) so Vite treats it as build-time-only: a static import in this
// universal load module would get bundled into the client-side guides chunk,
// duplicating the dataset that `load()` already `fetch`es at runtime.
export async function entries() {
	const raw = (await import('../../../../static/data/dataset.json')).default;
	return raw.data.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ resource: r.id }));
}
