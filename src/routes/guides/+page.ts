import { loadDataset } from '$lib/data/dataset';
import { blurbFor } from '$lib/seo/blurb';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const guides = ds.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { guides };
};
