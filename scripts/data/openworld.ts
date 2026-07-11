import type { OpenWorldFarm } from '../../src/lib/model/types';
import type { SolNodes } from './build';

// Qorvex's components drop at Deimos' Albrecht's Laboratories (Sanctum
// Anatomica / Cavia) bounties, which have no star-chart SolNode. Injected as a
// curated pseudo-node (same pattern as curated.ts's Eris key-boss nodes) so
// buildNodes/buildRegions place it on Deimos as a Free Roam zone.
export const OPEN_WORLD_SOLNODES: SolNodes = {
	CuratedAlbrechtLabs: {
		value: "Albrecht's Laboratories (Deimos)",
		enemy: 'Infested',
		type: 'Free Roam',
	},
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
];
