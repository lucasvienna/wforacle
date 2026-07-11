import { test, expect } from '@playwright/test';

test('Equinox aspects track and persist (Uranus, Titania)', async ({ page }) => {
	await page.goto('/');

	// Chart scoping mirrors spoiler.test.ts / tracking.test.ts: RegionPanel
	// also renders region names as headings, so unscoped getByText would hit
	// the strict-mode check.
	const venus = page.locator('svg').getByText('VENUS');
	await expect(venus).toBeVisible();

	await page.locator('svg [data-region="uranus"]').click();

	const dayAspect = page.locator('[data-part="equinox:dayaspect"]');
	const nightAspect = page.locator('[data-part="equinox:nightaspect"]');

	await expect(dayAspect).toBeVisible();
	await expect(nightAspect).toBeVisible();
	await expect(dayAspect.getByText('Day Aspect')).toBeVisible();
	await expect(nightAspect.getByText('Night Aspect')).toBeVisible();

	await expect(dayAspect).toHaveAttribute('data-owned', 'false');
	await dayAspect.click();
	await expect(dayAspect).toHaveAttribute('data-owned', 'true');

	await page.reload();

	// Proves the toggle survived the reload via IndexedDB, not just
	// in-memory state. Uranus isn't selected by default after reload, so
	// re-select it before re-checking the part.
	await expect(venus).toBeVisible();
	await page.locator('svg [data-region="uranus"]').click();
	await expect(page.locator('[data-part="equinox:dayaspect"]')).toHaveAttribute(
		'data-owned',
		'true',
	);
});

test('Mesa and Atlas render with the key-boss hint on Eris', async ({ page }) => {
	await page.goto('/');

	const venus = page.locator('svg').getByText('VENUS');
	await expect(venus).toBeVisible();

	await page.locator('svg [data-region="eris"]').click();

	const mesaChassis = page.locator('[data-part="mesa:chassis"]');
	const atlasChassis = page.locator('[data-part="atlas:chassis"]');

	await expect(mesaChassis).toBeVisible();
	await expect(atlasChassis).toBeVisible();

	// Both Mesa (Mutalist Alad V) and Atlas (Jordas Golem) are curated
	// key-boss nodes, so the "· key" hint should render for each.
	await expect(page.locator('[data-key]')).toHaveCount(2);
});

test('special-region resource cards show signature resources', async ({ page }) => {
	await page.goto('/');

	const venus = page.locator('svg').getByText('VENUS');
	await expect(venus).toBeVisible();

	// The quest toggles now live in the settings drawer (Plan 7), not on the
	// page body, so it must be opened first.
	await page.locator('[data-open-settings]').click();
	await expect(page.locator('[data-quest="theseconddream"]')).toBeVisible();

	await page.locator('[data-quest="theseconddream"]').click();
	await page.locator('[data-quest="thewarwithin"]').click();
	await page.locator('[data-quest="angelsofthezariman"]').click();

	// The drawer's full-screen backdrop (z-40) would intercept clicks on the
	// chart behind it, so close the drawer before interacting with the SVG.
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();

	// Lua
	await page.locator('svg [data-region="lua"]').click();
	await expect(page.getByText('Somatic Fibers')).toBeVisible();

	// Kuva Fortress — "Kuva" as bare text is ambiguous against "Kuva
	// Fortress" (chart label, region heading), so scope to the guide link
	// for the Kuva resource card, which is unambiguous.
	await page.locator('svg [data-region="kuvafortress"]').click();
	await expect(page.locator('a[href$="/guides/kuva"]')).toBeVisible();

	// Zariman
	await page.locator('svg [data-region="zariman"]').click();
	await expect(page.getByText('Voidgel Orb')).toBeVisible();
	await expect(page.getByText('Entrati Lanthorn')).toBeVisible();
});
