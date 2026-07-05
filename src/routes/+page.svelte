<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { loadDataset } from '$lib/data/dataset';
	import type { Dataset } from '$lib/model/types';
	import StarChart from '$lib/starchart/StarChart.svelte';
	import RegionPanel from '$lib/panel/RegionPanel.svelte';
	import { createTracker, type Tracker } from '$lib/tracker/tracker.svelte';
	import { loadOwned, saveOwned } from '$lib/tracker/persistence';

	let data = $state<Dataset | null>(null);
	let tracker = $state<Tracker | null>(null);
	let selectedId = $state('venus');
	let ready = false;

	onMount(async () => {
		const ds = await loadDataset();
		const t = createTracker(ds.warframes, (ids) => {
			if (browser && ready) saveOwned(ids);
		});
		t.load(await loadOwned());
		ready = true;
		data = ds;
		tracker = t;
	});

	onDestroy(() => tracker?.dispose());

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		if (!data || !tracker) return 'none';
		const node = data.nodes.find(
			(n) => n.regionId === regionId && n.isAssassination,
		);
		if (!node?.frameId) return 'none';
		const c = tracker.frameCount(node.frameId);
		return c.owned === c.total && c.total > 0
			? 'done'
			: c.owned > 0
				? 'part'
				: 'none';
	}
</script>

<div class="mx-auto max-w-6xl p-6 text-slate-100">
	<header class="mb-4 flex items-center gap-4">
		<span class="text-lg font-bold"
			>wf<span class="text-sky-400">oracle</span></span
		>
		{#if tracker}
			<span class="ml-auto text-sm text-slate-400">
				Node Frames <b class="text-slate-100"
					>{tracker.total.owned} / {tracker.total.total}</b
				>
			</span>
		{/if}
	</header>

	{#if data && tracker}
		<div class="mb-4 overflow-hidden rounded-xl border border-slate-700">
			<StarChart
				regions={data.regions}
				{selectedId}
				{statusOf}
				onselect={(id) => (selectedId = id)}
			/>
		</div>
		<RegionPanel dataset={data} regionId={selectedId} {tracker} />
	{:else}
		<div class="flex h-96 items-center justify-center text-slate-500">
			Loading Star Chart…
		</div>
	{/if}

	<footer class="mt-8 text-center text-xs text-slate-600">
		Planet art &amp; game data © Digital Extremes, via the Warframe wiki.
		Fan-made tool — not affiliated with Digital Extremes.
	</footer>
</div>
