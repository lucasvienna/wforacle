import { test, expect } from '@playwright/test';

test('settings drawer opens and closes, quests panel embedded inside', async ({ page }) => {
	await page.goto('/');

	// SettingsDrawer renders nothing while closed, so the quest row shouldn't
	// exist in the DOM at all yet.
	const quest = page.locator('[data-quest="heartofdeimos"]');
	await expect(quest).toHaveCount(0);

	await page.locator('[data-open-settings]').click();

	const dialog = page.getByRole('dialog', { name: 'Settings' });
	await expect(dialog).toBeVisible();
	await expect(quest).toBeVisible();

	await page.keyboard.press('Escape');

	await expect(dialog).toBeHidden();
	await expect(quest).toHaveCount(0);
});

test('reset tracking clears a tracked part', async ({ page }) => {
	await page.goto('/');

	// Venus is selected by default, so the RegionPanel shows Rhino (Fossa/Jackal).
	const part = page.locator('[data-part="rhino:chassis"]');
	await expect(part).toHaveAttribute('data-owned', 'false');

	await part.click();
	await expect(part).toHaveAttribute('data-owned', 'true');

	await page.locator('[data-open-settings]').click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

	await page.locator('[data-reset-tracking]').click();
	await page.locator('[data-confirm-reset]').click();

	await page.locator('[data-close-settings]').click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();

	// Reset cleared every tracked part, so the row reverts to unowned.
	await expect(part).toHaveAttribute('data-owned', 'false');
});

test('search button opens the command palette', async ({ page }) => {
	await page.goto('/');

	await page.locator('[data-open-palette]').click();

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(page.getByRole('textbox')).toBeVisible();
});
