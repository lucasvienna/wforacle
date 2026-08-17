<script lang="ts">
	import type { Dataset } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import CheckboxRow from '$lib/ui/CheckboxRow.svelte';

	let { dataset, tracker }: { dataset: Dataset; tracker: Tracker } = $props();

	const regionName = (id: string) => dataset.regions.find((r) => r.id === id)?.name ?? id;
</script>

<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
	<h2 class="mb-1 text-lg font-semibold text-wf-gold">Quests</h2>
	<p class="mb-4 text-xs text-wf-muted">
		Toggle the quests you've completed to reveal their regions.
	</p>
	{#if dataset.quests.length}
		<div class="space-y-2">
			{#each dataset.quests as q (q.id)}
				{@const done = tracker.isQuestDone(q.id)}
				<CheckboxRow
					checked={done}
					ontoggle={() => tracker.toggleQuest(q.id)}
					data-quest={q.id}
					data-done={done}
				>
					{#snippet children(isDone)}
						<div class="text-sm {isDone ? 'text-emerald-300' : 'text-slate-200'}">
							{q.name}
						</div>
						<p class="text-xs text-wf-muted">
							Reveals: {q.revealsRegionIds.map(regionName).join(', ')}
						</p>
					{/snippet}
				</CheckboxRow>
			{/each}
		</div>
	{/if}
</section>
