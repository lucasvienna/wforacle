<script lang="ts">
	import type { Dataset } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';

	let { dataset, tracker }: { dataset: Dataset; tracker: Tracker } = $props();

	const regionName = (id: string) =>
		dataset.regions.find((r) => r.id === id)?.name ?? id;
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
				<div
					data-quest={q.id}
					data-done={done}
					role="button"
					tabindex="0"
					class="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {done
						? 'border-emerald-500/30 bg-emerald-500/10'
						: ''}"
					onclick={() => tracker.toggleQuest(q.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							if (e.key === ' ') e.preventDefault();
							tracker.toggleQuest(q.id);
						}
					}}
				>
					<span
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] {done
							? 'border-emerald-400 bg-emerald-400 text-slate-950'
							: 'border-wf-edge text-transparent'}"
					>
						✓
					</span>
					<div class="min-w-0">
						<div class="text-sm {done ? 'text-emerald-300' : 'text-slate-200'}">
							{q.name}
						</div>
						<p class="text-xs text-wf-muted">
							Reveals: {q.revealsRegionIds.map(regionName).join(', ')}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
