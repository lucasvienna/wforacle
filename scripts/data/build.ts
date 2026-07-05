import type { Region, StarNode, Warframe, Boss, Slot, WarframePart } from '../../src/lib/model/types';
import { parseNodeValue, slugify, parseDropLocation } from './parse';
import { PLANETS, planetOrder, BOSS_BY_NODE } from './curated';
import { partId } from '../../src/lib/model/completion';

export type SolNodes = Record<string, { value: string; enemy: string; type: string }>;

const PLANET_META = new Map(PLANETS.map((p) => [p.name, p]));

export function buildNodes(solNodes: SolNodes): StarNode[] {
	const out: StarNode[] = [];
	for (const [id, v] of Object.entries(solNodes)) {
		const parsed = parseNodeValue(v.value);
		if (!parsed || !PLANET_META.has(parsed.planet)) continue;
		out.push({
			id,
			regionId: slugify(parsed.planet),
			name: parsed.node,
			missionType: v.type,
			faction: v.enemy,
			isAssassination: v.type === 'Assassination',
		});
	}
	return out;
}

export function buildRegions(solNodes: SolNodes): Region[] {
	const nodes = buildNodes(solNodes);
	const byRegion = new Map<string, StarNode[]>();
	for (const n of nodes)
		(byRegion.get(n.regionId) ?? byRegion.set(n.regionId, []).get(n.regionId)!).push(n);
	const regions: Region[] = [];
	for (const p of PLANETS) {
		const id = slugify(p.name);
		const rn = byRegion.get(id);
		if (!rn) continue;
		regions.push({
			id,
			name: p.name,
			kind: 'planet',
			progressionOrder: p.order,
			factions: [p.faction],
			spoilerGated: p.spoilerGated,
			nodeIds: rn.map((n) => n.id),
		});
	}
	return regions.sort((a, b) => a.progressionOrder - b.progressionOrder);
}

export type RawWarframe = {
	name: string;
	uniqueName: string;
	type: string;
	imageName?: string;
	components?: { name: string; drops?: { location: string; rarity?: string; chance?: number }[] }[];
};

const SLOT_BY_COMPONENT: Record<string, Slot> = {
	Blueprint: 'bp',
	Neuroptics: 'neuroptics',
	Chassis: 'chassis',
	Systems: 'systems',
};

export function buildFrames(
	warframes: RawWarframe[],
	nodes: StarNode[],
): { frames: Warframe[]; bosses: Boss[] } {
	const nodeByKey = new Map(nodes.map((n) => [`${n.regionId}:${slugify(n.name)}`, n]));
	const frames: Warframe[] = [];
	const bossByNode = new Map<string, Boss>();

	for (const wf of warframes) {
		if (wf.type !== 'Warframe' || !wf.components) continue;
		// find the assassination node this frame links to (from any component's drops)
		let node: StarNode | undefined;
		const chanceBySlot = new Map<Slot, number>();
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (!slot) continue;
			for (const d of c.drops ?? []) {
				const loc = parseDropLocation(d.location);
				if (!loc || loc.type !== 'Assassination') continue;
				const key = `${slugify(loc.planet)}:${slugify(loc.node)}`;
				const n = nodeByKey.get(key);
				if (!n) continue;
				node = n;
				if (d.chance != null && slot !== 'bp') chanceBySlot.set(slot, d.chance);
			}
		}
		if (!node) continue;

		const frameId = slugify(wf.name);
		const parts: WarframePart[] = (['bp', 'neuroptics', 'chassis', 'systems'] as Slot[]).map(
			(slot) => ({
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: slot === 'bp' ? undefined : node!.id,
				chance: chanceBySlot.get(slot),
			}),
		);
		frames.push({ id: frameId, name: wf.name, nodeId: node.id, image: wf.imageName, parts });

		if (!bossByNode.has(node.id)) {
			bossByNode.set(node.id, {
				id: slugify(node.name),
				name: BOSS_BY_NODE[slugify(node.name)] ?? node.name,
				nodeId: node.id,
				faction: node.faction,
			});
		}
	}
	return { frames, bosses: [...bossByNode.values()] };
}
