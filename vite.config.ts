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
			exclude: ['**/*.test.ts', '**/*.svelte.test.ts', 'src/lib/data/seed.ts'],
		},
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
