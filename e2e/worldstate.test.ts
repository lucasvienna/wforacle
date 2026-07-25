import { test, expect } from './fixtures';

test('live-status ticker renders the mocked worldstate', async ({ page }) => {
	await page.goto('/');

	// Pins the shared fixture itself: these values exist only in the canned
	// payload, so seeing them proves `page.route('**/api/worldstate')` actually
	// intercepted. If the glob ever stops matching, the suite would silently go
	// back to polling the live Warframe API and this test is what catches it.
	const ticker = page.locator('[data-worldstate]').first();
	await expect(ticker).toContainText('Cetus day');
	await expect(ticker).toContainText('Vallis warm');
	await expect(ticker).toContainText('Cambion fass');
	await expect(ticker).toContainText('Rotation A');
});
