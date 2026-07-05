<script lang="ts">
	import type { Dataset } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';

	let {
		dataset,
		regionId,
		tracker,
	}: { dataset: Dataset; regionId: string; tracker: Tracker } = $props();

	const SLOT_LABEL = {
		bp: 'Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
	} as const;

	let region = $derived(dataset.regions.find((r) => r.id === regionId));
	let node = $derived(
		dataset.nodes.find((n) => n.regionId === regionId && n.isAssassination),
	);
	let boss = $derived(
		node ? dataset.bosses.find((b) => b.id === node!.bossId) : undefined,
	);
	let frame = $derived(
		node ? dataset.warframes.find((w) => w.id === node!.frameId) : undefined,
	);
</script>

<section class="rounded-xl border border-slate-700 bg-slate-900 p-4">
	{#if node && boss && frame}
		<h3 class="font-semibold">
			{node.name} — <span class="text-sky-300">{boss.name}</span>
		</h3>
		{@const count = tracker.frameCount(frame.id)}
		<p class="mb-3 text-sm text-slate-400">
			Drops {frame.name}
			· {count.owned}/{count.total} owned
		</p>
		{#each frame.parts as part (part.id)}
			{@const owned = tracker.isOwned(part.id)}
			<div
				data-part={part.id}
				data-owned={owned}
				role="button"
				tabindex="0"
				class={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800 ${owned ? 'bg-emerald-500/15' : ''}`}
				onclick={() => tracker.togglePart(part.id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						if (e.key === ' ') e.preventDefault();
						tracker.togglePart(part.id);
					}
				}}
			>
				<span
					class="inline-flex h-4 w-4 items-center justify-center rounded border"
					class:border-emerald-400={owned}>{owned ? '✓' : ''}</span
				>
				<span>{SLOT_LABEL[part.slot]}</span>
			</div>
		{/each}
		<button
			class="mt-2 text-sm text-sky-300"
			onclick={() => tracker.toggleFrame(frame!.id)}>Toggle whole frame</button
		>
	{:else}
		<p class="text-sm text-slate-400">
			{region?.name}: no Assassination frame here yet.
		</p>
	{/if}
</section>
