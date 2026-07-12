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
	// Bind the expiry to the SAME mission whose reward pool yields the letter.
	// Unrelated syndicates (Arbiters, Suda, …) list first with a near-hourly
	// reset, so `syndicates.find(has-expiry)` would pin the "flips" countdown to
	// the wrong cadence and stick at 0s; the bounty-bearing missions carry the
	// true ~2.5h rotation expiry.
	for (const mission of syndicates) {
		const pool = (mission.jobs ?? []).flatMap((j) => j.rewardPool ?? []);
		for (const reward of pool) {
			const name = reward.split(' ')[0];
			// Object.hasOwn (not `in`) so a reward whose first token is an inherited
			// key like "constructor"/"toString" can't match a prototype member.
			if (Object.hasOwn(WEAPON_TO_LETTER, name)) {
				return { letter: WEAPON_TO_LETTER[name], expiry: mission.expiry ?? null };
			}
		}
	}
	return { letter: null, expiry: null };
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
