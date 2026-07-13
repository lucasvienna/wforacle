import { SITE_URL, DEFAULT_OG_IMAGE } from './config';

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
