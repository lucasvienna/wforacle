import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { WorldState } from './types';

export function createWorldStateStore() {
	let state = $state<WorldState | null>(null);
	let error = $state(false);
	let now = $state(Date.now());
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let tickTimer: ReturnType<typeof setInterval> | undefined;

	async function refresh() {
		try {
			// `cache: 'no-store'` so the 60s poll always reaches the network (and the
			// edge cache) instead of the browser's private HTTP cache. The API sets
			// only `s-maxage`, which shared caches honour but private caches ignore —
			// leaving the response heuristically cacheable in the browser. Without this,
			// a long-open tab keeps re-reading a stale body after a cycle flips, so its
			// countdowns decay to 0s and never recover.
			const res = await fetch(`${base}/api/worldstate`, { cache: 'no-store' });
			const data = (await res.json()) as WorldState | { ok: false };
			if (data && (data as WorldState).ok) {
				state = data as WorldState;
				error = false;
			} else {
				error = true; // keep last good `state`
			}
		} catch {
			error = true;
		}
	}

	if (browser) {
		void refresh();
		pollTimer = setInterval(refresh, 60_000);
		tickTimer = setInterval(() => {
			now = Date.now();
		}, 1000);
	}

	return {
		get state() {
			return state;
		},
		get error() {
			return error;
		},
		get now() {
			return now;
		},
		refresh,
		dispose() {
			if (pollTimer) clearInterval(pollTimer);
			if (tickTimer) clearInterval(tickTimer);
		},
	};
}

export type WorldStateStore = ReturnType<typeof createWorldStateStore>;
