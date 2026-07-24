import type { OpenWorldFarm, Slot } from '../../src/lib/model/types';
import type { SolNodes } from './build';

// Qorvex's components drop at Deimos' Albrecht's Laboratories (Sanctum
// Anatomica / Cavia) bounties, which have no star-chart SolNode. Injected as a
// curated pseudo-node (same pattern as curated.ts's Eris key-boss nodes) so
// buildNodes/buildRegions place it on Deimos as a Free Roam zone.
//
// Saya's Visions (Koumei's Shrine Defense, Cetus tileset vs Infested) IS a
// real Earth node in-game, but warframe-worldstate-data (3.16.x) predates it —
// curated here until upstream catches up. Granum Void has no node at all: it's
// entered from Corpus Ship missions via Golden Hand Tributes; placed on Venus,
// The Deadlock Protocol's home planet.
export const OPEN_WORLD_SOLNODES: SolNodes = {
	CuratedAlbrechtLabs: {
		value: "Albrecht's Laboratories (Deimos)",
		enemy: 'Infested',
		type: 'Free Roam',
	},
	CuratedSayasVisions: {
		value: "Saya's Visions (Earth)",
		enemy: 'Infested',
		type: 'Shrine Defense',
	},
	CuratedGranumVoid: {
		value: 'Granum Void (Venus)',
		enemy: 'Corpus',
		type: 'Granum Void',
	},
};

// Farms whose reward "rotations" are earned within a single run (Granum Void
// kill-count ranks — Rot C = 75 solo kills; Shrine Defense completion), NOT
// the 150-min cycle WarframePart.rotation feeds into the worldstate
// availability chips. Listing a frame here makes buildOpenWorldFrames discard
// the rotation letter parsed from its drop locations; the optional per-slot
// labels land in WarframePart.bountyTier as static tier text. Protea's
// Extended/Nightmare tiers need Exemplar/Zenith Granum Crowns, dropped by
// Treasurers on level 16-30 / 30+ Corpus missions.
export const PER_RUN_ROTATION_FARMS: Record<string, Partial<Record<Slot, string>>> = {
	protea: { chassis: 'Extended', systems: 'Nightmare' },
	koumei: {},
};

// Curated frame → open-world zone table. The three real Free Roam zones reuse
// their existing SolNode ids (Plains of Eidolon = SolNode228 / Earth, Orb Vallis
// = SolNode129 / Venus, Cambion Drift = SolNode229 / Deimos). Parts, images, and
// drop chances are pulled from @wfcd/items by buildOpenWorldFrames; only the
// zone placement and the source/blueprint labels are curated here. bpSource
// values verified against the Warframe wiki (see the design spec).
export const OPEN_WORLD_FARMS: OpenWorldFarm[] = [
	{
		frameId: 'gara',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Cetus Bounty',
		bpSource: "Complete Saya's Vigil",
	},
	{
		frameId: 'revenant',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Cetus Bounty',
		bpSource: 'Complete Mask of the Revenant',
	},
	{
		frameId: 'caliban',
		nodeId: 'SolNode228',
		regionId: 'earth',
		componentSource: 'Narmer Bounty',
		bpSource: 'Market (50,000cr)',
	},
	{
		frameId: 'garuda',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Orb Vallis Bounty',
		bpSource: 'Complete Vox Solaris',
	},
	{
		frameId: 'hildryn',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Exploiter Orb',
		bpSource: 'Little Duck (Vox Solaris standing)',
	},
	{
		frameId: 'caliban',
		nodeId: 'SolNode129',
		regionId: 'venus',
		componentSource: 'Narmer Bounty',
		bpSource: 'Market (50,000cr)',
	},
	{
		frameId: 'xaku',
		nodeId: 'SolNode229',
		regionId: 'deimos',
		componentSource: 'Cambion Drift Bounty',
		bpSource: 'Complete Heart of Deimos',
	},
	{
		frameId: 'qorvex',
		nodeId: 'CuratedAlbrechtLabs',
		regionId: 'deimos',
		componentSource: "Albrecht's Laboratories Bounty",
		bpSource: 'Complete Whispers in the Walls',
	},
	{
		frameId: 'protea',
		nodeId: 'CuratedGranumVoid',
		regionId: 'venus',
		componentSource: 'Granum Void (Rot C)',
		bpSource: 'Complete The Deadlock Protocol',
	},
	{
		frameId: 'koumei',
		nodeId: 'CuratedSayasVisions',
		regionId: 'earth',
		componentSource: 'Shrine Defense',
		bpSource: 'Shrine Defense drop or 165 Fate Pearls',
	},
];
