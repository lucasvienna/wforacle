import type { Dataset, Region } from './types';

export function isRegionRevealed(region: Region, completedQuests: ReadonlySet<string>): boolean {
	return !region.spoilerGated || (!!region.questId && completedQuests.has(region.questId));
}

export function revealedRegions(dataset: Dataset, completedQuests: ReadonlySet<string>): Region[] {
	return dataset.regions.filter((r) => isRegionRevealed(r, completedQuests));
}
