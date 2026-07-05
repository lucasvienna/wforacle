import { SvelteSet } from 'svelte/reactivity';
import type { Warframe } from '$lib/model/types';
import { frameCompletion, datasetCompletion } from '$lib/model/completion';

export function createTracker(frames: Warframe[], persist?: (ids: string[]) => void) {
	const owned = new SvelteSet<string>();
	const byId = new Map(frames.map((f) => [f.id, f]));

	let dispose = () => {};
	if (persist) {
		dispose = $effect.root(() => {
			$effect(() => {
				persist([...owned]);
			});
		});
	}

	function togglePart(id: string) {
		if (owned.has(id)) owned.delete(id);
		else owned.add(id);
	}
	function toggleFrame(frameId: string) {
		const f = byId.get(frameId);
		if (!f) return;
		const anyMissing = f.parts.some((p) => !owned.has(p.id));
		for (const p of f.parts) {
			if (anyMissing) owned.add(p.id);
			else owned.delete(p.id);
		}
	}
	return {
		isOwned: (id: string) => owned.has(id),
		togglePart,
		toggleFrame,
		frameCount: (frameId: string) => {
			const f = byId.get(frameId);
			return f ? frameCompletion(f, owned) : { owned: 0, total: 0 };
		},
		get total() {
			return datasetCompletion(frames, owned);
		},
		snapshot: () => [...owned],
		load: (ids: string[]) => {
			owned.clear();
			for (const id of ids) owned.add(id);
		},
		dispose
	};
}
export type Tracker = ReturnType<typeof createTracker>;
