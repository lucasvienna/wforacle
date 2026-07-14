export type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems' | 'dayaspect' | 'nightaspect';

export interface WarframePart {
	id: string;
	frameId: string;
	slot: Slot;
	dropSourceNodeId?: string;
	chance?: number;
	/** Open-world bounty stage the component drops at, e.g. "L20–40". Absent for
	 * assassination parts and non-bounty sources (Exploiter Orb). */
	bountyTier?: string;
	/** Bounty rotation: "A" | "B" | "C" | "any" | joined like "A/B". Absent when N/A. */
	rotation?: string;
	/** Credit cost of buying this blueprint from the Market (`@wfcd/items`
	 * `bpCost`). Set only on `bp` parts that are a Market purchase; absent for
	 * drop-sourced, curated, and open-world blueprints. */
	marketCost?: number;
	/** Curated blueprint source label overriding the default rendering, for
	 * blueprints that are neither a Market purchase nor a resolvable
	 * assassination drop (quest / key-boss frames — Atlas, Mesa). Mirrors the
	 * required `OpenWorldFarm.bpSource`. */
	bpSource?: string;
}

export interface Warframe {
	id: string;
	name: string;
	/** Raw @wfcd/items Powersuit path, e.g. "/Lotus/Powersuits/Cowgirl/Cowgirl".
	 * Used to match a player's mastered frames from their profile. Always set by
	 * the build; optional so seed/test fixtures need not provide it. */
	uniqueName?: string;
	image?: string;
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
	phase: 'early' | 'late';
	nodeLabel: string;
	nodeId?: string;
	/** Main-planet region id the recommended node is on (parsed from nodeLabel);
	 * undefined for special-region nodes (Void/Lua/…). Drives the "best farm here" badge. */
	regionId?: string;
	boostersApply: boolean;
	note: string;
	source: string;
	lastVerified: string;
}

export interface Resource {
	id: string;
	name: string;
	image?: string;
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
