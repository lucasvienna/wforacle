import type { Handle } from '@sveltejs/kit';

/**
 * Security headers for Worker-served responses.
 *
 * The `_headers` file only covers static-asset responses, so /api/worldstate —
 * the single dynamic route — was coming back with just content-type and
 * cache-control. Verified against the deployed preview before this existed.
 *
 * `nosniff` is the one that matters for a JSON endpoint: it stops a browser
 * content-sniffing the body into something executable. The other two cost
 * nothing and keep every response the app serves consistent, whichever
 * mechanism delivers it.
 *
 * No CSP here: this route returns JSON, and the pages get theirs from kit.csp
 * as a meta tag. This hook never sees a page — they are all prerendered.
 */
const HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'x-frame-options': 'DENY',
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(HEADERS)) response.headers.set(name, value);
	return response;
};
