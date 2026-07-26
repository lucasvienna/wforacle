import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import RegionPanel from './RegionPanel.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Boss, Dataset, Region, StarNode } from '$lib/model/types';
import type { WorldState } from '$lib/worldstate/types';

/**
 * Fixture builders. Every dataset below cares about two or three fields;
 * spelling out all eight of Region and all seven of StarNode each time was
 * most of this file's bulk and buried the bit that mattered per test.
 */
const ds = (over: Partial<Dataset>): Dataset => ({
	regions: [],
	nodes: [],
	bosses: [],
	warframes: [],
	resources: [],
	quests: [],
	openWorldFarms: [],
	...over,
});

const region = (id: string, name: string, over: Partial<Region> = {}): Region => ({
	id,
	name,
	kind: 'planet',
	progressionOrder: 1,
	factions: ['Corpus'],
	nodeIds: [],
	spoilerGated: false,
	resourceIds: [],
	...over,
});

const node = (
	id: string,
	regionId: string,
	name: string,
	over: Partial<StarNode> = {},
): StarNode => ({
	id,
	regionId,
	name,
	missionType: 'Assassination',
	faction: 'Corpus',
	isAssassination: true,
	...over,
});

const boss = (id: string, name: string, nodeId: string, faction = 'Corpus'): Boss => ({
	id,
	name,
	nodeId,
	faction,
});

// Jupiter-shaped fixture: one region with TWO Assassination nodes, each
// linking a different frame (mirrors the real Themisto→Valkyr and
// The Ropalolyst→Wisp case). Regression test for the bug where RegionPanel
// only rendered the FIRST matching node's frame.
const multiNodeRegion = ds({
	regions: [
		region('jupiter', 'Jupiter', { progressionOrder: 7, nodeIds: ['themisto', 'ropalolyst'] }),
	],
	nodes: [
		node('themisto', 'jupiter', 'Themisto', { bossId: 'aladv', frameId: 'valkyr' }),
		node('ropalolyst', 'jupiter', 'The Ropalolyst', { bossId: 'ropalolyst', frameId: 'wisp' }),
	],
	bosses: [boss('aladv', 'Alad V', 'themisto'), boss('ropalolyst', 'Ropalolyst', 'ropalolyst')],
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
});

