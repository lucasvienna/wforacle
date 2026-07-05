export type Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems';

export interface WarframePart {
  id: string;
  frameId: string;
  slot: Slot;
  dropSourceNodeId?: string;
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

export interface Region {
  id: string;
  name: string;
  kind: 'planet' | 'special';
  progressionOrder: number;
  factions: string[];
  nodeIds: string[];
  spoilerGated: boolean;
}

export interface Dataset {
  regions: Region[];
  nodes: StarNode[];
  bosses: Boss[];
  warframes: Warframe[];
}
