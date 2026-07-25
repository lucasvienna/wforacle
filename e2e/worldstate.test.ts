import { test, expect } from './fixtures';

test('live-status ticker renders the mocked worldstate', async ({ page }) => {
	await page.goto('/');

	// Pins the shared fixture itself: these values exist only in the canned
	// payload, so seeing them proves the route actually intercepted. If the glob
	// ever stops matching, the suite would silently go back to polling the live
	// Warframe API and this test is what catches it.
	const ticker = page.locator('[data-worldstate]').first();
	await expect(ticker).toContainText('Cetus day');
	await expect(ticker).toContainText('Vallis warm');
	await expect(ticker).toContainText('Cambion fass');
	await expect(ticker).toContainText('Rotation A');
});

test('the worldstate mock survives the service worker taking control', async ({
	page,
	context,
}) => {
	// Regression test for a real leak: the fixture originally used `page.route`,
	// which does not intercept requests the service worker issues itself. Once
	// the SW controlled the page, its network-first `/api/worldstate` branch
	// fetched the live API and the mock silently stopped applying — on every
	// spec that reloads. `context.route` covers SW-issued requests; this asserts
	// it stays that way.
	//
	// Asserted with a sentinel cycle state rather than the fixture's realistic
	// one: "warm" would false-pass roughly half the time, since that is also a
	// value the live API returns. "SENTINEL" can only have come from this mock.
	const at = (ms: number) => new Date(Date.now() + ms).toISOString();
	const cycle = { state: 'SENTINEL', expiry: at(600_000) };
	await context.route('**/api/worldstate', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				fetchedAt: at(0),
				cetus: cycle,
				vallis: cycle,
				cambion: cycle,
				rotation: { letter: 'A', expiry: at(600_000) },
			}),
		}),
	);

	await page.goto('/');
	const ticker = page.locator('[data-worldstate]').first();
	await expect(ticker).toContainText('Cetus SENTINEL');

	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	await page.reload();

	await expect(ticker).toContainText('Cetus SENTINEL');
});
