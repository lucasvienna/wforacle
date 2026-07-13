import { loadDataset } from '$lib/data/dataset';
import { bestPhaseRec } from '$lib/model/resources';
import type { Resource } from '$lib/model/types';
import type { PageLoad } from './$types';

export const prerender = true;

const BLURB_MAX_LENGTH = 120;

function normalize(text: string): string {
	return text.trim().replace(/\s+/g, ' ');
}

function truncate(text: string, maxLength: number): string {
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// Prefer the earliest `early`-phase recommendation's note (that's what most
// players want first); fall back to the first recommendation of any phase,
// then to a generic sentence if every note is blank.
function blurbFor(resource: Resource): string {
	const rec = bestPhaseRec(resource, 'early') ?? resource.recommendations[0];
	const note = rec ? normalize(rec.note) : '';
	const text = note.length > 0 ? note : `Best places to farm ${resource.name}.`;
	return truncate(text, BLURB_MAX_LENGTH);
}

export const load: PageLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const guides = ds.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { guides };
};
