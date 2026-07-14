import { test, expect } from '@playwright/test';

test('Ctrl-K palette jumps to a region', async ({ page }) => {
	await page.goto('/');

	// Chart scoping mirrors spoiler/tracking specs: RegionPanel also renders
	// region names as headings, so unscoped text lookups hit strict mode.
	await expect(page.locator('svg').getByText('VENUS')).toBeVisible();

	await page.keyboard.press('Control+k');
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Mars isn't the default selection (Venus is), so picking it proves the
	// palette actually drives the RegionPanel rather than a no-op.
	await page.getByRole('combobox').fill('Mars');
	const regionResult = page.locator('[data-palette-item][data-type="region"]').first();
	await expect(regionResult).toBeVisible();

	await page.keyboard.press('Enter');
	await expect(dialog).toBeHidden();

	// RegionPanel renders the region name as an <h2>; scope to level 2 since the
	// prerendered "Browse the Star Chart" directory also renders "Mars" as an
	// <h3>, and a second RegionPanel heading ("Resources on Mars") shares the
	// substring — so exact match alone still resolves to multiple headings.
	await expect(page.getByRole('heading', { name: 'Mars', exact: true, level: 2 })).toBeVisible();
});

test('Ctrl-K palette navigates to a resource guide', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('svg').getByText('VENUS')).toBeVisible();

	await page.locator('[data-open-palette]').click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	await page.getByRole('combobox').fill('Ferrite');
	const resourceResult = page.locator('[data-palette-item][data-type="resource"]').first();
	await expect(resourceResult).toBeVisible();

	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/guides\/ferrite$/);
});
