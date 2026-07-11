import type { Letter } from './types';

export type PartAvailability = 'available' | 'unavailable' | 'always' | 'unknown';

const LETTERS: Letter[] = ['A', 'B', 'C'];
const ROTATION_MS = 150 * 60 * 1000;

/** Availability of a component given its curated rotation and the live letter.
 * rotation is WarframePart.rotation: 'any' | 'A' | 'B' | 'C' | 'A/B' | undefined. */
export function partAvailability(
	rotation: string | undefined,
	letter: Letter | null,
): PartAvailability {
	if (rotation === undefined) return 'always';
	if (letter === null) return 'unknown';
	if (rotation === 'any') return 'available';
	return rotation.split('/').includes(letter) ? 'available' : 'unavailable';
}

/** When the part's required rotation is next active. Null when available now,
 * "any"/undefined, or the letter/expiry are unknown. Rotations cycle A→B→C→A
 * every 150 min; window i (1-based) starts at expiry + (i-1)·150min. */
export function nextActiveAt(
	rotation: string | undefined,
	letter: Letter | null,
	expiry: string | null,
): Date | null {
	if (rotation === undefined || rotation === 'any' || letter === null || expiry === null)
		return null;
	const required = rotation.split('/');
	if (required.includes(letter)) return null; // available now
	const curIdx = LETTERS.indexOf(letter);
	const expiryMs = new Date(expiry).getTime();
	for (let i = 1; i <= 3; i++) {
		const winLetter = LETTERS[(curIdx + i) % 3];
		if (required.includes(winLetter)) return new Date(expiryMs + (i - 1) * ROTATION_MS);
	}
	return null;
}

/** "1h15m" | "24m" | "38s" | "0s". Clamps negatives to "0s". */
export function formatCountdown(ms: number): string {
	if (ms <= 0) return '0s';
	const total = Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return `${h}h${m}m`;
	if (m > 0) return `${m}m`;
	return `${s}s`;
}
