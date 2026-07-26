import type { Recommendation } from '$lib/model/types';

export type Phase = Recommendation['phase'];

/**
 * The single phase vocabulary. Previously duplicated four times — identically
 * in the credits, affinity and [resource] guide pages, and re-spelled a fourth
 * time as inline classes in ResourceRail — which is how the boosterNote
 * fallback below came to exist on one copy and not the others.
 */
export const PHASE_LABEL: Record<Phase, string> = {
	early: '⚡ Early game',
	mid: '🌗 Mid game',
	late: '💀 Late / endgame',
};

export const PHASE_TAG: Record<Phase, string> = {
	early: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
	mid: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
	late: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

/** Badge form for the region panel's resource rail — "⚡ early best". */
export const PHASE_RAIL_LABEL: Record<Phase, string> = {
	early: '⚡ early best',
	mid: '🌗 mid best',
	late: '💀 late best',
};

/** Lead-in for the rail's per-recommendation lines — "⚡ Early: Ceres — Gabii". */
export const PHASE_SHORT_LABEL: Record<Phase, string> = {
	early: '⚡ Early',
	mid: '🌗 Mid',
	late: '💀 Late',
};

/** Text colour for a rail line whose farm is on the region being viewed. */
export const PHASE_TEXT: Record<Phase, string> = {
	early: 'text-emerald-300',
	mid: 'text-sky-300',
	late: 'text-amber-300',
};

/** The three phases in display order. */
export const PHASES: readonly Phase[] = ['early', 'mid', 'late'];

const PHASE_ORDER: Record<Phase, number> = { early: 0, mid: 1, late: 2 };

/**
 * Early recs first, then mid, then late. The dataset already emits them in
 * that order; sorting defensively keeps the layout stable if that changes.
 */
export function byPhase(recommendations: Recommendation[]): Recommendation[] {
	return [...recommendations].sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
}

/**
 * The booster line for a recommendation.
 *
 * `boosterNote` is optional (types.ts), and the fallback used to exist only on
 * the [resource] page — the bespoke credits and affinity pages rendered a bare
 * `{rec.boosterNote}`, so an entry without one would have printed "undefined".
 * Latent rather than live, because every curated credits/affinity rec happens
 * to set it, but that is a data coincidence and not a guarantee. Audit A2.
 */
export function boosterNote(rec: Recommendation): string {
	if (rec.boosterNote) return rec.boosterNote;
	return rec.boostersApply
		? 'Boosters help: this spot relies on enemy drop tables.'
		: "Boosters don't apply: this spot is a container/deposit pickup, not an enemy drop.";
}
