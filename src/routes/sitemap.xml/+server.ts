import { loadDataset } from '$lib/data/dataset';
import { latestLastVerified } from '$lib/seo/jsonld';
import { SITE_URL } from '$lib/seo/config';
import type { Dataset } from '$lib/model/types';
import type { RequestHandler } from './$types';

export const prerender = true;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// Deterministic "latest activity" date for the whole site, used as the
// <lastmod> for the home page and the guides hub — the newest lastVerified
// across every resource's recommendations. Never Date.now(): the page must
// prerender to identical output on every build.
function datasetLastVerified(ds: Dataset): string {
	return ds.resources.reduce((latest, resource) => {
		const resourceLatest = latestLastVerified(resource);
		return resourceLatest > latest ? resourceLatest : latest;
	}, '');
}

interface UrlEntry {
	loc: string;
	lastmod?: string;
}

function urlXml(entry: UrlEntry): string {
	const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
	return `\t<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
}

export const GET: RequestHandler = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const siteLastmod = datasetLastVerified(ds);

	const guides = ds.resources.filter((r) => r.recommendations.length > 0);

	const entries: UrlEntry[] = [
		{ loc: `${SITE_URL}/`, lastmod: siteLastmod },
		{ loc: `${SITE_URL}/guides`, lastmod: siteLastmod },
		...guides.map((resource) => ({
			loc: `${SITE_URL}/guides/${resource.id}`,
			lastmod: latestLastVerified(resource),
		})),
	];

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map(urlXml),
		'</urlset>',
	].join('\n');

	return new Response(body, {
		headers: { 'content-type': 'application/xml' },
	});
};
