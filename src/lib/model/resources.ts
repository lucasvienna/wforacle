import type { Dataset, Resource, Recommendation } from './types';

export function resourcesForRegion(dataset: Dataset, regionId: string): Resource[] {
	return dataset.resources.filter((r) => r.regionIds.includes(regionId));
}

export function bestPhaseRec(resource: Resource, phase: 'early' | 'late'): Recommendation | undefined {
	return resource.recommendations.find((r) => r.phase === phase);
}