// Equinox-shaped fixture: Uranus region with a Titania Assassination node
// linking Equinox, whose parts include eight aspect leaves (Day/Night ×
// {Aspect Blueprint, Neuroptics, Chassis, Systems}) plus the market blueprint.
const equinoxRegion = ds({
	regions: [
		region('uranus', 'Uranus', {
			progressionOrder: 6,
			factions: ['Grineer'],
			nodeIds: ['titania'],
		}),
	],
	nodes: [
		node('titania', 'uranus', 'Titania', {
			faction: 'Grineer',
			bossId: 'tylregor',
			frameId: 'equinox',
		}),
	],
	bosses: [boss('tylregor', 'Tyl Regor', 'titania', 'Grineer')],
	warframes: [
		{
			id: 'equinox',
			name: 'Equinox',
			nodeId: 'titania',
			parts: [
				{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp', marketCost: 25000 },
				{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
				{
					id: 'equinox:day:neuroptics',
					frameId: 'equinox',
					slot: 'neuroptics',
					aspect: 'day',
					chance: 25.81,
				},
				{
					id: 'equinox:day:chassis',
					frameId: 'equinox',
					slot: 'chassis',
					aspect: 'day',
					chance: 25.81,
				},
				{
					id: 'equinox:day:systems',
					frameId: 'equinox',
					slot: 'systems',
					aspect: 'day',
					chance: 25.81,
				},
				{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp', aspect: 'night', chance: 22.56 },
				{
					id: 'equinox:night:neuroptics',
					frameId: 'equinox',
					slot: 'neuroptics',
					aspect: 'night',
					chance: 25.81,
				},
				{
					id: 'equinox:night:chassis',
					frameId: 'equinox',
					slot: 'chassis',
					aspect: 'night',
					chance: 25.81,
				},
				{
					id: 'equinox:night:systems',
					frameId: 'equinox',
					slot: 'systems',
					aspect: 'night',
					chance: 25.81,
				},
			],
		},
	],
}) as unknown as Dataset;

// Mesa-shaped fixture: Eris region with a Mutalist Alad V Assassination node
// — this boss requires crafting a key, so the panel should show a "· key" hint.
const mesaKeyRegion = ds({
	regions: [
		region('eris', 'Eris', { progressionOrder: 10, factions: ['Infested'], nodeIds: ['oceanum'] }),
	],
	nodes: [
		node('oceanum', 'eris', 'Oceanum', {
			faction: 'Infested',
			bossId: 'mutalistaladv',
			frameId: 'mesa',
		}),
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
}) as unknown as Dataset;

// Open-world fixture: Caliban farmed on BOTH earth (Plains) and venus (Orb
// Vallis), plus Hildryn on venus via Exploiter Orb (no bounty tier/rotation).
const openWorld = ds({
	regions: [
		region('earth', 'Earth', { factions: ['Grineer'], nodeIds: ['plains'] }),
		region('venus', 'Venus', { progressionOrder: 2, nodeIds: ['vallis'] }),
	],
	nodes: [
		node('plains', 'earth', 'Plains of Eidolon', {
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		}),
		node('vallis', 'venus', 'Orb Vallis', { missionType: 'Free Roam', isAssassination: false }),
	],
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
});

describe('RegionPanel — open world', () => {
	it('renders a Free Roam zone with its frame and a stage-labelled part row', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		expect(screen.getByText('Plains of Eidolon')).toBeInTheDocument();
		expect(screen.getByText(/Grineer · Free Roam/)).toBeInTheDocument();
		expect(document.querySelector('[data-part="caliban:chassis"]')).toBeInTheDocument();
		expect(screen.getByText(/Narmer Bounty · L50–70 · Rot B · 21\.1%/)).toBeInTheDocument();
	});

	// The zone card's kind chip comes from the node's mission type, so non-Free-
	// Roam mission farms (Shrine Defense, Granum Void) label themselves correctly.
	it('labels a mission-farm zone with its mission type, not Free Roam', () => {
		const shrine = ds({
			regions: [region('earth', 'Earth', { factions: ['Grineer'], nodeIds: ['sayasvisions'] })],
			nodes: [
				{
					id: 'sayasvisions',
					regionId: 'earth',
					name: "Saya's Visions",
					missionType: 'Shrine Defense',
					faction: 'Infested',
					isAssassination: false,
				},
			],
			warframes: [
				{
					id: 'koumei',
					name: 'Koumei',
					nodeId: 'sayasvisions',
					parts: [
						{ id: 'koumei:bp', frameId: 'koumei', slot: 'bp' },
						{
							id: 'koumei:systems',
							frameId: 'koumei',
							slot: 'systems',
							dropSourceNodeId: 'sayasvisions',
							chance: 4.09,
						},
					],
				},
			],
			openWorldFarms: [
				{
					frameId: 'koumei',
					nodeId: 'sayasvisions',
					regionId: 'earth',
					componentSource: 'Shrine Defense',
					bpSource: 'Shrine Defense drop or 165 Fate Pearls',
				},
			],
		});
		const tracker = createTracker(shrine.warframes);
		render(RegionPanel, { dataset: shrine, regionId: 'earth', tracker });
		expect(screen.getByText("Saya's Visions")).toBeInTheDocument();
		expect(screen.getByText(/Infested · Shrine Defense/)).toBeInTheDocument();
		expect(screen.getByText(/^Shrine Defense · 4\.09%$/)).toBeInTheDocument();
	});

	// Gyre-shaped fixture: a frame whose only unowned part is a drop-sourced bp.
	// Regression test for the collapsed-card summary cue ignoring drop-sourced
	// blueprints (it used to filter out every `bp` slot, drop-sourced or not).
	it('shows the collapsed summary "up now" when a drop-sourced blueprint is the only thing left to farm', async () => {
		const gyre = ds({
			regions: [region('neptune', 'Neptune', { progressionOrder: 8, nodeIds: ['zariman'] })],
			nodes: [
				node('zariman', 'neptune', 'Zariman Ten Zero', {
					missionType: 'Void Flood',
					isAssassination: false,
				}),
			],
			warframes: [
				{
					id: 'gyre',
					name: 'Gyre',
					nodeId: 'zariman',
					parts: [
						{
							id: 'gyre:bp',
							frameId: 'gyre',
							slot: 'bp',
							dropSourceNodeId: 'zariman',
							chance: 12.99,
							rotation: 'C',
						},
					],
				},
			],
			openWorldFarms: [
				{
					frameId: 'gyre',
					nodeId: 'zariman',
					regionId: 'neptune',
					componentSource: 'Zariman Bounty',
					bpSource: 'Zariman Bounty drop (Rot C)',
				},
			],
		});
		const tracker = createTracker(gyre.warframes);
		render(RegionPanel, {
			dataset: gyre,
			regionId: 'neptune',
			tracker,
			worldState: {
				ok: true,
				fetchedAt: 't',
				cetus: { state: 'night', expiry: '2026-07-11T21:00:00.000Z' },
				vallis: { state: 'cold', expiry: '2026-07-11T20:57:00.000Z' },
				cambion: { state: 'fass', expiry: '2026-07-11T21:00:00.000Z' },
				rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
			},
		});
		// Collapse the card so the summary cue (rather than the per-part chip) renders.
		(document.querySelector('[data-frame="gyre"] button') as HTMLElement).click();
		await tick();
		const card = document.querySelector('[data-frame="gyre"]') as HTMLElement;
		expect(card).toHaveAttribute('data-expanded', 'false');
		expect(card.textContent).toMatch(/up now/);
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

	it('toggles an open-world part on click', async () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		const row = document.querySelector('[data-part="caliban:chassis"]') as HTMLElement;
		row.click();
		expect(tracker.isOwned('caliban:chassis')).toBe(true);
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
	it('keys assassination cards by node, so one frame on two nodes renders twice without a key collision', () => {
		// Same frame on two assassination nodes → keying by frame.id alone would
		// be a duplicate key (Svelte errors / reuses state). Key by node.id.
		const dupFrame: Dataset = {
			...multiNodeRegion,
			nodes: [
				multiNodeRegion.nodes[0], // themisto → valkyr
				{ ...multiNodeRegion.nodes[1], frameId: 'valkyr' }, // ropalolyst → valkyr too
			],
			warframes: [multiNodeRegion.warframes[0]], // just valkyr
		};
		const tracker = createTracker(dupFrame.warframes);
		render(RegionPanel, { dataset: dupFrame, regionId: 'jupiter', tracker });
		expect(document.querySelectorAll('[data-frame="valkyr"]')).toHaveLength(2);
	});
	it('renders the region resources with phase badges and a guide link', () => {
		const resourceRegion = ds({
			regions: [region('venus', 'Venus', { progressionOrder: 2, resourceIds: ['alloyplate'] })],
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
		}) as unknown as Dataset;
		const tracker = createTracker([]);
		render(RegionPanel, { dataset: resourceRegion, regionId: 'venus', tracker });
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
	it('renders Equinox as collapsible Day/Night aspect groups', () => {
		const tracker = createTracker(equinoxRegion.warframes);
		render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
		expect(screen.getByText('Day Aspect')).toBeInTheDocument();
		expect(screen.getByText('Night Aspect')).toBeInTheDocument();
		expect(document.querySelector('[data-part="equinox:day:bp"]')).toBeInTheDocument();
	});
	it('prefixes Equinox aspect group headers with sun/moon glyphs', () => {
		const tracker = createTracker(equinoxRegion.warframes);
		render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
		expect(screen.getByText('☀')).toBeInTheDocument();
		expect(screen.getByText('☾')).toBeInTheDocument();
	});
	it('shows the per-kill note naming the boss', () => {
		const tracker = createTracker(equinoxRegion.warframes);
		render(RegionPanel, { dataset: equinoxRegion, regionId: 'uranus', tracker });
		expect(
			screen.getByText('Each Tyl Regor kill drops one Day and one Night component.'),
		).toBeInTheDocument();
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
		expect(screen.queryByRole('heading', { name: 'Zones & Missions' })).toBeNull();
	});

	it('shows only the Zones & Missions group header for an open-world-only region', () => {
		const tracker = createTracker(openWorld.warframes);
		render(RegionPanel, { dataset: openWorld, regionId: 'earth', tracker });
		expect(screen.getByRole('heading', { name: 'Zones & Missions' })).toBeInTheDocument();
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
const owAvail = ds({
	regions: [region('earth', 'Earth', { factions: ['Grineer'], nodeIds: ['plains'] })],
	nodes: [
		node('plains', 'earth', 'Plains of Eidolon', {
			missionType: 'Free Roam',
			faction: 'Grineer',
			isAssassination: false,
		}),
	],
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
	openWorldFarms: [
		{
			frameId: 'gara',
			nodeId: 'plains',
			regionId: 'earth',
			componentSource: 'Cetus Bounty',
			bpSource: "Complete Saya's Vigil",
		},
	],
});

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
});

// Assassination source-label fixture. `regionFrames` maps exactly ONE frame
// per node (via node.frameId), so each frame needs its own Assassination node.
// Three frames exercise each blueprint source — Market credit, a bp that drops
// from the boss (Wisp/Ropalolyst-style), and a curated bpSource (Mesa-style).
