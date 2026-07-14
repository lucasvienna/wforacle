import { describe, it, expect } from 'vitest';
import { GET } from './+server';
import { SITE_URL } from '$lib/seo/config';

describe('robots.txt', () => {
	it('serves allow-all rules and a SITE_URL-based sitemap reference', async () => {
		const res = await GET({} as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/plain');

		const body = await res.text();
		expect(body).toContain('User-agent: *');
		expect(body).toContain('Disallow:');
		// The sitemap URL is derived from SITE_URL (not hard-coded), so an
		// override via PUBLIC_SITE_URL flows through here too.
		expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
	});
});
