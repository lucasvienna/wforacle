export type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems';

/**
 * Bounty rotations a component can drop on. 'any' means all three; a pair
 * means exactly two. The pipeline sorts and dedupes before joining, so pairs
 * are always canonical — 'A/B', never 'B/A' (see pickBestStage in build.ts).
 *
 * A closed union is honest here because the game's rotation vocabulary is
 * closed. bountyTier deliberately stays `string` for the opposite reason: its
 * values are level ranges generated from upstream drop text, so a new tier
 * would turn a routine data refresh into a type error for no benefit —
 * nothing branches on it, it is rendered verbatim.
 */
export type Rotation = 'A' | 'B' | 'C' | 'A/B' | 'A/C' | 'B/C' | 'any';

export interface WarframePart {
	id: string;
	frameId: string;
	slot: Slot;
	dropSourceNodeId?: string;
	chance?: number;
	/** Open-world bounty stage the component drops at, e.g. "L20–40". Absent for
	 * assassination parts and non-bounty sources (Exploiter Orb). */
	bountyTier?: string;
	/** Bounty rotation the component drops on. Absent when N/A. */
	rotation?: Rotation;
	/** Credit cost of buying this blueprint from the Market (`@wfcd/items`
	 * `bpCost`). Set only on `bp` parts that are a Market purchase; absent for
	 * drop-sourced, curated, and open-world blueprints. */
	marketCost?: number;
	/** Curated blueprint source label overriding the default rendering, for
	 * blueprints that are neither a Market purchase nor a resolvable
	 * assassination drop (quest / key-boss frames — Atlas, Mesa). Mirrors the
	 * required `OpenWorldFarm.bpSource`. */
	bpSource?: string;
	/** For a composite frame assembled from sub-aspects (only Equinox), the
	 * aspect this leaf belongs to. Day and Night each contribute an Aspect
	 * Blueprint plus Neuroptics/Chassis/Systems. Absent on all normal parts. */
	aspect?: 'day' | 'night';
}

export interface Warframe {
	id: string;
	name: string;
	/** Raw @wfcd/items Powersuit path, e.g. "/Lotus/Powersuits/Cowgirl/Cowgirl".
	 * Used to match a player's mastered frames from their profile. Always set by
	 * the build; optional so seed/test fixtures need not provide it. */
	uniqueName?: string;
	nodeId?: string;
	parts: WarframePart[];
}

export interface Boss {
	id: string;
	name: string;
	nodeId: string;
	faction: string;
}

export interface StarNode {
	id: string;
	regionId: string;
	name: string;
	missionType: string;
	faction: string;
	isAssassination: boolean;
	bossId?: string;
	frameId?: string;
}

export interface Recommendation {
	phase: 'early' | 'mid' | 'late';
	nodeLabel: string;
	nodeId?: string;
	/** Main-planet region id the recommended node is on (parsed from nodeLabel);
	 * undefined for special-region nodes (Void/Lua/…). Drives the "best farm here" badge. */
	regionId?: string;
	boostersApply: boolean;
	/** Overrides the guide page's canned booster copy (which assumes enemy-drop
	 * vs container farms) for recs where neither framing is accurate, e.g.
	 * mission-payout resources like Cryotic. */
	boosterNote?: string;
	note: string;
	source: string;
	lastVerified: string;
}

export interface Resource {
	id: string;
	name: string;
	regionIds: string[];
	recommendations: Recommendation[];
}

export interface Quest {
	id: string;
	name: string;
	revealsRegionIds: string[];
	revealsFrameIds: string[];
}

export interface OpenWorldFarm {
	frameId: string;
	nodeId: string;
	regionId: string;
	componentSource: string;
	bpSource: string;
}

export interface Region {
	id: string;
	name: string;
	kind: 'planet' | 'special';
	progressionOrder: number;
	factions: string[];
	nodeIds: string[];
	spoilerGated: boolean;
	resourceIds: string[];
	questId?: string;
}

export interface Dataset {
	regions: Region[];
	nodes: StarNode[];
	bosses: Boss[];
	warframes: Warframe[];
	resources: Resource[];
	quests: Quest[];
	openWorldFarms: OpenWorldFarm[];
}
