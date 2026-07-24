import { test, expect } from '@playwright/test';

test('orokincell guide shows recommendations + prose', async ({ page }) => {
	await page.goto('/guides/orokincell');

	await expect(page.getByRole('heading', { name: /Orokin Cell farming guide/i })).toBeVisible();

	// One early + one late recommendation from the dataset.
	await expect(page.getByText('Saturn — Tethys')).toBeVisible();
	await expect(page.getByText('Ceres — Gabii')).toBeVisible();

	// The mdsvex long-form prose is rendered below the structured recs.
	await expect(page.getByRole('heading', { name: 'Early game' })).toBeVisible();
});

test('argoncrystal guide prerenders even though it has no panel link', async ({ page }) => {
	// Argon Crystal has regionIds: [] (Void-only resource), so it's never
	// reachable via the panel's <a href="/guides/{id}"> links that the
	// prerender crawler follows — entries() in +page.ts must list it
	// explicitly or this 404s at build time.
	const response = await page.goto('/guides/argoncrystal');

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { name: /Argon Crystal farming guide/i })).toBeVisible();
	await expect(page.getByText('Void — Hepit')).toBeVisible();
});

test('credits guide renders the bespoke page', async ({ page }) => {
	await page.goto('/guides/credits');

	await expect(page.getByRole('heading', { name: /Credits farming guide/i })).toBeVisible();
	// Data-driven card from the dataset entry.
	await expect(page.getByText('Ceres — Seimeni / Gabii (Dark Sector)')).toBeVisible();
	// Bespoke sections that the generic [resource] shell doesn't have.
	await expect(page.getByRole('heading', { name: /two-channel rule/i })).toBeVisible();
	await expect(page.getByRole('heading', { name: /outdated advice/i })).toBeVisible();
});
