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
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
