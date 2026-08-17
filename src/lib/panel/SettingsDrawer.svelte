<script lang="ts">
	import Drawer from '$lib/ui/Drawer.svelte';
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

	function doReset() {
		tracker.reset();
		confirming = false;
	}
</script>

<Drawer
	{open}
	{onclose}
	title="Settings"
	closeLabel="Close settings"
	closeAttrs={{ 'data-close-settings': '' }}
	onopen={() => (confirming = false)}
>
	{#if dataset.quests.length}
		<QuestsPanel {dataset} {tracker} />
	{/if}

	<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
		<h2 class="mb-1 text-lg font-semibold text-wf-gold">Import from account</h2>
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
				<button type="button" onclick={() => (confirming = false)} class="text-sm text-wf-muted">
					Cancel
				</button>
			</div>
		{/if}
	</section>
</Drawer>
