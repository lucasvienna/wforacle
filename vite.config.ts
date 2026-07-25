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
			// Summary only — nothing is written to disk for CI to collect.
			reporter: ['text-summary'],
			// Extension-scoped: a bare `src/**` makes the provider try to parse
			// app.html and the .svx guide bodies as JS.
			include: ['src/**/*.{ts,svelte}', 'scripts/**/*.ts'],
			exclude: ['**/*.test.ts', '**/*.svelte.test.ts', 'src/lib/data/seed.ts'],
		},
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
