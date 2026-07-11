import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RegionPanel from './RegionPanel.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Dataset } from '$lib/model/types';

// Jupiter-shaped fixture: one region with TWO Assassination nodes, each
// linking a different frame (mirrors the real Themisto→Valkyr and
// The Ropalolyst→Wisp case). Regression test for the bug where RegionPanel
// only rendered the FIRST matching node's frame.
const multiNodeRegion: Dataset = {
	regions: [
		{
			id: 'jupiter',
			name: 'Jupiter',
			kind: 'planet',
			progressionOrder: 7,
			factions: ['Corpus'],
			nodeIds: ['themisto', 'ropalolyst'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'themisto',
			regionId: 'jupiter',
			name: 'Themisto',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'aladv',
			frameId: 'valkyr',
		},
		{
			id: 'ropalolyst',
			regionId: 'jupiter',
			name: 'The Ropalolyst',
			missionType: 'Assassination',
			faction: 'Corpus',
			isAssassination: true,
			bossId: 'ropalolyst',
			frameId: 'wisp',
		},
	],
	bosses: [
		{ id: 'aladv', name: 'Alad V', nodeId: 'themisto', faction: 'Corpus' },
		{ id: 'ropalolyst', name: 'Ropalolyst', nodeId: 'ropalolyst', faction: 'Corpus' },
	],
	warframes: [
		{
			id: 'valkyr',
			name: 'Valkyr',
			nodeId: 'themisto',
			parts: [
				{ id: 'valkyr:bp', frameId: 'valkyr', slot: 'bp' },
				{ id: 'valkyr:neuroptics', frameId: 'valkyr', slot: 'neuroptics' },
				{ id: 'valkyr:chassis', frameId: 'valkyr', slot: 'chassis' },
				{ id: 'valkyr:systems', frameId: 'valkyr', slot: 'systems' },
			],
		},
		{
			id: 'wisp',
			name: 'Wisp',
			nodeId: 'ropalolyst',
			parts: [
				{ id: 'wisp:bp', frameId: 'wisp', slot: 'bp' },
				{ id: 'wisp:neuroptics', frameId: 'wisp', slot: 'neuroptics' },
				{ id: 'wisp:chassis', frameId: 'wisp', slot: 'chassis' },
				{ id: 'wisp:systems', frameId: 'wisp', slot: 'systems' },
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [],
};

// Equinox-shaped fixture: Uranus region with a Titania Assassination node
// linking Equinox, whose parts include the widened dayaspect/nightaspect
// slots (instead of the usual neuroptics/chassis/systems).
const equinoxRegion: Dataset = {
	regions: [
		{
			id: 'uranus',
			name: 'Uranus',
			kind: 'planet',
			progressionOrder: 6,
			factions: ['Grineer'],
			nodeIds: ['titania'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'titania',
			regionId: 'uranus',
			name: 'Titania',
			missionType: 'Assassination',
			faction: 'Grineer',
			isAssassination: true,
			bossId: 'tylregor',
			frameId: 'equinox',
		},
	],
	bosses: [{ id: 'tylregor', name: 'Tyl Regor', nodeId: 'titania', faction: 'Grineer' }],
	warframes: [
		{
			id: 'equinox',
			name: 'Equinox',
			nodeId: 'titania',
			parts: [
				{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp' },
				{ id: 'equinox:dayaspect', frameId: 'equinox', slot: 'dayaspect' },
				{ id: 'equinox:nightaspect', frameId: 'equinox', slot: 'nightaspect' },
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [],
} as unknown as Dataset;

// Mesa-shaped fixture: Eris region with a Mutalist Alad V Assassination node
// — this boss requires crafting a key, so the panel should show a "· key" hint.
const mesaKeyRegion: Dataset = {
	regions: [
		{
			id: 'eris',
			name: 'Eris',
			kind: 'planet',
			progressionOrder: 10,
			factions: ['Infested'],
			nodeIds: ['oceanum'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'oceanum',
			regionId: 'eris',
			name: 'Oceanum',
			missionType: 'Assassination',
			faction: 'Infested',
			isAssassination: true,
			bossId: 'mutalistaladv',
			frameId: 'mesa',
		},
	],
	bosses: [
		{
			id: 'mutalistaladv',
			name: 'Mutalist Alad V',
			nodeId: 'oceanum',
			faction: 'Infested',
		},
	],
	warframes: [
		{
			id: 'mesa',
			name: 'Mesa',
			nodeId: 'oceanum',
			parts: [
				{ id: 'mesa:bp', frameId: 'mesa', slot: 'bp' },
				{ id: 'mesa:neuroptics', frameId: 'mesa', slot: 'neuroptics' },
				{ id: 'mesa:chassis', frameId: 'mesa', slot: 'chassis' },
				{ id: 'mesa:systems', frameId: 'mesa', slot: 'systems' },
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [],
} as unknown as Dataset;

describe('RegionPanel', () => {
	it('shows the boss, frame, and faction for an assassination region', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		// Boss name appears in the subtitle (and as part-source labels).
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);
		expect(screen.getByText(/Rhino/)).toBeInTheDocument();
		expect(screen.getByText(/Corpus · Assassination/)).toBeInTheDocument();
	});
	it('toggles a part on row click', async () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		const row = screen.getByText('Chassis').closest('[data-part]') as HTMLElement;
		expect(row.getAttribute('data-owned')).toBe('false');
		await row.click();
		expect(tracker.isOwned('rhino:chassis')).toBe(true);
	});
	it('shows an empty state for a region with no assassination frame', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'mercury', tracker });
		expect(screen.getByText(/no assassination frame/i)).toBeInTheDocument();
	});
	it('renders a frame block per assassination node in a region with multiple (Jupiter-shaped)', () => {
		const tracker = createTracker(multiNodeRegion.warframes);
		render(RegionPanel, { dataset: multiNodeRegion, regionId: 'jupiter', tracker });

		// Both frames render, not just the first matching node's.
		expect(screen.getByText('Valkyr')).toBeInTheDocument();
		expect(screen.getByText('Wisp')).toBeInTheDocument();

		// Both frames' part rows are present.
		expect(document.querySelector('[data-part="valkyr:chassis"]')).toBeInTheDocument();
		expect(document.querySelector('[data-part="wisp:chassis"]')).toBeInTheDocument();
	});
	it('renders the region resources with phase badges and a guide link', () => {
		const ds = {
			regions: [
				{
					id: 'venus',
					name: 'Venus',
					kind: 'planet',
					progressionOrder: 2,
					factions: ['Corpus'],
					nodeIds: [],
					spoilerGated: false,
					resourceIds: ['alloyplate'],
				},
			],
			nodes: [],
			bosses: [],
			warframes: [],
			resources: [
				{
					id: 'alloyplate',
					name: 'Alloy Plate',
					image: 'AlloyPlate.png',
					regionIds: ['venus'],
					recommendations: [
						{
							phase: 'early',
							nodeLabel: 'Venus — Tessera',
							regionId: 'venus',
							boostersApply: false,
							note: '',
							source: '',
							lastVerified: '2026-07-05',
						},
						{
							phase: 'late',
							nodeLabel: 'Uranus — Assur',
							regionId: 'uranus',
							boostersApply: true,
							note: '',
							source: '',
							lastVerified: '2026-07-05',
						},
					],
				},
			],
			quests: [],
			openWorldFarms: [],
		} as unknown as Dataset;
		const tracker = createTracker([]);
		render(RegionPanel, { dataset: ds, regionId: 'venus', tracker });
		expect(screen.getByText('Alloy Plate')).toBeInTheDocument();
		// Early best IS here (venus) → badge shows; late best is elsewhere (uranus) → no badge.
		expect(screen.getByText('⚡ early best')).toBeInTheDocument();
		expect(screen.queryByText('💀 late best')).toBeNull();
		// Both phases' best nodes are listed (the late one muted, pointing to Uranus).
		expect(screen.getByText(/⚡ Early: Venus — Tessera/)).toBeInTheDocument();
		expect(screen.getByText(/💀 Late: Uranus — Assur/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /farming/i })).toHaveAttribute(
			'href',
			'/guides/alloyplate',
		);
	});
	it('renders Equinox day/night aspect parts (widened SLOT_LABEL, no fixed 4-row assumption)', () => {
		const tracker = createTracker(equinoxRegion.warframes);
		render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
		expect(screen.getByText('Day Aspect')).toBeInTheDocument();
		expect(screen.getByText('Night Aspect')).toBeInTheDocument();
		expect(document.querySelector('[data-part="equinox:dayaspect"]')).toBeInTheDocument();
	});
	it('prefixes Equinox aspect labels with sun/moon glyphs', () => {
		const tracker = createTracker(equinoxRegion.warframes);
		render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
		expect(screen.getByText('☀')).toBeInTheDocument();
		expect(screen.getByText('☾')).toBeInTheDocument();
		expect(document.querySelector('[data-part="equinox:dayaspect"]')).toBeInTheDocument();
		expect(screen.getByText('Day Aspect')).toBeInTheDocument();
		expect(screen.getByText('Night Aspect')).toBeInTheDocument();
	});
	it('lays out the frame/resources grid with items-start (no forced equal-height stretch)', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		expect(document.querySelector('.grid.items-start')).toBeInTheDocument();
	});
	it('shows a "key" hint for bosses that require crafting a key (Mutalist Alad V)', () => {
		const tracker = createTracker(mesaKeyRegion.warframes);
		render(RegionPanel, { dataset: mesaKeyRegion, regionId: 'eris', tracker });
		expect(document.querySelector('[data-key]')).toBeInTheDocument();
	});
	it('does not show a "key" hint for a normal (non-key) boss node', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		expect(document.querySelector('[data-key]')).toBeNull();
	});
});
