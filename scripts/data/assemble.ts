import type { Dataset, Resource } from '../../src/lib/model/types';
import { buildRegions, buildNodes, buildFrames, type SolNodes, type RawWarframe } from './build';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';

export type RawResource = { name: string; imageName?: string; type?: string };

export function buildResources(raw: RawResource[]): Resource[] {
	const imgByName = new Map(raw.map((r) => [r.name, r.imageName]));
	const regionsByResource = new Map<string, string[]>();
	for (const [region, rids] of Object.entries(PLANET_RESOURCES))
		for (const rid of rids)
			(regionsByResource.get(rid) ?? regionsByResource.set(rid, []).get(rid)!).push(region);
	return RESOURCES.map((r) => ({
		id: r.id,
		name: r.name,
		image: imgByName.get(r.name),
		regionIds: regionsByResource.get(r.id) ?? [],
		recommendations: RECOMMENDATIONS[r.id] ?? [],
	}));
}

export function assembleDataset(
	solNodes: SolNodes,
	warframes: RawWarframe[],
	rawResources: RawResource[],
): Dataset {
	const regions = buildRegions(solNodes);
	const nodes = buildNodes(solNodes);
	const { frames, bosses } = buildFrames(warframes, nodes);
	const bossByNode = new Map(bosses.map((b) => [b.nodeId, b]));
	const frameByNode = new Map(frames.map((f) => [f.nodeId!, f]));
	for (const n of nodes) {
		if (!n.isAssassination) continue;
		n.bossId = bossByNode.get(n.id)?.id;
		n.frameId = frameByNode.get(n.id)?.id;
	}
	const resources = buildResources(rawResources);
	return { regions, nodes, bosses, warframes: frames, resources };
}

export function validateDataset(ds: Dataset): string[] {
	const problems: string[] = [];
	const nodeIds = new Set(ds.nodes.map((n) => n.id));
	const bossIds = new Set(ds.bosses.map((b) => b.id));
	const frameIds = new Set(ds.warframes.map((f) => f.id));
	const regionIds = new Set(ds.regions.map((r) => r.id));
	const resourceIds = new Set(ds.resources.map((r) => r.id));
	for (const n of ds.nodes) {
		if (n.bossId && !bossIds.has(n.bossId))
			problems.push(`node ${n.id} → missing boss ${n.bossId}`);
		if (n.frameId && !frameIds.has(n.frameId))
			problems.push(`node ${n.id} → missing frame ${n.frameId}`);
	}
	for (const f of ds.warframes) {
		if (f.nodeId && !nodeIds.has(f.nodeId))
			problems.push(`frame ${f.id} → missing node ${f.nodeId}`);
		for (const p of f.parts) if (p.id !== `${f.id}:${p.slot}`) problems.push(`bad part id ${p.id}`);
	}
	for (const r of ds.regions) {
		for (const rid of r.resourceIds)
			if (!resourceIds.has(rid)) problems.push(`region ${r.id} → missing resource ${rid}`);
	}
	for (const r of ds.resources) {
		for (const rid of r.regionIds)
			if (!regionIds.has(rid)) problems.push(`resource ${r.id} → missing region ${rid}`);
		for (const rec of r.recommendations)
			if (rec.nodeId && !nodeIds.has(rec.nodeId))
				problems.push(`resource ${r.id} recommendation → missing node ${rec.nodeId}`);
	}
	const allIds = [...ds.regions.map((r) => r.id), ...frameIds];
	if (new Set(allIds).size !== allIds.length) problems.push('duplicate region/frame ids');
	return problems;
}
