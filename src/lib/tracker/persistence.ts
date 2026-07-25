import { browser } from '$app/environment';
import { openDB, type IDBPDatabase } from 'idb';

const DB = 'wforacle';
const STORE = 'tracking';
const KEY = 'ownedParts';
const KEY_QUESTS = 'completedQuests';
const KEY_ACCOUNT = 'accountId';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
	if (!dbp)
		dbp = openDB(DB, 1, {
			upgrade(d) {
				d.createObjectStore(STORE);
			},
		});
	return dbp;
}
export async function loadOwned(): Promise<string[]> {
	if (!browser && typeof indexedDB === 'undefined') return [];
	return (await (await db()).get(STORE, KEY)) ?? [];
}
export async function saveOwned(ids: string[]): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).put(STORE, ids, KEY);
}
export async function loadQuests(): Promise<string[]> {
	if (!browser && typeof indexedDB === 'undefined') return [];
	return (await (await db()).get(STORE, KEY_QUESTS)) ?? [];
}
export async function saveQuests(ids: string[]): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).put(STORE, ids, KEY_QUESTS);
}
export async function loadAccountId(): Promise<string | null> {
	if (!browser && typeof indexedDB === 'undefined') return null;
	return (await (await db()).get(STORE, KEY_ACCOUNT)) ?? null;
}
export async function saveAccountId(id: string): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).put(STORE, id, KEY_ACCOUNT);
}
export async function clearAccountId(): Promise<void> {
	if (!browser && typeof indexedDB === 'undefined') return;
	await (await db()).delete(STORE, KEY_ACCOUNT);
}

/**
 * Fire-and-forget an IndexedDB mutation without dropping its rejection.
 *
 * These are intentionally not awaited — they run from a `$effect`
 * (tracker.svelte.ts) or a click handler, and blocking the UI on IndexedDB
 * would be worse than the write failing. But a dropped promise means a
 * blocked-IDB or quota-exceeded failure vanishes as an unhandled rejection and
 * the user's progress is silently gone on their next visit.
 *
 * A named helper rather than four inline `.catch`es: these calls are the
 * complete set of mutations, and a fifth one added later that forgets to
 * handle rejection is precisely the regression this exists to make visible.
 *
 * `action` is a verb phrase ("saving owned parts", "clearing account id") so
 * the log line reads correctly for deletes as well as writes.
 */
export function persist(action: string, mutation: Promise<void>): void {
	void mutation.catch((e: unknown) => {
		console.error(`[persistence] ${action} failed:`, e);
	});
}
