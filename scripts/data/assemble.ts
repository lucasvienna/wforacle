import type { Dataset, Resource } from '../../src/lib/model/types';
import {
	buildRegions,
	buildNodes,
	buildFrames,
	buildOpenWorldFrames,
	type SolNodes,
	type RawWarframe,
} from './build';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { PLANETS, KEY_BOSS_SOLNODES } from './curated';
import { QUESTS, SPECIAL_REGIONS } from './special';
import { OPEN_WORLD_SOLNODES, OPEN_WORLD_FARMS } from './openworld';
import { slugify } from './parse';
import { partId } from '../../src/lib/model/completion';

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

/**
 * Curated nodeLabels that intentionally do not name a star-chart node.
 *
 * Every entry carries a reason, and that is the point: when this check fails,
 * the overwhelmingly likely cause is a game update renaming a node, not a new
 * category of exception. Silencing a failure by appending a pattern here
 * without a defensible `why` re-opens exactly the hole the check closes
 * (D1: a rename keeps the build green and the site wrong).
 */
const NON_NODE_LABELS: { pattern: RegExp; why: string }[] = [
	{
		pattern: /^Anywhere — /,
		why: 'not a place — the Daily First Win bonus applies to any mission',
	},
	{
		pattern: /^(Elite )?Sanctuary Onslaught\b/,
		why: 'Cephalon Simaris queue modes, entered from a relay rather than the chart',
	},
	{
		pattern: /Void Fissures \(rotating nodes\)/,
		why: 'fissures rotate across the chart; there is no fixed node to name',
	},
	{ pattern: /^Höllvania — /, why: 'the 1999 region is not part of the star chart' },
	{
		pattern: / Proxima — /,
		why: 'Railjack proxima regions; recRegionId deliberately leaves these unresolved so no "best farm here" badge lands on the parent planet',
	},
	{
		pattern: /^Venus — Profit-Taker Orb\b/,
		why: 'an Orb Vallis heist bounty, not a chart node',
	},
	{
		pattern: /^Neptune — The Index\b/,
		why: 'a Corpus game mode reached from Neptune; @wfcd solNodes carries no node of this name',
	},
	{
		pattern: /^Zariman — Void Cascade\b/,
		why: 'names the mission type rather than the node — see the Voidgel Orb recs, which say "Zariman — Tuvul Commons (Void Cascade)"',
	},
];

/**
 * Check every curated `nodeLabel` against the real node names in the dataset.
 *
 * The pipeline validates what comes from @wfcd but not what the maintainer
 * hand-writes — inverted risk, since hand-written labels rot fastest with game
 * updates and there is no upstream to notice for you. One shipped bug already
 * proved it (the Zariman slug, fixed in task 1.3).
 *
 * Deliberately NOT part of validateDataset: that function checks the assembled
 * dataset's internal referential integrity and is exercised by unit tests
 * against small fixtures, whereas this check is only meaningful against the
 * complete real node set. Running it over a truncated fixture would report
 * every label as broken. build-data.ts calls it separately.
 */
export function validateRecommendationLabels(ds: Dataset): string[] {
	const problems: string[] = [];
	const nodeNames = new Map<string, Set<string>>();
	for (const n of ds.nodes) {
		let names = nodeNames.get(n.regionId);
		if (!names) nodeNames.set(n.regionId, (names = new Set()));
		names.add(n.name);
	}

	for (const r of ds.resources) {
		for (const rec of r.recommendations) {
			const label = rec.nodeLabel;
			if (NON_NODE_LABELS.some((e) => e.pattern.test(label))) continue;

			const [prefix, ...rest] = label.split('—');
			if (rest.length === 0) {
				problems.push(
					`resource ${r.id}: nodeLabel "${label}" has no "Planet — Node" prefix and is not allowlisted`,
				);
				continue;
			}
			const regionId = slugify(prefix);
			const names = nodeNames.get(regionId);
			if (!names) {
				problems.push(`resource ${r.id}: nodeLabel "${label}" → unknown region "${prefix.trim()}"`);
				continue;
			}
			// Everything before the first parenthetical is the node name(s);
			// "Seimeni / Gabii" legitimately names two real nodes.
			const nodePart = rest.join('—').split('(')[0];
			for (const name of nodePart.split('/').map((s) => s.trim())) {
				if (!names.has(name))
					problems.push(
						`resource ${r.id}: nodeLabel "${label}" → no node "${name}" on ${regionId}`,
					);
			}
		}
	}
	return problems;
}

/**
 * Recommendations whose `lastVerified` is older than `maxAgeDays`. Warned on
 * rather than failed: a stale date means "nobody has re-read the wiki page
 * lately", which is worth surfacing but is not a broken build.
 */
export function staleRecommendations(
	ds: Dataset,
	now: Date,
	maxAgeDays = 183,
): { resourceId: string; nodeLabel: string; lastVerified: string }[] {
	const cutoff = new Date(now.getTime() - maxAgeDays * 86_400_000);
	const stale = [];
	for (const r of ds.resources)
		for (const rec of r.recommendations)
			if (new Date(rec.lastVerified) < cutoff)
				stale.push({
					resourceId: r.id,
					nodeLabel: rec.nodeLabel,
					lastVerified: rec.lastVerified,
				});
	return stale;
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
	const allSolNodes = { ...solNodes, ...KEY_BOSS_SOLNODES, ...OPEN_WORLD_SOLNODES };
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
	const openWorldFrames = buildOpenWorldFrames(warframes, OPEN_WORLD_FARMS);
	return {
		regions,
		nodes,
		bosses,
		warframes: [...frames, ...openWorldFrames],
		resources,
		quests: QUESTS,
		openWorldFarms: OPEN_WORLD_FARMS,
	};
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
		for (const p of f.parts)
			if (p.id !== partId(f.id, p.slot, p.aspect)) problems.push(`bad part id ${p.id}`);
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

	for (const f of ds.openWorldFarms) {
		if (!frameIds.has(f.frameId)) problems.push(`open-world farm → missing frame ${f.frameId}`);
		if (!nodeIds.has(f.nodeId)) problems.push(`open-world farm → missing node ${f.nodeId}`);
		if (!regionIds.has(f.regionId)) problems.push(`open-world farm → missing region ${f.regionId}`);
	}

	return problems;
}
