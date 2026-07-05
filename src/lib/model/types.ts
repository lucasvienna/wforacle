export type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems';

export interface WarframePart {
	id: string;
	frameId: string;
	slot: Slot;
	dropSourceNodeId?: string;
	chance?: number;
}

export interface Warframe {
	id: string;
	name: string;
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

export interface Region {
	id: string;
	name: string;
	kind: 'planet' | 'special';
	progressionOrder: number;
	factions: string[];
	nodeIds: string[];
	spoilerGated: boolean;
	resourceIds: string[];
}

export interface Dataset {
	regions: Region[];
	nodes: StarNode[];
	bosses: Boss[];
	warframes: Warframe[];
	resources: Resource[];
}
