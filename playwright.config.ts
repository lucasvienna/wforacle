import { defineConfig } from '@playwright/test';

// In CI the app is built by a dedicated job and restored as an artifact, so we
// serve the prebuilt output directly instead of rebuilding it here.
const command = process.env.CI ? 'pnpm preview' : 'pnpm build && pnpm preview';

export default defineConfig({
	webServer: { command, port: 4173, reuseExistingServer: !process.env.CI },
	testDir: 'e2e',
	// A committed `test.only` would otherwise shrink the CI suite to one spec
	// and still report green.
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Without this the report CI uploads on failure contains no trace, no
	// screenshot, and no way to tell what the page looked like.
	use: { trace: 'on-first-retry' },
});
