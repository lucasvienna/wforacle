import { readFileSync } from 'node:fs';
import { test as base, expect } from '@playwright/test';
import type { Dataset, Recommendation, WarframePart } from '../src/lib/model/types';
import { formatChance } from '../src/lib/panel/format';

export { expect };

/**
 * The shipping dataset, read from disk at test time. Specs assert against
 * *derived* values rather than hard-coded copies so that a routine drop-rate or
 * node-label change in a data refresh doesn't redden the suite for the wrong
 * reason — only genuinely broken rendering fails.
 */
export const dataset: Dataset = (
	JSON.parse(readFileSync(new URL('../static/data/dataset.json', import.meta.url), 'utf8')) as {
		data: Dataset;
	}
).data;

/** First recommendation of a phase for a resource; throws loudly if absent. */
export function rec(resourceId: string, phase: Recommendation['phase']): Recommendation {
	const resource = dataset.resources.find((r) => r.id === resourceId);
	if (!resource) throw new Error(`no resource "${resourceId}" in dataset.json`);
	const match = resource.recommendations.find((r) => r.phase === phase);
	if (!match) throw new Error(`resource "${resourceId}" has no ${phase} recommendation`);
	return match;
}

/** A frame part by `frameId:slot` id; throws loudly if absent. */
export function part(id: string): WarframePart {
	const match = dataset.warframes.flatMap((f) => f.parts).find((p) => p.id === id);
	if (!match) throw new Error(`no part "${id}" in dataset.json`);
	return match;
}

/** The drop chance of a part rendered exactly as the panel renders it. */
export function chanceOf(id: string): string {
	const { chance } = part(id);
	if (chance == null) throw new Error(`part "${id}" has no drop chance`);
	return formatChance(chance);
}

/**
 * Canned worldstate payload. Expiries are computed relative to the run so the
 * ticker renders live-looking countdowns rather than "—" or negative values,
 * but the *states* are fixed — nothing in e2e may depend on whether Cetus
 * happens to be in day or night when CI runs.
 */
function cannedWorldState() {
	const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
	return {
		ok: true,
		fetchedAt: new Date().toISOString(),
		cetus: { state: 'day', expiry: inMinutes(45) },
		vallis: { state: 'warm', expiry: inMinutes(12) },
		cambion: { state: 'fass', expiry: inMinutes(30) },
		rotation: { letter: 'A', expiry: inMinutes(90) },
	};
}

/**
 * Every spec runs against a mocked worldstate and a hard block on the live
 * Warframe API. Two reasons: the homepage starts polling `/api/worldstate` on
 * load, so an unmocked suite makes real outbound requests on every run; and
 * anything rendered from live cycles (rotation chips, availability text) is
 * nondeterministic.
 *
 * The block is a `route.abort()` rather than a silent pass-through so a new
 * unmocked call site fails loudly instead of quietly reintroducing the
 * dependency. Specs that legitimately need an upstream endpoint (the profile
 * import) register their own `page.route` in the test body — Playwright gives
 * precedence to the most recently registered handler.
 */
export const test = base.extend<{ worldstateMock: void }>({
	worldstateMock: [
		async ({ page }, use) => {
			await page.route('**/api.warframestat.us/**', (route) => route.abort());
			await page.route('**/api/worldstate', (route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(cannedWorldState()),
				}),
			);
			await use();
		},
		{ auto: true },
	],
});
