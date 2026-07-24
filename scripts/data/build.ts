import type {
	Region,
	StarNode,
	Warframe,
	Boss,
	Slot,
	WarframePart,
	OpenWorldFarm,
} from '../../src/lib/model/types';
import { parseNodeValue, slugify, parseDropLocation } from './parse';
import {
	PLANETS,
	BOSS_BY_NODE,
	KEY_BOSS_DROP_LOCATIONS,
	ASSASSINATION_BP_SOURCE,
	ASSASSINATION_ASPECTS,
} from './curated';
import { SPECIAL_REGIONS, SPECIAL_REGION_NAMES } from './special';
import { PER_RUN_ROTATION_FARMS } from './openworld';
import { PLANET_RESOURCES } from './farming';
import { partId } from '../../src/lib/model/completion';

export type SolNodes = Record<string, { value: string; enemy: string; type: string }>;

const ACCEPTED_PLANETS = new Set([...PLANETS.map((p) => p.name), ...SPECIAL_REGION_NAMES]);

export function buildNodes(solNodes: SolNodes): StarNode[] {
	const out: StarNode[] = [];
	for (const [id, v] of Object.entries(solNodes)) {
		const parsed = parseNodeValue(v.value);
		if (!parsed || !ACCEPTED_PLANETS.has(parsed.planet)) continue;
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
			resourceIds: PLANET_RESOURCES[id] ?? [],
		});
	}
	for (const sr of SPECIAL_REGIONS) {
		const id = slugify(sr.name);
		const rn = byRegion.get(id);
		if (!rn) continue;
		regions.push({
			id,
			name: sr.name,
			kind: 'special',
			progressionOrder: sr.order,
			factions: [sr.faction],
			spoilerGated: sr.spoilerGated,
			nodeIds: rn.map((n) => n.id),
			resourceIds: PLANET_RESOURCES[id] ?? [],
			questId: sr.questId,
		});
	}
	return regions.sort((a, b) => a.progressionOrder - b.progressionOrder);
}

export type RawWarframe = {
	name: string;
	uniqueName: string;
	type: string;
	imageName?: string;
	bpCost?: number;
	components?: { name: string; drops?: { location: string; rarity?: string; chance?: number }[] }[];
};

/** Resolve a raw WFCD drop-location string to its planet/node/type. Falls back
 * to the curated key-boss map for strings that don't fit the standard
 * "Planet/Node (Type)" format (e.g. "Mutalist Alad V Assassinate, Rotation
 * C" — a key-crafted boss mission on Eris, not a star-chart SolNode). */
export function resolveDropLocation(
	loc: string,
): { planet: string; node: string; type: string } | null {
	return parseDropLocation(loc) ?? KEY_BOSS_DROP_LOCATIONS[loc.split(',')[0].trim()] ?? null;
}

const SLOT_BY_COMPONENT: Record<string, Slot> = {
	Blueprint: 'bp',
	Neuroptics: 'neuroptics',
	Chassis: 'chassis',
	Systems: 'systems',
};

// Raw @wfcd component name → aspect side. Equinox's Day/Night Aspect components
// each expand into four trackable leaves (Aspect Blueprint + 3 components); the
// raw component supplies the node link and the Aspect Blueprint's drop chance.
const ASPECT_BY_COMPONENT: Record<string, 'day' | 'night'> = {
	'Day Aspect': 'day',
	'Night Aspect': 'night',
};

const ORDER: Slot[] = ['bp', 'neuroptics', 'chassis', 'systems'];

export interface BountyStage {
	chance: number;
	bountyTier?: string;
	rotation?: string;
}

/** Pick the single best bounty stage (tier + rotation) a component drops at.
 * See the plan's Task 2 for the full selection rule. */
