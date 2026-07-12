<script lang="ts">
	import { tick } from 'svelte';
	import { trapFocus } from '$lib/actions/trapFocus';
	import type { Dataset } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import QuestsPanel from './QuestsPanel.svelte';

	let {
		dataset,
		tracker,
		open,
		onclose,
		onimport,
	}: {
		dataset: Dataset;
		tracker: Tracker;
		open: boolean;
		onclose: () => void;
		onimport: () => void;
	} = $props();

	let confirming = $state(false);
	let closeBtn: HTMLButtonElement | undefined = $state();
	let prevFocus: HTMLElement | null = null;

	$effect(() => {
		if (open) {
			confirming = false;
			prevFocus =
				typeof document !== 'undefined'
					? (document.activeElement as HTMLElement | null)
					: null;
			tick().then(() => closeBtn?.focus());
		} else {
			prevFocus?.focus?.();
		}
	});

	function doReset() {
		tracker.reset();
		confirming = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/50"
		onclick={onBackdropClick}
		role="presentation"
	></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Settings"
		class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-wf-edge bg-wf-panel p-5"
		onkeydown={onKey}
		tabindex="-1"
		use:trapFocus
	>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-wf-gold">Settings</h2>
			<button
				bind:this={closeBtn}
				data-close-settings
				type="button"
				aria-label="Close settings"
				class="text-wf-muted hover:text-wf-cyan"
				onclick={onclose}
			>
				✕
			</button>
		</div>

		{#if dataset.quests.length}
			<QuestsPanel {dataset} {tracker} />
		{/if}

		<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
			<h2 class="mb-1 text-lg font-semibold text-wf-gold">
				Import from account
			</h2>
			<p class="mb-3 text-xs text-wf-muted">
				Seed your tracked frames and quests from your Warframe account.
			</p>
			<button
				data-open-import
				type="button"
				onclick={onimport}
				class="rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
			>
				Import from account…
			</button>
		</section>

		<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
			<h2 class="mb-1 text-lg font-semibold text-wf-gold">Tracking</h2>
			<p class="mb-3 text-xs text-wf-muted">
				Clear every tracked Warframe part. This can't be undone.
			</p>
			{#if !confirming}
				<button
					data-reset-tracking
					type="button"
					onclick={() => (confirming = true)}
					class="rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
				>
					Reset tracked parts
				</button>
			{:else}
				<div class="flex items-center gap-3">
					<button
						data-confirm-reset
						type="button"
						onclick={doReset}
						class="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300"
					>
						Confirm reset
					</button>
					<button
						type="button"
						onclick={() => (confirming = false)}
						class="text-sm text-wf-muted"
					>
						Cancel
					</button>
				</div>
			{/if}
		</section>
	</div>
{/if}
