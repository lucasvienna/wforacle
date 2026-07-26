import { describe, it, expect, vi } from 'vitest';
import type { Dataset } from '$lib/model/types';
import { load } from './+page.server';

/**
 * The home page's directory producer had no tests at all (audit T4), while its
 * consumer — page.svelte.test.ts — fabricated its own `directory` fixture. So
 * the two could drift apart and both stay green. This tests the real producer.
 */
const dataset: Dataset = {
	regions: [
		{
			id: 'venus',
			name: 'Venus',
			kind: 'planet',
			progressionOrder: 2,
			factions: ['Corpus'],
			nodeIds: ['fossa'],
			spoilerGated: false,
			resourceIds: ['alloyplate'],
		},
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['oro'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			// Spoiler-gated: must never reach the crawlable prerendered HTML.
			id: 'deimos',
			name: 'Deimos',
			kind: 'planet',
			progressionOrder: 15,
			factions: ['Infested'],
			nodeIds: [],
			spoilerGated: true,
			questId: 'heartofdeimos',
			resourceIds: [],
		},
		{
			// Special regions are not planets and are not listed either.
			id: 'void',
			name: 'Void',
			kind: 'special',
			progressionOrder: 20,
			factions: ['Orokin'],
			nodeIds: [],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'fossa',
			regionId: 'venus',
			name: 'Fossa',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'jackal',
			frameId: 'rhino',
		},
		{
			// Not an assassination node — contributes no frame.
			id: 'tessera',
			regionId: 'venus',
			name: 'Tessera',
			missionType: 'Defense',
			faction: 'Corpus',
			isAssassination: false,
		},
	],
	bosses: [{ id: 'jackal', name: 'Jackal', nodeId: 'fossa', faction: 'Corpus' }],
	warframes: [{ id: 'rhino', name: 'Rhino', nodeId: 'fossa', parts: [] }],
	resources: [
		{
			id: 'alloyplate',
			name: 'Alloy Plate',
			regionIds: ['venus'],
			recommendations: [
				{
					phase: 'early',
					nodeLabel: 'Venus — Tessera',
					boostersApply: true,
					note: '',
					source: 'https://wiki.warframe.com/x',
					lastVerified: '2026-07-01',
				},
			],
		},
	],
	quests: [],
	openWorldFarms: [],
};

const fetchFn = vi.fn(() =>
	Promise.resolve({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ version: 'x', data: dataset }),
	}),
) as unknown as typeof fetch;

interface DirectoryEntry {
	id: string;
	name: string;
	frames: string[];
	resources: { id: string; name: string; hasGuide: boolean }[];
}

// The generated PageServerLoad return type is `void | …`; narrow it once here
// rather than casting at every call site.
const run = async (): Promise<{ directory: DirectoryEntry[] }> =>
	(await load({ fetch: fetchFn } as unknown as Parameters<typeof load>[0])) as {
		directory: DirectoryEntry[];
	};

describe('home page directory', () => {
	it('lists non-spoiler planets in progression order', async () => {
		const { directory } = await run();
		expect(directory.map((d) => d.id)).toEqual(['earth', 'venus']);
	});

	it('omits spoiler-gated regions', async () => {
		// This is what keeps quest spoilers out of the crawlable prerendered
		// HTML, so it is worth asserting rather than assuming.
		const { directory } = await run();
		expect(directory.map((d) => d.id)).not.toContain('deimos');
	});

	it('omits special regions, which are not planets', async () => {
		const { directory } = await run();
		expect(directory.map((d) => d.id)).not.toContain('void');
	});

	it('names the boss frame of each assassination node', async () => {
		const { directory } = await run();
		expect(directory.find((d) => d.id === 'venus')?.frames).toEqual(['Rhino']);
	});

	it('lists no frames for a planet with no assassination node', async () => {
		const { directory } = await run();
		expect(directory.find((d) => d.id === 'earth')?.frames).toEqual([]);
	});

	it('flags which resources have a farming guide', async () => {
		const { directory } = await run();
		expect(directory.find((d) => d.id === 'venus')?.resources).toEqual([
			{ id: 'alloyplate', name: 'Alloy Plate', hasGuide: true },
		]);
	});

	it('returns only the compact directory, never the dataset', async () => {
		// A server load that returned the whole dataset would put it back into
		// the prerendered HTML — the regression check:size guards in CI.
		const data = await run();
		expect(Object.keys(data)).toEqual(['directory']);
	});
});
