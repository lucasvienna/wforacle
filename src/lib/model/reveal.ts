import type { Dataset, Region } from './types';

/** Exported for its own unit tests, not for callers — use revealedRegions.
 * The spoiler-gating rule is subtle enough to be worth asserting directly. */
export function isRegionRevealed(region: Region, completedQuests: ReadonlySet<string>): boolean {
	return !region.spoilerGated || (!!region.questId && completedQuests.has(region.questId));
}

export function revealedRegions(dataset: Dataset, completedQuests: ReadonlySet<string>): Region[] {
	return dataset.regions.filter((r) => isRegionRevealed(r, completedQuests));
}
