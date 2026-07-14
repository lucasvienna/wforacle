import { PUBLIC_SITE_URL } from '$env/static/public';

// `$env/static/public` inlines the value at BUILD time (no `/_app/env.js`
// runtime fetch), so canonical/OG/sitemap URLs are baked into the prerendered
// output and the client stays offline-capable. Static env requires the var to
// exist at build, so a committed `.env` supplies the production default;
// setting `PUBLIC_SITE_URL` in the environment (preview/staging/CI) overrides
// it. The `|| fallback` also guards an explicitly-empty value.
export const SITE_URL = PUBLIC_SITE_URL || 'https://wforacle.avyiel.dev';
export const SITE_NAME = 'wforacle';
export const DEFAULT_DESCRIPTION =
	'Track your Warframe Star Chart progress and find the best resource-farming locations for every planet, boss, and Warframe part.';
export const DEFAULT_OG_IMAGE = '/og.png';
