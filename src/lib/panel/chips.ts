import type { Warframe, WarframePart } from '$lib/model/types';
import type { WorldState } from '$lib/worldstate/types';
import { partAvailability, nextActiveAt, formatCountdown } from '$lib/worldstate/availability';
import { CYCLE_GLYPH } from '$lib/worldstate/cycles';

/**
 * Live-worldstate chips for the region panel.
 *
 * These read `worldState`, `now` and ownership, all of which were RegionPanel
 * *props* rather than internal state — so taking them as parameters makes the
 * functions pure with no behaviour change, and lets the rules be asserted
 * directly instead of through render() + DOM queries.
 */

export interface Chip {
	cls: string;
	text: string;
}

const ZONE_CYCLE: Record<string, 'cetus' | 'vallis' | 'cambion'> = {
	'Plains of Eidolon': 'cetus',
	'Orb Vallis': 'vallis',
	'Cambion Drift': 'cambion',
};

/** "☀ day · 1h 12m" for a free-roam zone, or null when there's nothing to show. */
export function zoneCycleLine(
	nodeName: string,
	worldState: WorldState | null,
	now: number,
): string | null {
	if (!worldState) return null;
	const key = ZONE_CYCLE[nodeName];
	if (!key) return null;
	const cyc = worldState[key];
	// Guard against a missing ("") or malformed expiry so a bad API value
	// never renders as a "NaN" countdown.
	const expiryMs = cyc.expiry ? new Date(cyc.expiry).getTime() : NaN;
	if (!Number.isFinite(expiryMs)) return null;
	return `${CYCLE_GLYPH[cyc.state] ?? ''} ${cyc.state} · ${formatCountdown(expiryMs - now)}`;
}

/**
 * Per-part availability chip for an open-world component row. Null → render
 * nothing (bare bp slot, unknown rotation, or no live data).
 */
export function owAvailabilityChip(
	part: WarframePart,
	worldState: WorldState | null,
	now: number,
): Chip | null {
	if (!worldState || (part.slot === 'bp' && !part.dropSourceNodeId)) return null;
	const rot = worldState.rotation;
	const a = partAvailability(part.rotation, rot.letter);
	if (a === 'available') {
		const resets = rot.expiry
			? ` · resets ${formatCountdown(new Date(rot.expiry).getTime() - now)}`
			: '';
		return { cls: 'text-emerald-300', text: `● up now${resets}` };
	}
	if (a === 'always') return { cls: 'text-emerald-300', text: '● always available' };
	if (a === 'unavailable') {
		const next = nextActiveAt(part.rotation, rot.letter, rot.expiry);
		const when = next ? ` · up in ${formatCountdown(next.getTime() - now)}` : '';
		return { cls: 'text-wf-muted', text: `○ Rot ${part.rotation}${when}` };
	}
	return null;
}

/**
 * Collapsed-state farm cue for a free-roam frame: is any still-needed
 * component — or drop-sourced blueprint — available on the current rotation?
 * Null when there's no live data or nothing left to farm (a completed frame
 * shows its ✓ instead).
 *
 * Takes `isOwned` rather than a whole Tracker: that is all it needs, and it
 * keeps the tests from having to build one.
 */
export function owSummary(
	frame: Warframe,
	worldState: WorldState | null,
	isOwned: (partId: string) => boolean,
): Chip | null {
	if (!worldState) return null;
	const letter = worldState.rotation.letter;
	const needed = frame.parts.filter(
		(p) => (p.slot !== 'bp' || p.dropSourceNodeId != null) && !isOwned(p.id),
	);
	if (needed.length === 0) return null;
	const upNow = needed.some((p) => {
		const a = partAvailability(p.rotation, letter);
		return a === 'available' || a === 'always';
	});
	if (upNow) return { cls: 'text-emerald-300', text: '● up now' };
	// Letter underivable → we can't claim "not this rotation" (matches the
	// per-part chip, which renders nothing for the `unknown` case).
	if (letter === null) return null;
	return { cls: 'text-wf-muted', text: '○ not this rotation' };
}
