import type { Dataset } from '$lib/model/types';
import { blurbFor } from './blurb';

export interface GuideListEntry {
	id: string;
	name: string;
	blurb: string;
}

/**
 * The resources that have a farming guide, alphabetically, with their blurb.
 *
 * Lives in seo/ rather than model/ because it is a presentation projection —
 * it pulls in blurbFor. Putting it in model/ made that directory depend on
 * seo/, inverting the direction every other model module follows.
 *
 * Shared by the /guides hub and llms.txt, which each had a byte-identical copy
 * of this projection (audit A4c). Drift between them would not have thrown —
 * it would have quietly published two different lists of guides, which is
 * exactly why this is worth one definition.
 */
export function guideResources(dataset: Dataset): GuideListEntry[] {
	return dataset.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}
