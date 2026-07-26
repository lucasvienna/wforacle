import type { OpenWorldFarm, WarframePart } from '$lib/model/types';
import { formatChance } from './format';

/**
 * "Where does this part come from" labels.
 *
 * Pure: these took no component state even before extraction, they were just
 * declared inside RegionPanel's <script>, which forced every formatting rule
 * to be asserted through render() + DOM queries.
 */

/**
 * Assassination source label. A `bp` bought from the Market reads
 * "Market ({credits}cr)"; a curated bp (Atlas, Mesa) reads its bpSource
 * verbatim; a component drop — and a bp that itself drops from the boss
 * (Wisp/Ropalolyst) — reads "{boss} · {chance}%".
 */
export function assassinationSourceText(part: WarframePart, bossName: string): string {
	if (part.slot === 'bp' && !part.dropSourceNodeId) {
		if (part.bpSource) return part.bpSource;
		if (part.marketCost != null) return `Market (${part.marketCost.toLocaleString('en-US')}cr)`;
		return 'Market';
	}
	const chance = part.chance != null ? formatChance(part.chance) : undefined;
	return [bossName, chance].filter(Boolean).join(' · ');
}

/**
 * Source label for an open-world part row: a bare bp shows its bpSource; a
 * drop-sourced bp (Citrine, Dante, Voruna, Gyre) and components show
 * "{source} · {tier} · Rot {rotation} · {chance}%", omitting tier/rotation
 * for non-bounty sources (Exploiter Orb) that carry neither.
 */
export function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
	if (part.slot === 'bp' && !part.dropSourceNodeId) return farm.bpSource;
	const rot =
		part.rotation === 'any' ? 'any rot' : part.rotation ? `Rot ${part.rotation}` : undefined;
	const chance = part.chance != null ? formatChance(part.chance) : undefined;
	return [farm.componentSource, part.bountyTier, rot, chance].filter(Boolean).join(' · ');
}
