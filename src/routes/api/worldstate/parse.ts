import type { CycleState, Letter, RotationState, WorldState } from '$lib/worldstate/types';

type RawCycle = { state?: string; expiry?: string };
type RawSyndicate = { syndicate?: string; expiry?: string; jobs?: { rewardPool?: string[] }[] };

const WEAPON_TO_LETTER: Record<string, Letter> = { Verdilac: 'A', Nepheri: 'B', Korumm: 'C' };

export function toCycle(raw: RawCycle): CycleState {
	return { state: raw?.state ?? 'unknown', expiry: raw?.expiry ?? '' };
}

/** Derive the current global rotation letter from the Narmer weapon present in
 * the reward pools (one of Verdilac/Nepheri/Korumm is always live post–New War).
 * Null when none is found (API change / pre-New-War snapshot). */
export function deriveRotation(syndicates: RawSyndicate[]): RotationState {
	const pool = syndicates.flatMap((m) => (m.jobs ?? []).flatMap((j) => j.rewardPool ?? []));
	let letter: Letter | null = null;
	for (const reward of pool) {
		const name = reward.split(' ')[0];
		// Object.hasOwn (not `in`) so a reward whose first token is an inherited
		// key like "constructor"/"toString" can't match a prototype member.
		if (Object.hasOwn(WEAPON_TO_LETTER, name)) {
			letter = WEAPON_TO_LETTER[name];
			break;
		}
	}
	const expiry = syndicates.find((m) => m.expiry)?.expiry ?? null;
	return { letter, expiry: letter ? expiry : null };
}

export function buildWorldState(
	cetus: RawCycle,
	vallis: RawCycle,
	cambion: RawCycle,
	syndicates: RawSyndicate[],
	nowIso: string,
): WorldState {
	return {
		ok: true,
		fetchedAt: nowIso,
		cetus: toCycle(cetus),
		vallis: toCycle(vallis),
		cambion: toCycle(cambion),
		rotation: deriveRotation(syndicates),
	};
}