export function bestBountyStage(
	drops: { location: string; chance?: number }[],
): BountyStage | null {
	const eligible = drops.filter((d) => d.location && !/Plague Star/i.test(d.location));
	if (!eligible.length) return null;

	// 1. Sum chances per exact location string (collapses a stage's sub-rewards;
	//    keeps different zones/tiers/rotations separate).
	const byLoc = new Map<string, number>();
	for (const d of eligible) byLoc.set(d.location, (byLoc.get(d.location) ?? 0) + (d.chance ?? 0));

	// 2. Group by (zone, tier); a group's chance is its best rotation, and it
	//    records the rotations achieving that max.
	type Group = { tier?: string; lo: number; chance: number; rots: string[] };
	const groups = new Map<string, Group>();
	// NB: rotation-collapse compares summed chances with strict equality. This
	// holds because @wfcd/items lists identical per-item chances across a stage's
	// A/B/C rotations; if upstream ever emitted last-digit-different sums, the
	// "any" collapse would degrade to "A/B/C" rather than misbehave.
	for (const [loc, chance] of byLoc) {
		const zone = loc.split('(')[0].trim();
		const lvl = loc.match(/Level\s*(\d+)\s*-\s*(\d+)/);
		const tier = lvl ? `L${lvl[1]}–${lvl[2]}` : undefined;
		const lo = lvl ? Number(lvl[1]) : 0;
		const rotM = loc.match(/Rotation ([A-C])/);
		const rot = rotM ? rotM[1] : undefined;
		const key = `${zone}|${tier ?? ''}`;
		const g = groups.get(key);
		if (!g) {
			groups.set(key, { tier, lo, chance, rots: rot ? [rot] : [] });
		} else if (chance > g.chance) {
			g.chance = chance;
			g.rots = rot ? [rot] : [];
		} else if (chance === g.chance && rot) {
			g.rots.push(rot);
		}
	}

	// 3. Winner: highest chance, tie → lowest tier level.
	let best: Group | null = null;
	for (const g of groups.values()) {
		if (!best || g.chance > best.chance || (g.chance === best.chance && g.lo < best.lo)) best = g;
	}
	if (!best) return null;

	// 4. Rotation label: all three → "any"; none → undefined; else sorted join.
	const rots = [...new Set(best.rots)].sort();
	const rotation = rots.length === 0 ? undefined : rots.length === 3 ? 'any' : rots.join('/');
	return { chance: best.chance, bountyTier: best.tier, rotation };
}

/** Resolve a frame's blueprint `bp` part by source precedence: its own
 * Assassination drop (Wisp → Ropalolyst) → curated label (Atlas, Mesa) →
 * Market credit purchase (`bpCost`) → bare Market (no extra field). No real
 * frame has more than one source; precedence is a defensive ordering. */
function buildBpPart(
	frameId: string,
	bpDrop: { nodeId: string; chance?: number } | undefined,
	bpCost: number | undefined,
): WarframePart {
	const base = { id: partId(frameId, 'bp'), frameId, slot: 'bp' as const };
	if (bpDrop) return { ...base, dropSourceNodeId: bpDrop.nodeId, chance: bpDrop.chance };
	const bpSource = ASSASSINATION_BP_SOURCE[frameId];
	if (bpSource) return { ...base, bpSource };
	if (bpCost != null) return { ...base, marketCost: bpCost };
	return base;
}

/** Expand one aspect side into its trackable leaves: the Aspect Blueprint
 * (slot `bp`, chance from the raw Day/Night Aspect drop) followed by the curated
 * components. All share the boss node and carry the `aspect` tag; ids are
 * aspect-scoped so Day and Night never collide. */
function buildAspectLeaves(
	frameId: string,
	aspect: 'day' | 'night',
	nodeId: string,
	aspectChance: number | undefined,
	components: { slot: Slot; chance: number }[],
): WarframePart[] {
	const leaf = (slot: Slot, chance: number | undefined): WarframePart => ({
		id: partId(frameId, slot, aspect),
		frameId,
		slot,
		aspect,
		dropSourceNodeId: nodeId,
		chance,
	});
	return [leaf('bp', aspectChance), ...components.map((c) => leaf(c.slot, c.chance))];
}

