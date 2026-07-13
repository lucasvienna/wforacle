// `$env/dynamic/public` is the right tool for a build-time-overridable public
// value on a fully prerendered site: it resolves from the real server/build
// environment during SSR/prerender and from the hydration payload in the
// browser. It relies on SvelteKit's request/hydration bootstrap though, so it
// throws when this module is imported outside of that (e.g. by a unit test
// importing `$lib/seo/config` directly). Import it dynamically so that case
// can fall back to the empty env below instead of crashing the whole module.
let publicEnv: Record<string, string | undefined> = {};
try {
	({ env: publicEnv } = await import('$env/dynamic/public'));
} catch {
	// Not running inside a SvelteKit request/hydration context (e.g. vitest
	// importing this module directly) -- keep the production default below.
}

export const SITE_URL = publicEnv.PUBLIC_SITE_URL || 'https://wforacle.avyiel.dev';
export const SITE_NAME = 'wforacle';
export const DEFAULT_DESCRIPTION =
	'Track your Warframe Star Chart progress and find the best resource-farming locations for every planet, boss, and Warframe part.';
export const DEFAULT_OG_IMAGE = '/og.png';
