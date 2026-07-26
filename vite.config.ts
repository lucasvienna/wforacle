import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			extensions: ['.svelte', '.svx'],
			preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'] })],
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
			adapter: adapter(),
			// seed.ts is a 133-line test fixture. It lived in src/lib/data next to
			// the real loader, where it read as production code (audit Q4e); an
			// alias keeps the imports short without putting it back there.
			alias: { $fixtures: 'src/fixtures' },
			// CSP lives here rather than in _headers because SvelteKit injects
			// inline bootstrap scripts whose contents change with every build.
			// A hand-written `script-src 'self'` blocks them and the app renders
			// nothing — verified before this was written. `mode: 'hash'` makes
			// Kit compute those hashes itself, so they stay correct.
			//
			// Delivered as a <meta http-equiv> on the prerendered pages. That is
			// why frame-ancestors is NOT here: it is ignored in meta form, so
			// framing is denied by X-Frame-Options in _headers instead.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// The completion bar sets width via a style attribute, and
					// Svelte emits scoped <style> blocks.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					// The profile import calls warframestat.us directly from the
					// browser; the worldstate proxy is same-origin.
					'connect-src': ['self', 'https://api.warframestat.us'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none'],
					'manifest-src': ['self'],
					'worker-src': ['self'],
				},
			},
		}),
	],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts'],
		exclude: ['e2e/**', 'node_modules/**'],
		// Measured, not enforced: no thresholds. Coverage is here to show where
		// the untested single points of failure are, not to gate PRs on a number.
		coverage: {
			provider: 'v8',
			// text-summary for the job log; the two json reporters exist only so
			// the CI step can render the PR comment (json-summary = the totals
			// table, json = per-file uncovered lines). Output lands in coverage/,
			// which is gitignored.
			reporter: ['text-summary', 'json-summary', 'json'],
			// Extension-scoped: a bare `src/**` makes the provider try to parse
			// app.html and the .svx guide bodies as JS.
			include: ['src/**/*.{ts,svelte}', 'scripts/**/*.ts'],
			exclude: ['**/*.test.ts', '**/*.svelte.test.ts', 'src/fixtures/**'],
		},
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
