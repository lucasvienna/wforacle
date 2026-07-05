import { test, expect } from '@playwright/test';

test('tracking a part persists across reload', async ({ page }) => {
	await page.goto('/');

	// The completion readout renders "Node Frames <b>{owned} / {total}</b>" —
	// scope to the <b> inside the header so we assert the count unambiguously
	// instead of matching text split across parent/child nodes.
	// The total (48 parts across the 12 node-linked frames in the real dataset)
	// is intentionally not hardcoded here — we only assert the owned count
	// moves 0 -> 1, so this test doesn't need updating if the dataset grows.
	const readout = page.locator('header b');
	const part = page.locator('[data-part="rhino:chassis"]');

	await expect(readout).toHaveText(/^0 \//);
	await expect(part).toHaveAttribute('data-owned', 'false');

	// Venus is selected by default, so the RegionPanel shows Rhino (Fossa/Jackal).
	await part.click();

	await expect(readout).toHaveText(/^1 \//);
	await expect(part).toHaveAttribute('data-owned', 'true');

	await page.reload();

	// Proves the toggle survived the reload via IndexedDB, not just in-memory state.
	await expect(readout).toHaveText(/^1 \//);
	await expect(part).toHaveAttribute('data-owned', 'true');
});

test('works offline after first load (service worker)', async ({ page, context }) => {
	await page.goto('/');
	// Scoped to the star chart SVG: RegionPanel also renders a "Venus" region
	// heading now (multi-frame regions need it to label the block of frames),
	// and Playwright text matching is case-insensitive, so an unscoped
	// getByText('VENUS') would match both and fail the strict-mode check.
	const starChartVenus = page.locator('svg').getByText('VENUS');
	await expect(starChartVenus).toBeVisible(); // data cached by SW

	// Wait for the service worker to install, activate (skipWaiting +
	// clients.claim() in src/service-worker.ts), and take control of this
	// page — a fixed timeout is flaky because it races the install handler's
	// caches.addAll(); polling for `controller` waits for the real signal.
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	await context.setOffline(true);
	await page.reload();
	await expect(starChartVenus).toBeVisible(); // served from cache
	await context.setOffline(false);
});
