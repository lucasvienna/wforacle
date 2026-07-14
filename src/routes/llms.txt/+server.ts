import { loadDataset } from '$lib/data/dataset';
import { blurbFor } from '$lib/seo/blurb';
import { SITE_URL, DEFAULT_DESCRIPTION } from '$lib/seo/config';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const guides = ds.resources
		.filter((r) => r.recommendations.length > 0)
		.map((r) => ({ id: r.id, name: r.name, blurb: blurbFor(r) }))
		.sort((a, b) => a.name.localeCompare(b.name));

	const lines = [
		'# wforacle',
		'',
		DEFAULT_DESCRIPTION,
		'',
		`- [Home](${SITE_URL}/)`,
		`- [Farming Guides](${SITE_URL}/guides)`,
		'',
		'## Farming Guides',
		'',
		...guides.map((g) => `- [${g.name} farming guide](${SITE_URL}/guides/${g.id}): ${g.blurb}`),
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
};
