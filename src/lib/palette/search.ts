import type { Dataset } from '$lib/model/types';

export type PaletteItem = {
	type: 'region' | 'frame' | 'resource' | 'action';
	id: string;
	label: string;
	sublabel: string;
	targetRegionId?: string;
};

export function buildPaletteItems(
	dataset: Dataset,
	visibleRegionIds: ReadonlySet<string>,
): PaletteItem[] {
	const regionItems: PaletteItem[] = dataset.regions
		.filter((region) => visibleRegionIds.has(region.id))
		.map((region) => ({
			type: 'region',
			id: region.id,
			label: region.name,
			sublabel: region.kind === 'special' ? 'Special region' : 'Planet',
			targetRegionId: region.id,
		}));

	const nodeById = new Map(dataset.nodes.map((node) => [node.id, node]));
	const regionById = new Map(dataset.regions.map((region) => [region.id, region]));

	const frameItems: PaletteItem[] = [];
	for (const frame of dataset.warframes) {
		if (!frame.nodeId) continue;
		const node = nodeById.get(frame.nodeId);
		if (!node) continue;
		const region = regionById.get(node.regionId);
		if (!region || !visibleRegionIds.has(region.id)) continue;
		frameItems.push({
			type: 'frame',
			id: frame.id,
			label: frame.name,
			sublabel: `Frame · ${region.name}`,
			targetRegionId: region.id,
		});
	}

	const resourceItems: PaletteItem[] = dataset.resources
		.filter((resource) => resource.recommendations.length > 0)
		.map((resource) => ({
			type: 'resource',
			id: resource.id,
			label: resource.name,
			sublabel: 'Resource',
		}));

	return [...regionItems, ...frameItems, ...resourceItems];
}

const NO_MATCH = -1;

/** Rank a label against a (lowercased) query; higher is better, NO_MATCH means no match. */
function scoreLabel(label: string, q: string): number {
	const lower = label.toLowerCase();
	if (lower === q) return 5;
	if (lower.startsWith(q)) return 4;
	if (isWordBoundaryMatch(lower, q)) return 3;
	if (lower.includes(q)) return 2;
	if (isSubsequence(lower, q)) return 1;
	return NO_MATCH;
}

function isWordBoundaryMatch(label: string, q: string): boolean {
	const idx = label.indexOf(q);
	if (idx <= 0) return false;
	const prev = label[idx - 1];
	return !/[a-z0-9]/i.test(prev);
}

function isSubsequence(label: string, q: string): boolean {
	let i = 0;
	for (const ch of label) {
		if (i < q.length && ch === q[i]) i++;
	}
	return i === q.length;
}

export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;

	const scored: { item: PaletteItem; score: number; index: number }[] = [];
	items.forEach((item, index) => {
		const labelScore = scoreLabel(item.label, q);
		const score =
			labelScore !== NO_MATCH ? labelScore : item.sublabel.toLowerCase().includes(q) ? 0 : NO_MATCH;
		if (score !== NO_MATCH) scored.push({ item, score, index });
	});

	scored.sort((a, b) => b.score - a.score || a.index - b.index);
	return scored.map((s) => s.item);
}
