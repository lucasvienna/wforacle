import { loadDataset } from '$lib/data/dataset';
import { guideResources } from '$lib/model/guides';
import type { PageServerLoad } from './$types';

export const prerender = true;

// Server (not universal) load: returning only the compact `{ guides }` list
// keeps the full dataset.json out of the prerendered /guides HTML. A universal
// +page.ts here would embed the ~132KB dataset as a data-sveltekit-fetched
// replay blob (the same issue fixed on the home page).
export const load: PageServerLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const guides = guideResources(ds);

	return { guides };
};
