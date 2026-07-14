import { SITE_URL, DEFAULT_OG_IMAGE } from './config';
import { bestPhaseRec } from '$lib/model/resources';
import type { Resource } from '$lib/model/types';

export interface MetaInput {
	/** Full <title> text, caller-supplied (already includes brand where wanted). */
	title: string;
	description: string;
	/** Pathname, e.g. '/', '/guides', '/guides/neurodes'. */
	path: string;
	/** Defaults to DEFAULT_OG_IMAGE. */
	image?: string;
	/** Defaults to 'website'. */
	type?: 'website' | 'article';
}

export interface ResolvedMeta {
	title: string;
	description: string;
	/** Absolute URL. */
	canonical: string;
	/** Absolute URL. */
	image: string;
	type: 'website' | 'article';
}

function absoluteImage(image: string): string {
	return image.startsWith('/') ? SITE_URL + image : image;
}

export function buildMeta(input: MetaInput): ResolvedMeta {
	const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
	const canonical = SITE_URL + (path === '/' ? '/' : path);
	const image = absoluteImage(input.image ?? DEFAULT_OG_IMAGE);

	return {
		title: input.title,
		description: input.description,
		canonical,
		image,
		type: input.type ?? 'website',
	};
}

const MAX_DESCRIPTION_LENGTH = 160;

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/** Guide-detail meta description, built from the resource's top `early`
 * recommendation (falling back to its first recommendation, if any). */
export function guideDescription(resource: Resource): string {
	const rec = bestPhaseRec(resource, 'early') ?? resource.recommendations[0];
	const raw = rec
		? `Where to farm ${resource.name} in Warframe — best early and late-game locations. Top pick: ${rec.nodeLabel}.`
		: `Where to farm ${resource.name} in Warframe — best early and late-game locations.`;

	return normalizeWhitespace(raw).slice(0, MAX_DESCRIPTION_LENGTH);
}
