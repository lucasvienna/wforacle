import { bestPhaseRec } from '$lib/model/resources';
import type { Resource } from '$lib/model/types';

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
export function blurbFor(resource: Resource): string {
	const rec = bestPhaseRec(resource, 'early') ?? resource.recommendations[0];
	const note = rec ? normalize(rec.note) : '';
	const text = note.length > 0 ? note : `Best places to farm ${resource.name}.`;
	return truncate(text, BLURB_MAX_LENGTH);
}