export function buildFrames(
	warframes: RawWarframe[],
	nodes: StarNode[],
): { frames: Warframe[]; bosses: Boss[] } {
	const nodeByKey = new Map(nodes.map((n) => [`${n.regionId}:${slugify(n.name)}`, n]));
	const frames: Warframe[] = [];
	const bossByNode = new Map<string, Boss>();

	for (const wf of warframes) {
		if (wf.type !== 'Warframe' || !wf.components) continue;
		// Find the assassination node this frame links to. Node linking comes
		// ONLY from non-bp component drops (a frame's farm node is where its
		// COMPONENTS drop). A blueprint's own Assassination drop (Wisp:
		// Ropalolyst) is captured separately as `bpDrop` for display, and must
		// never fabricate a node/frame on its own.
		let node: StarNode | undefined;
		const chanceBySlot = new Map<Slot, number>();
		const aspectChance = new Map<'day' | 'night', number>();
		let bpDrop: { nodeId: string; chance?: number } | undefined;
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			const aspect = ASPECT_BY_COMPONENT[c.name];
			if (!slot && !aspect) continue;
			for (const d of c.drops ?? []) {
				const loc = resolveDropLocation(d.location);
				if (!loc || loc.type !== 'Assassination') continue;
				const key = `${slugify(loc.planet)}:${slugify(loc.node)}`;
				const n = nodeByKey.get(key);
				if (!n) continue;
				if (slot === 'bp') {
					bpDrop = { nodeId: n.id, chance: d.chance ?? undefined };
				} else if (aspect) {
					node = n;
					if (d.chance != null) aspectChance.set(aspect, d.chance);
				} else {
					node = n;
					if (d.chance != null) chanceBySlot.set(slot!, d.chance);
				}
			}
		}
		if (!node) continue;

		const frameId = slugify(wf.name);
		const present = new Set<Slot>(['bp']);
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (slot) present.add(slot);
		}
		const parts: WarframePart[] = ORDER.filter((slot) => present.has(slot)).map((slot) => {
			if (slot === 'bp') return buildBpPart(frameId, bpDrop, wf.bpCost);
			return {
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: node!.id,
				chance: chanceBySlot.get(slot),
			};
		});
		const aspects = ASSASSINATION_ASPECTS[frameId];
		if (aspects) {
			for (const side of ['day', 'night'] as const) {
				parts.push(
					...buildAspectLeaves(frameId, side, node!.id, aspectChance.get(side), aspects[side]),
				);
			}
		}
		frames.push({
			id: frameId,
			name: wf.name,
			uniqueName: wf.uniqueName,
			nodeId: node.id,
			image: wf.imageName,
			parts,
		});

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

/** A Blueprint's drop rows may be vendor/quest entries ("Cephalon Simaris,
 * Complete …" @100, "Vox Solaris, Agent") rather than farmable drops. Only
 * node-shaped ("Planet/Node (Type)") or bounty-shaped locations may turn the
 * bp part into a drop-sourced row. */
function isFarmDropLocation(loc: string): boolean {
	return parseDropLocation(loc) != null || /Bounty\)/.test(loc);
}

export function buildOpenWorldFrames(warframes: RawWarframe[], farms: OpenWorldFarm[]): Warframe[] {
	const byId = new Map(warframes.map((w) => [slugify(w.name), w]));
	// Primary node = the first farm listed for each frame (drives Warframe.nodeId
	// and the command palette's region for the frame).
	const primaryNode = new Map<string, string>();
	for (const f of farms) if (!primaryNode.has(f.frameId)) primaryNode.set(f.frameId, f.nodeId);

	const frames: Warframe[] = [];
	for (const [frameId, nodeId] of primaryNode) {
		const wf = byId.get(frameId);
		if (!wf?.components) continue;
		const present = new Set<Slot>(['bp']);
		const stageBySlot = new Map<Slot, BountyStage | null>();
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (!slot) continue;
			present.add(slot);
			const drops =
				slot === 'bp'
					? (c.drops ?? []).filter((d) => isFarmDropLocation(d.location))
					: (c.drops ?? []);
			stageBySlot.set(slot, bestBountyStage(drops));
		}
		// Per-run-rotation farms (Granum Void, Shrine Defense, mission-node
		// farms): the rotation letter parsed from drop locations is an in-run
		// rank/cadence, not the 150-min bounty cycle, so it's discarded; curated
		// tier labels replace it.
		const perRun = PER_RUN_ROTATION_FARMS[frameId];
		const parts: WarframePart[] = ORDER.filter((s) => present.has(s)).map((slot) => {
			const stage = stageBySlot.get(slot);
			// A bp without a farmable drop stays bare: the panel renders the
			// farm's bpSource label for it (quest/Market/vendor blueprints).
			if (slot === 'bp' && !stage) return { id: partId(frameId, slot), frameId, slot };
			return {
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: nodeId,
				chance: stage?.chance,
				bountyTier: perRun ? perRun[slot] : stage?.bountyTier,
				rotation: perRun ? undefined : stage?.rotation,
			};
		});
		frames.push({
			id: frameId,
			name: wf.name,
			uniqueName: wf.uniqueName,
			nodeId,
			image: wf.imageName,
			parts,
		});
	}
	return frames;
}
