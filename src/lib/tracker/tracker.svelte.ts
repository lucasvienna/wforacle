import { SvelteSet } from 'svelte/reactivity';
import type { Warframe } from '$lib/model/types';
import { frameCompletion, datasetCompletion } from '$lib/model/completion';

export function createTracker(
	frames: Warframe[],
	persist?: (ids: string[]) => void,
	persistQuests?: (ids: string[]) => void,
) {
	const owned = new SvelteSet<string>();
	const completedQuests = new SvelteSet<string>();
	const byId = new Map(frames.map((f) => [f.id, f]));

	let dispose = () => {};
	if (persist || persistQuests) {
		dispose = $effect.root(() => {
			if (persist) {
				$effect(() => {
					persist([...owned]);
				});
			}
			if (persistQuests) {
				$effect(() => {
					persistQuests([...completedQuests]);
				});
			}
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
	function toggleQuest(id: string) {
		if (completedQuests.has(id)) completedQuests.delete(id);
		else completedQuests.add(id);
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
		isQuestDone: (id: string) => completedQuests.has(id),
		toggleQuest,
		questSnapshot: () => [...completedQuests],
		loadQuestState: (ids: string[]) => {
			completedQuests.clear();
			for (const id of ids) completedQuests.add(id);
		},
		get completedQuests() {
			return completedQuests as ReadonlySet<string>;
		},
		dispose,
	};
}
export type Tracker = ReturnType<typeof createTracker>;
