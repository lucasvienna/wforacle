import { loadDataset } from '$lib/data/dataset';
import { blurbFor } from '$lib/seo/blurb';
import type { PageServerLoad } from './$types';

export const prerender = true;

// Server (not universal) load: returning only the compact `{ guides }` list
// keeps the full dataset.json out of the prerendered /guides HTML. A universal
// +page.ts here would embed the ~132KB dataset as a data-sveltekit-fetched
// replay blob (the same issue fixed on the home page).
export const load: PageServerLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const guides = ds.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { guides };
};
