import type { Dataset } from '$lib/model/types';
import type { Tracker } from '$lib/tracker/tracker.svelte';
import { fetchProfile as realFetch, ProfileError } from './profileClient';
import { parseProfile, type ImportResult } from './parseProfile';
import { normalizeAccountId } from './accountId';
import { loadAccountId, saveAccountId, clearAccountId } from '$lib/tracker/persistence';

type Phase = 'idle' | 'loading' | 'preview' | 'error';

export function createImportStore(
	dataset: Dataset,
	deps: { fetchProfile?: typeof realFetch } = {},
) {
	const fetchProfile = deps.fetchProfile ?? realFetch;
	let phase = $state<Phase>('idle');
	let result = $state<ImportResult | null>(null);
	let error = $state('');
	let rememberedId = $state<string | null>(null);

	async function init() {
		rememberedId = await loadAccountId();
	}

	async function run(rawId: string) {
		const id = normalizeAccountId(rawId);
		if (!id) {
			phase = 'error';
			error = "That doesn't look like a 24-character account ID.";
			return;
		}
		phase = 'loading';
		error = '';
		try {
			const profile = await fetchProfile(id);
			result = parseProfile(profile, dataset);
			phase = 'preview';
		} catch (e) {
			phase = 'error';
			error = e instanceof ProfileError ? e.message : 'Something went wrong. Please try again.';
		}
	}

	function apply(tracker: Tracker, rawId: string, remember: boolean) {
		if (!result) return;
		const parts = new Set(tracker.snapshot());
		for (const p of result.partIds) parts.add(p);
		tracker.load([...parts]);
		const quests = new Set(tracker.questSnapshot());
		for (const q of result.questIds) quests.add(q);
		tracker.loadQuestState([...quests]);

		const id = normalizeAccountId(rawId);
		if (remember && id) {
			rememberedId = id;
			void saveAccountId(id);
		}
		phase = 'idle';
		result = null;
	}

	function forget() {
		rememberedId = null;
		void clearAccountId();
	}

	function reset() {
		phase = 'idle';
		result = null;
		error = '';
	}

	return {
		init,
		run,
		apply,
		forget,
		reset,
		get phase() {
			return phase;
		},
		get result() {
			return result;
		},
		get error() {
			return error;
		},
		get rememberedId() {
			return rememberedId;
		},
	};
}
export type ImportStore = ReturnType<typeof createImportStore>;
