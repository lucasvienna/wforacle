import { SITE_URL } from '$lib/seo/config';
import type { RequestHandler } from './$types';

export const prerender = true;

// robots.txt is generated (not a static asset) so its Sitemap directive tracks
// SITE_URL, staying consistent with the canonical/sitemap URLs — all of which
// are overridable via PUBLIC_SITE_URL for preview/staging builds.
export const GET: RequestHandler = () => {
	const body = `# allow crawling everything by default
User-agent: *
Disallow:

Sitemap: ${SITE_URL}/sitemap.xml
`;
	return new Response(body, {
		headers: { 'content-type': 'text/plain' },
	});
};
