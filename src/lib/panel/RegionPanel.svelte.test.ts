import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import RegionPanel from './RegionPanel.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Dataset } from '$lib/model/types';
import type { WorldState } from '$lib/worldstate/types';

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

// Open-world fixture: Caliban farmed on BOTH earth (Plains) and venus (Orb
// Vallis), plus Hildryn on venus via Exploiter Orb (no bounty tier/rotation).
const openWorld: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['plains'],
			spoilerGated: false,
			resourceIds: [],
		},
		{
			id: 'venus',
			name: 'Venus',
			kind: 'planet',
			progressionOrder: 2,
			factions: ['Corpus'],
			nodeIds: ['vallis'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
		{
			id: 'vallis',
			regionId: 'venus',
			name: 'Orb Vallis',
			missionType: 'Free Roam',
			faction: 'Corpus',
			isAssassination: false,
		},
	],
	bosses: [],
	warframes: [
		{
			id: 'caliban',
			name: 'Caliban',
			nodeId: 'plains',
			parts: [
				{ id: 'caliban:bp', frameId: 'caliban', slot: 'bp' },
				{
					id: 'caliban:chassis',
					frameId: 'caliban',
					slot: 'chassis',
					dropSourceNodeId: 'plains',
					chance: 21.1,
					bountyTier: 'L50–70',
					rotation: 'B',
				},
			],
		},
		{
			id: 'hildryn',
			name: 'Hildryn',
			nodeId: 'vallis',
			parts: [
				{ id: 'hildryn:bp', frameId: 'hildryn', slot: 'bp' },
				{
					id: 'hildryn:chassis',
					frameId: 'hildryn',
					slot: 'chassis',
					dropSourceNodeId: 'vallis',
					chance: 38.72,
				},
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'caliban',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
		{
			frameId: 'caliban',
			nodeId: 'vallis',
			regionId: 'venus',
			componentSource: 'Narmer Bounty',
			bpSource: 'Market (50,000cr)',
		},
		{
			frameId: 'hildryn',
			nodeId: 'vallis',
			regionId: 'venus',
			componentSource: 'Exploiter Orb',
			bpSource: 'Little Duck (Vox Solaris standing)',
		},
	],
};

describe('RegionPanel — open world', () => {
	it('renders a Free Roam zone with its frame and a stage-labelled part row', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		expect(screen.getByText('Plains of Eidolon')).toBeInTheDocument();
		expect(screen.getByText(/Grineer · Free Roam/)).toBeInTheDocument();
		expect(document.querySelector('[data-part="caliban:chassis"]')).toBeInTheDocument();
		expect(screen.getByText(/Narmer Bounty · L50–70 · Rot B · ~21%/)).toBeInTheDocument();
	});

	it('shows Caliban under BOTH earth and venus', () => {
		const t1 = createTracker(openWorld.warframes);
		const { unmount } = render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker: t1 });
		expect(screen.getByText('Caliban')).toBeInTheDocument();
		unmount();
		const t2 = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'venus', tracker: t2 });
		expect(screen.getByText('Caliban')).toBeInTheDocument();
	});

	it('omits tier/rotation for a non-bounty (Exploiter Orb) source', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'venus', tracker });
		const row = document.querySelector('[data-part="hildryn:chassis"]') as HTMLElement;
		expect(row.textContent).toMatch(/Exploiter Orb · ~39%/);
		expect(row.textContent).not.toMatch(/Rot /);
	});

	it('toggles an open-world part on click', async () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		const row = document.querySelector('[data-part="caliban:chassis"]') as HTMLElement;
		row.click();
		expect(tracker.isOwned('caliban:chassis')).toBe(true);
	});

	it('renders "any rot" when a component drops on all rotations equally', () => {
		const anyRot: Dataset = {
			regions: [
				{
					id: 'earth',
					name: 'Earth',
					kind: 'planet',
					progressionOrder: 1,
					factions: ['Grineer'],
					nodeIds: ['plains'],
					spoilerGated: false,
					resourceIds: [],
				},
			],
			nodes: [
				{
					id: 'plains',
					regionId: 'earth',
					name: 'Plains of Eidolon',
					missionType: 'Free Roam',
					faction: 'Grineer',
					isAssassination: false,
				},
			],
			bosses: [],
			warframes: [
				{
					id: 'gara',
					name: 'Gara',
					nodeId: 'plains',
					parts: [
						{ id: 'gara:bp', frameId: 'gara', slot: 'bp' },
						{
							id: 'gara:chassis',
							frameId: 'gara',
							slot: 'chassis',
							dropSourceNodeId: 'plains',
							chance: 45,
							bountyTier: 'L5–15',
							rotation: 'any',
						},
					],
				},
			],
			resources: [],
			quests: [],
			openWorldFarms: [
				{
					frameId: 'gara',
					nodeId: 'plains',
					regionId: 'earth',
					componentSource: 'Cetus Bounty',
					bpSource: "Complete Saya's Vigil",
				},
			],
		};
		const tracker = createTracker(anyRot.warframes);
		render(RegionPanel, { dataset: anyRot, regionId: 'earth', tracker });
		expect(screen.getByText(/Cetus Bounty · L5–15 · any rot · ~45%/)).toBeInTheDocument();
	});
});

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
		row.click();
		expect(tracker.isOwned('rhino:chassis')).toBe(true);
	});
	it('shows an empty state for a region with no assassination frame', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'mercury', tracker });
		expect(screen.getByText(/no farmable frames/i)).toBeInTheDocument();
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
	it('lays out a frames band alongside the resource rail', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		expect(document.querySelector('[data-region-band]')).toBeInTheDocument();
		expect(document.querySelector('[data-resource-rail]')).toBeInTheDocument();
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
	it('shows only the Assassination group header for an assassination-only region', () => {
		const tracker = createTracker(seed.warframes);
		render(RegionPanel, { dataset: seed, regionId: 'venus', tracker });
		expect(screen.getByRole('heading', { name: 'Assassination' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Free Roam' })).toBeNull();
	});

	it('shows only the Free Roam group header for an open-world-only region', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		expect(screen.getByRole('heading', { name: 'Free Roam' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Assassination' })).toBeNull();
	});

	it('re-derives expand state when the region changes (region-prefixed keys)', async () => {
		const tracker = createTracker(openWorld.warframes);
		const { rerender } = render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		// Caliban exists on both earth and venus; collapse it on earth...
		(document.querySelector('[data-frame="caliban"] button') as HTMLElement).click();
		await tick();
		expect(document.querySelector('[data-frame="caliban"]')).toHaveAttribute(
			'data-expanded',
			'false',
		);
		// ...switching regions must mount a FRESH card (incomplete → expanded again).
		await rerender({ dataset: openWorld, regionId: 'venus', tracker });
		expect(document.querySelector('[data-frame="caliban"]')).toHaveAttribute(
			'data-expanded',
			'true',
		);
	});
});

const wsNow = Date.parse('2026-07-11T20:39:00.000Z');
const worldState: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'night', expiry: '2026-07-11T21:00:00.000Z' },
	vallis: { state: 'cold', expiry: '2026-07-11T20:57:00.000Z' },
	cambion: { state: 'fass', expiry: '2026-07-11T21:00:00.000Z' },
	rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
};

// Earth zone with Gara: Neuroptics is Rot C (up now), Systems is Rot A (not this
// rotation); plus Hildryn-style always-available part with no rotation.
const owAvail: Dataset = {
	regions: [
		{
			id: 'earth',
			name: 'Earth',
			kind: 'planet',
			progressionOrder: 1,
			factions: ['Grineer'],
			nodeIds: ['plains'],
			spoilerGated: false,
			resourceIds: [],
		},
	],
	nodes: [
		{
			id: 'plains',
			regionId: 'earth',
			name: 'Plains of Eidolon',
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		},
	],
	bosses: [],
	warframes: [
		{
			id: 'gara',
			name: 'Gara',
			nodeId: 'plains',
			parts: [
				{ id: 'gara:bp', frameId: 'gara', slot: 'bp' },
				{
					id: 'gara:neuroptics',
					frameId: 'gara',
					slot: 'neuroptics',
					dropSourceNodeId: 'plains',
					chance: 47,
					bountyTier: 'L20–40',
					rotation: 'C',
				},
				{
					id: 'gara:systems',
					frameId: 'gara',
					slot: 'systems',
					dropSourceNodeId: 'plains',
					chance: 45,
					bountyTier: 'L10–30',
					rotation: 'A',
				},
				{
					id: 'gara:chassis',
					frameId: 'gara',
					slot: 'chassis',
					dropSourceNodeId: 'plains',
					chance: 39,
				},
			],
		},
	],
	resources: [],
	quests: [],
	openWorldFarms: [
		{
			frameId: 'gara',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: "Complete Saya's Vigil",
		},
	],
};

describe('RegionPanel — world-state overlay', () => {
	it('marks a part up now when its rotation matches the live letter', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:neuroptics"]') as HTMLElement;
		expect(row.textContent).toMatch(/up now · resets 21m/);
	});
	it('marks a part not-this-rotation with the next-up countdown', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:systems"]') as HTMLElement;
		expect(row.textContent).toMatch(/Rot A · up in/);
	});
	it('marks a rotation-less component as always available', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		const row = document.querySelector('[data-part="gara:chassis"]') as HTMLElement;
		expect(row.textContent).toMatch(/always available/);
	});
	it('renders the zone cycle line for the region', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState,
			now: wsNow,
		});
		expect(screen.getByText(/night · 21m/)).toBeInTheDocument();
	});
	it('renders no chips or cycle line when worldState is absent', () => {
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
		});
		expect(document.querySelector('[data-part="gara:neuroptics"]')!.textContent).not.toMatch(
			/up now/,
		);
		expect(screen.queryByText(/night ·/)).toBeNull();
	});
	it('hides the zone cycle line instead of showing NaN when the cycle expiry is missing', () => {
		const badWorldState: WorldState = {
			...worldState,
			cetus: { state: 'day', expiry: '' },
		};
		render(RegionPanel, {
			dataset: owAvail,
			regionId: 'earth',
			tracker: createTracker(owAvail.warframes),
			worldState: badWorldState,
			now: wsNow,
		});
		expect(document.body.textContent).not.toMatch(/NaN/);
		expect(document.querySelector('[data-zone-cycle]')).toBeNull();
	});
});
