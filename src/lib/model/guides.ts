import type { Dataset, Resource } from './types';
import { blurbFor } from '$lib/seo/blurb';

export interface GuideListEntry {
	id: string;
	name: string;
	blurb: string;
}

/**
 * The resources that have a farming guide, alphabetically, with their blurb.
 *
 * Shared by the /guides hub and llms.txt, which each had a byte-identical copy
 * of this projection (audit A4c). Drift between them would not have thrown —
 * it would have quietly published two different lists of guides, which is
 * exactly why this is worth one definition.
 */
export function guideResources(dataset: Dataset): GuideListEntry[] {
	return dataset.resources
		.filter((r: Resource) => r.recommendations.length > 0)
		.map((r: Resource) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}
