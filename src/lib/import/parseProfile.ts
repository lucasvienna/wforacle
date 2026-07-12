import type { Dataset, Warframe } from '$lib/model/types';
import { QUEST_MARKERS } from './questMarkers';

/** One item's mastery-affinity entry from a profile's xpInfo list. */
export interface ProfileXpEntry {
	uniqueName: string;
	xp?: number;
}

/** The slices of a warframestat.us profile this feature reads. */
export interface RawProfile {
	loadout?: { xpInfo?: ProfileXpEntry[] };
	challengeProgress?: { name: string; progress?: number }[];
}

export interface ImportResult {
	/** Tracked frame ids the player has mastered. */
	frameIds: string[];
	/** Every part id of those frames (bp + components). */
	partIds: string[];
	/** Tracked quest ids detected as complete. */
	questIds: string[];
	/** Owned powersuits that don't map to a tracked frame (drives the preview note). */
	ownedUntrackedCount: number;
}

/** The parent-folder codename segment of a Powersuit uniqueName, e.g.
 * "/Lotus/Powersuits/Cowgirl/CowgirlPrime" -> "Cowgirl". Prime/Umbra variants
 * share the base folder, so this collapses them onto the base frame. Returns
 * null for non-Powersuit paths and for archwings (not tracked frames). */
export function frameFolder(uniqueName: string): string | null {
	const segs = uniqueName.split('/').filter(Boolean);
	const i = segs.indexOf('Powersuits');
	if (i === -1 || segs.length < i + 2) return null;
	if (segs[i + 1] === 'Archwing') return null;
	return segs[segs.length - 2];
}

export function matchOwnedFrames(
	profile: RawProfile,
	frames: Warframe[],
): { frameIds: string[]; partIds: string[]; ownedUntrackedCount: number } {
	const frameByFolder = new Map<string, Warframe>();
	for (const f of frames) {
		if (!f.uniqueName) continue;
		const folder = frameFolder(f.uniqueName);
		if (folder) frameByFolder.set(folder, f);
	}
	const owned = new Set<string>();
	const untracked = new Set<string>();
	for (const entry of profile.loadout?.xpInfo ?? []) {
		const folder = frameFolder(entry.uniqueName);
		if (!folder) continue; // weapon / sentinel / archwing — not a tracked frame
		const frame = frameByFolder.get(folder);
		if (frame) owned.add(frame.id);
		else untracked.add(folder);
	}
	const byId = new Map(frames.map((f) => [f.id, f]));
	const frameIds = [...owned];
	const partIds: string[] = [];
	for (const id of frameIds) for (const p of byId.get(id)!.parts) partIds.push(p.id);
	return { frameIds, partIds, ownedUntrackedCount: untracked.size };
}

export function matchCompletedQuests(profile: RawProfile, quests: { id: string }[]): string[] {
	const names = new Set((profile.challengeProgress ?? []).map((c) => c.name));
	const done: string[] = [];
	for (const q of quests) {
		const markers = QUEST_MARKERS[q.id] ?? [];
		if (markers.some((m) => names.has(m))) done.push(q.id);
	}
	return done;
}

export function parseProfile(profile: RawProfile, dataset: Dataset): ImportResult {
	const { frameIds, partIds, ownedUntrackedCount } = matchOwnedFrames(profile, dataset.warframes);
	const questIds = matchCompletedQuests(profile, dataset.quests);
	return { frameIds, partIds, questIds, ownedUntrackedCount };
}
