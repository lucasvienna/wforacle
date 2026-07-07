import { describe, it, expect } from 'vitest';
import type { Dataset } from '$lib/model/types';
import { buildPaletteItems, filterPaletteItems } from './search';

const dataset = {
	regions: [
		{ id: 'venus', name: 'Venus', kind: 'planet' },
		{ id: 'earth', name: 'Earth', kind: 'planet' },
		{ id: 'deimos', name: 'Deimos', kind: 'special' },
	],
	nodes: [
		{ id: 'fossa', regionId: 'venus' },
		{ id: 'magna', regionId: 'deimos' },
	],
	warframes: [
		{ id: 'rhino', name: 'Rhino', nodeId: 'fossa', parts: [] },
		{ id: 'nekros', name: 'Nekros', nodeId: 'magna', parts: [] },
	],
	resources: [
		{ id: 'ferrite', name: 'Ferrite', recommendations: [{ phase: 'early', nodeLabel: 'x' }] },
		{ id: 'kuva', name: 'Kuva', recommendations: [{ phase: 'late', nodeLabel: 'y' }] },
		{ id: 'norec', name: 'NoRec', recommendations: [] },
	],
} as unknown as Dataset;

describe('buildPaletteItems', () => {
	it('includes only visible regions', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		const regionItems = items.filter((i) => i.type === 'region');
		expect(regionItems.map((i) => i.id)).toEqual(['venus']);
	});

	it('includes only frames whose node region is visible', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		const frameItems = items.filter((i) => i.type === 'frame');
		expect(frameItems.map((i) => i.id)).toEqual(['rhino']);
	});

	it('includes resources with recommendations regardless of visibility', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		const resourceItems = items.filter((i) => i.type === 'resource');
		expect(resourceItems.map((i) => i.id).sort()).toEqual(['ferrite', 'kuva']);
	});

	it('excludes resources without recommendations', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		expect(items.some((i) => i.id === 'norec')).toBe(false);
	});

	it('gives planet regions a "Planet" sublabel', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		const venus = items.find((i) => i.id === 'venus');
		expect(venus?.sublabel).toBe('Planet');
	});

	it('gives special regions a "Special region" sublabel', () => {
		const items = buildPaletteItems(dataset, new Set(['venus', 'deimos']));
		const deimos = items.find((i) => i.id === 'deimos');
		expect(deimos?.sublabel).toBe('Special region');
	});

	it('gives frame items a "Frame · <region>" sublabel', () => {
		const items = buildPaletteItems(dataset, new Set(['venus']));
		const rhino = items.find((i) => i.id === 'rhino');
		expect(rhino?.sublabel).toBe('Frame · Venus');
		expect(rhino?.targetRegionId).toBe('venus');
	});

	it('returns regions, then frames, then resources', () => {
		const items = buildPaletteItems(dataset, new Set(['venus', 'earth', 'deimos']));
		const types = items.map((i) => i.type);
		const firstFrame = types.indexOf('frame');
		const firstResource = types.indexOf('resource');
		const lastRegion = types.lastIndexOf('region');
		expect(lastRegion).toBeLessThan(firstFrame);
		expect(firstFrame).toBeLessThan(firstResource);
	});
});

describe('filterPaletteItems', () => {
	const items = buildPaletteItems(dataset, new Set(['venus', 'earth', 'deimos']));

	it('returns all items unchanged for a blank query', () => {
		expect(filterPaletteItems(items, '').length).toBe(items.length);
		expect(filterPaletteItems(items, '   ').length).toBe(items.length);
	});

	it('ranks a prefix match for "rhi" first', () => {
		const filtered = filterPaletteItems(items, 'rhi');
		expect(filtered[0].id).toBe('rhino');
	});

	it('matches resources by label substring', () => {
		const filtered = filterPaletteItems(items, 'ferr');
		expect(filtered.some((i) => i.id === 'ferrite')).toBe(true);
	});

	it('returns an empty array for a non-matching query', () => {
		expect(filterPaletteItems(items, 'zzzzz')).toEqual([]);
	});

	it('ranks a startsWith match ahead of a mid-word substring match', () => {
		// "Kuva" starts with "ku"; "Ferrite" does not contain "ku" at all,
		// but "Nekros" contains "kro" as a substring, not a prefix.
		const filtered = filterPaletteItems(items, 'k');
		const kuvaIdx = filtered.findIndex((i) => i.id === 'kuva');
		const nekrosIdx = filtered.findIndex((i) => i.id === 'nekros');
		// nekros is hidden (deimos visible here so it IS present); kuva starts with 'k',
		// nekros does not start with 'k' -> kuva should rank ahead.
		expect(kuvaIdx).toBeGreaterThanOrEqual(0);
		expect(nekrosIdx).toBeGreaterThanOrEqual(0);
		expect(kuvaIdx).toBeLessThan(nekrosIdx);
	});
});
