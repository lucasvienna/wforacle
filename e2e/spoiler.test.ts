import { test, expect } from '@playwright/test';

test('spoiler reveal (Deimos → Nekros) persists', async ({ page }) => {
	await page.goto('/');

	// Chart scoping mirrors tracking.test.ts: RegionPanel also renders region
	// names as headings, so unscoped getByText would hit the strict-mode check.
	const venus = page.locator('svg').getByText('VENUS');
	const deimos = page.locator('svg').getByText('DEIMOS');

	await expect(venus).toBeVisible();
	// Deimos is spoiler-gated behind the "Heart of Deimos" quest, which is not
	// completed by default, so it must not render on the chart yet.
	await expect(deimos).toHaveCount(0);

	// The quest toggle now lives in the settings drawer (Plan 7), not on the
	// page body, so it must be opened first.
	await page.locator('[data-open-settings]').click();
	const quest = page.locator('[data-quest="heartofdeimos"]');
	await expect(quest).toBeVisible();
	await quest.click();

	// The drawer's full-screen backdrop (z-40) would intercept clicks on the
	// chart behind it, so close the drawer before interacting with the SVG.
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();

	// Toggling the quest reveals Deimos on the chart.
	await expect(deimos).toBeVisible();

	await page.locator('svg [data-region="deimos"]').click();
	await expect(page.locator('[data-part="nekros:chassis"]')).toBeVisible();

	await page.reload();

	// Proves the quest toggle survived the reload via IndexedDB, not just
	// in-memory state, so Deimos stays revealed.
	await expect(venus).toBeVisible();
	await expect(deimos).toBeVisible();
});
