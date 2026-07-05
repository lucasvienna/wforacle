import { test, expect } from '@playwright/test';

test('tracking a part persists across reload', async ({ page }) => {
	await page.goto('/');

	// The completion readout renders "Node Frames <b>{owned} / {total}</b>" —
	// scope to the <b> inside the header so we assert the count unambiguously
	// instead of matching text split across parent/child nodes.
	const readout = page.locator('header b');
	const part = page.locator('[data-part="rhino:chassis"]');

	await expect(readout).toHaveText('0 / 12');
	await expect(part).toHaveAttribute('data-owned', 'false');

	// Venus is selected by default, so the RegionPanel shows Rhino (Fossa/Jackal).
	await part.click();

	await expect(readout).toHaveText('1 / 12');
	await expect(part).toHaveAttribute('data-owned', 'true');

	await page.reload();

	// Proves the toggle survived the reload via IndexedDB, not just in-memory state.
	await expect(readout).toHaveText('1 / 12');
	await expect(part).toHaveAttribute('data-owned', 'true');
});
