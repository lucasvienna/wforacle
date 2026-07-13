import { loadDataset } from '$lib/data/dataset';
import { resourcesForRegion } from '$lib/model/resources';
import type { PageLoad } from './$types';

// Universal load so the "Browse the Star Chart" directory below can render at
// build time (prerender is inherited from +layout.ts). Only non-spoiler-gated
// planets are included — this mirrors the app's default pre-quest reveal
// state (see `$lib/model/reveal`) and keeps spoiler content out of the
// crawlable, prerendered HTML.
export const load: PageLoad = async ({ fetch }) => {
	const dataset = await loadDataset(fetch);

	const directory = dataset.regions
		.filter((region) => region.kind === 'planet' && !region.spoilerGated)
		.sort((a, b) => a.progressionOrder - b.progressionOrder)
		.map((region) => {
			const frameIds = new Set(
				dataset.nodes
					.filter((node) => node.regionId === region.id && node.isAssassination && node.frameId)
					.map((node) => node.frameId!),
			);
			const frames = [...frameIds]
				.map((id) => dataset.warframes.find((w) => w.id === id)?.name)
				.filter((name): name is string => Boolean(name));

			const resources = resourcesForRegion(dataset, region.id).map((r) => ({
				id: r.id,
				name: r.name,
				hasGuide: r.recommendations.length > 0,
			}));

			return { id: region.id, name: region.name, frames, resources };
		});

	return { directory };
};
