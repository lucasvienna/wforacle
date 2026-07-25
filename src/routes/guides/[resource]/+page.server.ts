import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { PageServerLoad } from './$types';

export const prerender = true;

// Server (not universal) load: returning only the compact `{ resource }` keeps
// the full dataset.json out of the prerendered HTML. The universal +page.ts
// this replaced fetched the dataset during prerender, and SvelteKit serialises
// anything a universal load fetches into the page as a data-sveltekit-fetched
// replay blob — so every one of these pages shipped its own ~190KB copy of the
// whole dataset (tellurium.html was 217KB against a 23KB home page).
//
// Same fix already applied at src/routes/+page.server.ts and
// src/routes/guides/+page.server.ts; this route was the one that got missed.
export const load: PageServerLoad = async ({ params, fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === params.resource);
	if (!resource) throw error(404, 'Unknown resource');

	return { resource };
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
// import) so Vite treats it as build-time-only.
export async function entries() {
	const raw = (await import('../../../../static/data/dataset.json')).default;
	return (
		raw.data.resources
			// credits and affinity have curated recommendations but their pages
			// are bespoke static routes (src/routes/guides/{credits,affinity}) —
			// listing them here would prerender those paths from both routes.
			.filter((r) => r.recommendations.length > 0 && r.id !== 'credits' && r.id !== 'affinity')
			.map((r) => ({ resource: r.id }))
	);
}
