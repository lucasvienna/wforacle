import { browser } from '$app/environment';
import { resolve } from '$app/paths';
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
			const res = await fetch(resolve('/api/worldstate'), { cache: 'no-store' });
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

	// Poll only while the tab is visible (audit P2). A background tab kept the
	// 60s poll and the 1s ticker running forever, spending the user's battery
	// and our edge requests to update a countdown nobody is looking at. On
	// becoming visible again we refresh immediately, because whatever is on
	// screen is by then up to a poll interval stale.
	function onVisibility() {
		if (document.hidden) {
			stopTimers();
		} else {
			// `now` drives every countdown and only advances on the 1s tick, so
			// without this the first frame after returning renders with the
			// pre-hide timestamp — visibly wrong for up to a second.
			now = Date.now();
			void refresh();
			startTimers();
		}
	}

	function startTimers() {
		pollTimer ??= setInterval(refresh, 60_000);
		tickTimer ??= setInterval(() => {
			now = Date.now();
		}, 1000);
	}

	function stopTimers() {
		if (pollTimer) clearInterval(pollTimer);
		if (tickTimer) clearInterval(tickTimer);
		pollTimer = undefined;
		tickTimer = undefined;
	}

	if (browser) {
		// The one fetch always happens: the page needs data even if it was opened
		// into a background tab and is read later.
		void refresh();
		// But only start the timers if the tab is actually visible. Gating just
		// the visibilitychange transition was not enough — a store created while
		// hidden ("open link in new tab") polled every 60s until the tab was
		// first shown, which is the exact cost P2 is about.
		if (!document.hidden) startTimers();
		document.addEventListener('visibilitychange', onVisibility);
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
			stopTimers();
			if (browser) document.removeEventListener('visibilitychange', onVisibility);
		},
	};
}

export type WorldStateStore = ReturnType<typeof createWorldStateStore>;
