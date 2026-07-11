export type Letter = 'A' | 'B' | 'C';

export interface CycleState {
	state: string; // "day"|"night" | "warm"|"cold" | "fass"|"vome" | "unknown"
	expiry: string; // ISO8601 ("" when missing)
}

export interface RotationState {
	letter: Letter | null; // null = underivable (no Narmer weapon found)
	expiry: string | null; // next flip; null when letter is null
}

export interface WorldState {
	ok: boolean;
	fetchedAt: string; // ISO8601
	cetus: CycleState;
	vallis: CycleState;
	cambion: CycleState;
	rotation: RotationState;
}
