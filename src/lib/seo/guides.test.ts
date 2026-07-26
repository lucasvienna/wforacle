import { describe, it, expect } from 'vitest';
import type { Dataset, Resource } from '$lib/model/types';
import { guideResources } from './guides';

/**
 * This projection exists because it was duplicated in the /guides hub and
 * llms.txt, where drift would not have thrown — it would have quietly
 * published two different lists. So the contract is worth pinning directly.
 *
 * The alphabetical sort in particular had no assertion anywhere: the llms.txt
 * test supplies a single guide, which cannot exercise an ordering.
 */
const resource = (id: string, name: string, withGuide = true): Resource => ({
	id,
	name,
	regionIds: [],
	recommendations: withGuide
		? [
				{
					phase: 'early',
					nodeLabel: 'Ceres — Gabii',
					boostersApply: true,
					note: 'Dark Sector Survival with a steady drop rate.',
					source: 'https://wiki.warframe.com/x',
					lastVerified: '2026-07-01',
				},
			]
		: [],
});

// Only `resources` is read; the parameter is Dataset, so cast like the route
// tests do rather than dragging in a whole fixture.
const datasetOf = (resources: Resource[]) => ({ resources }) as Dataset;

describe('guideResources', () => {
	it('excludes resources with no curated recommendation', () => {
		const list = guideResources(
			datasetOf([resource('ferrite', 'Ferrite', false), resource('rubedo', 'Rubedo')]),
		);
		expect(list.map((g) => g.id)).toEqual(['rubedo']);
	});

	it('sorts by name, not by dataset order', () => {
		// Three entries, deliberately: with one or two, a broken or absent sort
		// could still produce the expected output by luck.
		const list = guideResources(
			datasetOf([
				resource('rubedo', 'Rubedo'),
				resource('alloyplate', 'Alloy Plate'),
				resource('cryotic', 'Cryotic'),
			]),
		);
		expect(list.map((g) => g.name)).toEqual(['Alloy Plate', 'Cryotic', 'Rubedo']);
	});

	it('returns exactly { id, name, blurb }, never the whole resource', () => {
		// The point of the projection: neither consumer should be handed — or
		// start depending on — the full dataset entry.
		const [entry] = guideResources(datasetOf([resource('rubedo', 'Rubedo')]));
		expect(Object.keys(entry).sort()).toEqual(['blurb', 'id', 'name']);
	});

	it('takes the blurb from blurbFor, derived from the recommendation', () => {
		const [entry] = guideResources(datasetOf([resource('rubedo', 'Rubedo')]));
		expect(entry.blurb).toBeTruthy();
		expect(entry.blurb).toMatch(/Dark Sector Survival/);
	});

	it('returns an empty list when nothing has a guide', () => {
		expect(guideResources(datasetOf([resource('ferrite', 'Ferrite', false)]))).toEqual([]);
	});
});
