import type { Dataset, Resource } from '../../src/lib/model/types';
import { buildRegions, buildNodes, buildFrames, type SolNodes, type RawWarframe } from './build';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { PLANETS, KEY_BOSS_SOLNODES } from './curated';
import { QUESTS, SPECIAL_REGIONS } from './special';
import { slugify } from './parse';

export type RawResource = { name: string; imageName?: string };

// Every real region slug — main planets AND curated special regions (Deimos,
// Void, …) — so a rec on a special region resolves its "best farm here" badge.
const REGION_IDS = new Set([
	...PLANETS.map((p) => slugify(p.name)),
	...SPECIAL_REGIONS.map((r) => slugify(r.name)),
]);

/** Parse the region id a recommendation's node is on, from its nodeLabel
 * ("Uranus — Ophelia (Survival)" → "uranus", "Deimos — Terrorem (Survival)" →
 * "deimos"). Returns undefined when the leading token isn't a known region. */
export function recRegionId(nodeLabel: string): string | undefined {
	const planet = slugify(nodeLabel.split('—')[0]);
	return REGION_IDS.has(planet) ? planet : undefined;
}

export function buildResources(raw: RawResource[]): Resource[] {
	// Prefer the first match for a given name and skip entries without an
	// imageName: a name can appear in both the 'Resources' and 'Misc'
	// categories (see sources.ts), and we don't want a later, image-less or
	// unrelated entry to overwrite an earlier, correct one.
	const imgByName = new Map<string, string>();
	for (const r of raw) {
		if (r.imageName && !imgByName.has(r.name)) imgByName.set(r.name, r.imageName);
	}
	const regionsByResource = new Map<string, string[]>();
	for (const [region, rids] of Object.entries(PLANET_RESOURCES))
		for (const rid of rids)
			(regionsByResource.get(rid) ?? regionsByResource.set(rid, []).get(rid)!).push(region);
	return RESOURCES.map((r) => ({
		id: r.id,
		name: r.name,
		image: imgByName.get(r.name),
		regionIds: regionsByResource.get(r.id) ?? [],
		recommendations: (RECOMMENDATIONS[r.id] ?? []).map((rec) => ({
			...rec,
			regionId: recRegionId(rec.nodeLabel),
		})),
	}));
}

export function assembleDataset(
	solNodes: SolNodes,
	warframes: RawWarframe[],
	rawResources: RawResource[],
): Dataset {
	// Merge in the curated Eris key-boss pseudo-nodes (Mutalist Alad V, Jordas
	// Golem): they're key-crafted boss missions absent from the game's real
	// solNodes data, so buildFrames has nothing to link Mesa/Atlas to without
	// them. Merged here — not inside buildNodes/buildRegions — so those stay
	// pure functions of their input for fixture-based unit tests.
	const allSolNodes = { ...solNodes, ...KEY_BOSS_SOLNODES };
	const regions = buildRegions(allSolNodes);
	const nodes = buildNodes(allSolNodes);
	const { frames, bosses } = buildFrames(warframes, nodes);
	const bossByNode = new Map(bosses.map((b) => [b.nodeId, b]));
	const frameByNode = new Map(frames.map((f) => [f.nodeId!, f]));
	for (const n of nodes) {
		if (!n.isAssassination) continue;
		n.bossId = bossByNode.get(n.id)?.id;
		n.frameId = frameByNode.get(n.id)?.id;
	}
	const resources = buildResources(rawResources);
	return { regions, nodes, bosses, warframes: frames, resources, quests: QUESTS };
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

	const questIds = new Set(ds.quests.map((q) => q.id));
	for (const q of ds.quests) {
		for (const rid of q.revealsRegionIds)
			if (!regionIds.has(rid)) problems.push(`quest ${q.id} → missing region ${rid}`);
		for (const fid of q.revealsFrameIds)
			if (!frameIds.has(fid)) problems.push(`quest ${q.id} → missing frame ${fid}`);
	}
	for (const r of ds.regions) {
		if (r.spoilerGated && (!r.questId || !questIds.has(r.questId)))
			problems.push(`region ${r.id} → missing gating quest`);
	}

	return problems;
}
