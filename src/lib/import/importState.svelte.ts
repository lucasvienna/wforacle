import type { Dataset } from '$lib/model/types';
import type { Tracker } from '$lib/tracker/tracker.svelte';
import { fetchProfile as realFetch, ProfileError, type ProfileErrorKind } from './profileClient';
import { parseProfile, type ImportResult } from './parseProfile';
import { normalizeAccountId } from './accountId';
import { loadAccountId, saveAccountId, clearAccountId, persist } from '$lib/tracker/persistence';

type Phase = 'idle' | 'loading' | 'preview' | 'error';

/**
 * Why the import failed, so the dialog can offer the right next action rather
 * than just different words. 'invalid' is ours (the id never left the browser);
 * the rest come from ProfileError, whose `kind` was populated in four places
 * and read in none (audit Q4c).
 */
export type ImportErrorKind = ProfileErrorKind | 'invalid' | 'unknown';

export function createImportStore(
	dataset: Dataset,
	deps: { fetchProfile?: typeof realFetch } = {},
) {
	const fetchProfile = deps.fetchProfile ?? realFetch;
	let phase = $state<Phase>('idle');
	let errorKind = $state<ImportErrorKind | null>(null);
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
			errorKind = 'invalid';
			error = "That doesn't look like a 24-character account ID.";
			return;
		}
		phase = 'loading';
		error = '';
		errorKind = null;
		try {
			const profile = await fetchProfile(id);
			result = parseProfile(profile, dataset);
			phase = 'preview';
		} catch (e) {
			phase = 'error';
			errorKind = e instanceof ProfileError ? e.kind : 'unknown';
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
			persist('saving account id', saveAccountId(id));
		}
		phase = 'idle';
		result = null;
	}

	function forget() {
		rememberedId = null;
		persist('clearing account id', clearAccountId());
	}

	function reset() {
		phase = 'idle';
		result = null;
		error = '';
		errorKind = null;
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
		get errorKind() {
			return errorKind;
		},
		get rememberedId() {
			return rememberedId;
		},
	};
}
export type ImportStore = ReturnType<typeof createImportStore>;
