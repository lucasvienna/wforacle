import type { Boss, Dataset, OpenWorldFarm, StarNode, Warframe } from '$lib/model/types';

export interface AssassinationEntry {
	node: StarNode;
	boss: Boss;
	frame: Warframe;
}

export interface OpenWorldEntry {
	frame: Warframe;
	farm: OpenWorldFarm;
}

export interface OpenWorldZone {
	node: StarNode;
	entries: OpenWorldEntry[];
}

export interface RegionFrames {
	assassination: AssassinationEntry[];
	zones: OpenWorldZone[];
}

// Groups a region's farmable frames by acquisition type. A region can have
// MULTIPLE assassination nodes (e.g. Jupiter: Themisto→Valkyr, The
// Ropalolyst→Wisp), and a single open-world zone node can yield several frames.
export function regionFrames(dataset: Dataset, regionId: string): RegionFrames {
	const assassination = dataset.nodes
		.filter((n) => n.regionId === regionId && n.isAssassination && n.frameId)
		.map((node) => ({
			node,
			boss: dataset.bosses.find((b) => b.id === node.bossId),
			frame: dataset.warframes.find((w) => w.id === node.frameId),
		}))
		.filter((e): e is AssassinationEntry => !!e.boss && !!e.frame);

	const byNode = new Map<string, OpenWorldZone>();
	for (const farm of dataset.openWorldFarms ?? []) {
		if (farm.regionId !== regionId) continue;
		const node = dataset.nodes.find((n) => n.id === farm.nodeId);
		const frame = dataset.warframes.find((w) => w.id === farm.frameId);
		if (!node || !frame) continue;
		const zone = byNode.get(node.id) ?? { node, entries: [] };
		zone.entries.push({ frame, farm });
		byNode.set(node.id, zone);
	}

	return { assassination, zones: [...byNode.values()] };
}
