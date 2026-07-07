<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { loadDataset } from '$lib/data/dataset';
	import type { Dataset } from '$lib/model/types';
	import StarChart from '$lib/starchart/StarChart.svelte';
	import RegionPanel from '$lib/panel/RegionPanel.svelte';
	import QuestsPanel from '$lib/panel/QuestsPanel.svelte';
	import { createTracker, type Tracker } from '$lib/tracker/tracker.svelte';
	import {
		loadOwned,
		saveOwned,
		loadQuests,
		saveQuests,
	} from '$lib/tracker/persistence';
	import { revealedRegions } from '$lib/model/reveal';
	import CommandPalette from '$lib/palette/CommandPalette.svelte';
	import { buildPaletteItems, type PaletteItem } from '$lib/palette/search';

	let data = $state<Dataset | null>(null);
	let tracker = $state<Tracker | null>(null);
	let selectedId = $state('venus');
	let paletteOpen = $state(false);
	let ready = false;

	onMount(async () => {
		const ds = await loadDataset();
		const t = createTracker(
			ds.warframes,
			(ids) => {
				if (browser && ready) saveOwned(ids);
			},
			(ids) => {
				if (browser && ready) saveQuests(ids);
			},
		);
		t.load(await loadOwned());
		t.loadQuestState(await loadQuests());
		ready = true;
		data = ds;
		tracker = t;
	});

	onDestroy(() => tracker?.dispose());

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		if (!data || !tracker) return 'none';
		// A region can have multiple Assassination-frame nodes (e.g. Jupiter:
		// Themisto→Valkyr and The Ropalolyst→Wisp) — aggregate across all of
		// them so the status only reports 'done' when every frame is complete.
		const frameIds = data.nodes
			.filter((n) => n.regionId === regionId && n.isAssassination && n.frameId)
			.map((n) => n.frameId!);
		let owned = 0;
		let total = 0;
		for (const fid of frameIds) {
			const c = tracker.frameCount(fid);
			owned += c.owned;
			total += c.total;
		}
		return owned === total && total > 0 ? 'done' : owned > 0 ? 'part' : 'none';
	}

	let visible = $derived(
		data && tracker ? revealedRegions(data, tracker.completedQuests) : [],
	);
	let planetRegions = $derived(visible.filter((r) => r.kind === 'planet'));
	let specialRegions = $derived(visible.filter((r) => r.kind === 'special'));
	let paletteItems = $derived(
		data
			? buildPaletteItems(data, new Set(visible.map((r) => r.id)))
			: ([] as PaletteItem[]),
	);

	$effect(() => {
		if (visible.length && !visible.some((r) => r.id === selectedId)) {
			selectedId = 'venus';
		}
	});

	function onWindowKey(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = true;
		}
	}

	function handlePick(item: PaletteItem) {
		if (item.targetRegionId) selectedId = item.targetRegionId;
		else if (item.type === 'resource') goto(`${base}/guides/${item.id}`);
	}
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="mx-auto max-w-6xl p-6 text-slate-100">
	<header class="mb-4 flex items-center gap-4">
		<span class="text-lg font-bold"
			>wf<span class="text-sky-400">oracle</span></span
		>
		<button
			type="button"
			data-open-palette
			onclick={() => (paletteOpen = true)}
			class="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-200"
		>
			Ctrl K
		</button>
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
				regions={planetRegions}
				{specialRegions}
				{selectedId}
				{statusOf}
				onselect={(id) => (selectedId = id)}
			/>
		</div>
		<RegionPanel dataset={data} regionId={selectedId} {tracker} />
		{#if data.quests.length}
			<div class="mt-4"><QuestsPanel dataset={data} {tracker} /></div>
		{/if}
	{:else}
		<div class="flex h-96 items-center justify-center text-slate-500">
			Loading Star Chart…
		</div>
	{/if}

	<footer class="mt-8 text-center text-xs text-slate-600">
		Planet art &amp; game data © Digital Extremes, via the Warframe wiki.
		Fan-made tool — not affiliated with Digital Extremes.
	</footer>

	<CommandPalette
		items={paletteItems}
		open={paletteOpen}
		onclose={() => (paletteOpen = false)}
		onselect={handlePick}
	/>
</div>
