import { defineConfig } from '@playwright/test';

// In CI the app is built by a dedicated job and restored as an artifact, so we
// serve the prebuilt output directly instead of rebuilding it here.
const command = process.env.CI ? 'pnpm preview' : 'pnpm build && pnpm preview';

export default defineConfig({
	webServer: { command, port: 4173, reuseExistingServer: !process.env.CI },
	testDir: 'e2e',
});
