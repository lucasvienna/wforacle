import { test, expect } from '@playwright/test';

const ID = '517d823a1a4d804218000052';

// A canned profile: owns Rhino (real dataset uniqueName folder) and has the
// War Within marker challenge.
const PROFILE = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
	challengeProgress: [{ name: 'TheWarWithin' }],
};

test('imports owned frames from an account profile', async ({ page }) => {
	await page.route('**/api.warframestat.us/profile/**', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PROFILE) }),
	);

	await page.goto('/');
	const readout = page.locator('header b');
	const part = page.locator('[data-part="rhino:chassis"]');
	await expect(readout).toHaveText(/^0\//);

	// Open via the command palette.
	await page.keyboard.press('Control+k');
	await page.locator('[role="combobox"]').fill('import');
	await page.keyboard.press('Enter');

	await expect(page.locator('[data-import-dialog]')).toBeVisible();
	await page.locator('[data-account-input]').fill(ID);
	await page.locator('[data-import-run]').click();

	await expect(page.locator('[data-import-preview]')).toBeVisible();
	await page.locator('[data-import-apply]').click();

	// Venus is selected by default → Rhino's card is visible; its parts are now owned.
	await expect(part).toHaveAttribute('data-owned', 'true');
	await expect(readout).not.toHaveText(/^0\//);
});
