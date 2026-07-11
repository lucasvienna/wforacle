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
			const res = await fetch(`${base}/api/worldstate`);
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
		refresh();
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
