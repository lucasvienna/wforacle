import { browser } from '$app/environment';
import { openDB, type IDBPDatabase } from 'idb';

const DB = 'wforacle';
const STORE = 'tracking';
const KEY = 'ownedParts';
const KEY_QUESTS = 'completedQuests';

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
