<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { seed } from '$lib/data/seed';
	import StarChart from '$lib/starchart/StarChart.svelte';
	import RegionPanel from '$lib/panel/RegionPanel.svelte';
	import { createTracker } from '$lib/tracker/tracker.svelte';
	import { loadOwned, saveOwned } from '$lib/tracker/persistence';

	let ready = false;
	const tracker = createTracker(seed.warframes, (ids) => {
		if (browser && ready) saveOwned(ids);
	});
	let selectedId = $state('venus');

	onMount(async () => {
		tracker.load(await loadOwned());
		ready = true;
	});

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		const node = seed.nodes.find((n) => n.regionId === regionId && n.isAssassination);
		if (!node?.frameId) return 'none';
		const c = tracker.frameCount(node.frameId);
		return c.owned === c.total && c.total > 0 ? 'done' : c.owned > 0 ? 'part' : 'none';
	}
</script>

<div class="mx-auto max-w-6xl p-6 text-slate-100">
	<header class="mb-4 flex items-center gap-4">
		<span class="text-lg font-bold">wf<span class="text-sky-400">oracle</span></span>
		<span class="ml-auto text-sm text-slate-400">
			Node Frames <b class="text-slate-100">{tracker.total.owned} / {tracker.total.total}</b>
		</span>
	</header>

	<div class="mb-4 rounded-xl border border-slate-700">
		<StarChart regions={seed.regions} {selectedId} {statusOf} onselect={(id) => (selectedId = id)} />
	</div>

	<RegionPanel dataset={seed} regionId={selectedId} {tracker} />
</div>
