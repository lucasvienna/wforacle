<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { asset, resolve } from '$app/paths';
	import { loadDataset } from '$lib/data/dataset';
	import type { Dataset } from '$lib/model/types';
	import StarChart from '$lib/starchart/StarChart.svelte';
	import RegionPanel from '$lib/panel/RegionPanel.svelte';
	import SettingsDrawer from '$lib/panel/SettingsDrawer.svelte';
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
	import {
		createWorldStateStore,
		type WorldStateStore,
	} from '$lib/worldstate/worldstate.svelte';
	import WorldStateTicker from '$lib/worldstate/WorldStateTicker.svelte';
	import ImportDialog from '$lib/import/ImportDialog.svelte';
	import {
		createImportStore,
		type ImportStore,
	} from '$lib/import/importState.svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { webApplicationLd } from '$lib/seo/jsonld';
	import type { PageProps } from './$types';

	const HOME_DESCRIPTION =
		'Interactive Warframe Star Chart tracker: mark owned frames, find every Warframe part location, and discover the best early and late-game resource farms.';

	let { data }: PageProps = $props();

	let dataset = $state<Dataset | null>(null);
	let tracker = $state<Tracker | null>(null);
	let ws = $state<WorldStateStore | null>(null);
	let importStore = $state<ImportStore | null>(null);
	let selectedId = $state('venus');
	let paletteOpen = $state(false);
	let settingsOpen = $state(false);
	let importOpen = $state(false);
	let ready = false;

	const IMPORT_ACTION: PaletteItem = {
		type: 'action',
		id: 'import',
		label: 'Import from account',
		sublabel: 'Sync owned frames & quests',
	};

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
		dataset = ds;
		tracker = t;
		ws = createWorldStateStore();
		importStore = createImportStore(ds);
		importStore.init();
	});

	onDestroy(() => {
		tracker?.dispose();
		ws?.dispose();
	});

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		if (!dataset || !tracker) return 'none';
		// A region can have multiple Assassination-frame nodes (e.g. Jupiter:
		// Themisto→Valkyr and The Ropalolyst→Wisp) — aggregate across all of
		// them so the status only reports 'done' when every frame is complete.
		const frameIds = dataset.nodes
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
		dataset && tracker ? revealedRegions(dataset, tracker.completedQuests) : [],
	);
	let planetRegions = $derived(visible.filter((r) => r.kind === 'planet'));
	let specialRegions = $derived(visible.filter((r) => r.kind === 'special'));
	let paletteItems = $derived(
		dataset
			? [
					...buildPaletteItems(dataset, new Set(visible.map((r) => r.id))),
					IMPORT_ACTION,
				]
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
		if (item.type === 'action' && item.id === 'import') importOpen = true;
		else if (item.targetRegionId) selectedId = item.targetRegionId;
		else if (item.type === 'resource')
			goto(resolve('/guides/[resource]', { resource: item.id }));
	}
</script>

<SeoHead
	title="wforacle — Warframe Star Chart & Resource Farming Tracker"
	description={HOME_DESCRIPTION}
	path="/"
	type="website"
	jsonLd={webApplicationLd()}
/>

<svelte:window onkeydown={onWindowKey} />

<div class="mx-auto max-w-screen-2xl p-6 text-slate-100">
	<header class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
		<span class="text-lg font-bold text-wf-gold"
			>wf<span class="text-wf-cyan">oracle</span></span
		>
		<div class="ml-auto flex items-center gap-2 sm:gap-3">
			<button
				type="button"
				data-open-palette
				onclick={() => (paletteOpen = true)}
				class="flex items-center gap-2 rounded-lg border border-wf-edge bg-wf-panel px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
			>
				<span aria-hidden="true">🔍</span>
				Search
				<kbd
					class="rounded border border-wf-edge px-1 text-[10px] text-wf-muted"
					>Ctrl K</kbd
				>
			</button>
			<a
				href={resolve('/guides/credits')}
				title="Credits farming guide"
				aria-label="Credits farming guide"
				class="rounded-lg border border-wf-edge bg-wf-panel px-2.5 py-1.5 hover:border-wf-cyan/40"
			>
				<img src={asset('/resources/credits.webp')} alt="" class="h-4 w-4" />
			</a>
			<a
				href={resolve('/guides/affinity')}
				title="Affinity farming guide"
				aria-label="Affinity farming guide"
				class="rounded-lg border border-wf-edge bg-wf-panel px-2.5 py-1.5 hover:border-wf-cyan/40"
			>
				<img src={asset('/resources/affinity.webp')} alt="" class="h-4 w-4" />
			</a>
			{#if tracker}
				<div
					class="flex items-center gap-2 rounded-lg border border-wf-edge bg-wf-panel px-3 py-1.5 text-xs text-wf-muted"
					title="Node frame parts owned"
				>
					<span
						>Frame Parts <b class="text-wf-gold"
							>{tracker.total.owned}/{tracker.total.total}</b
						></span
					>
					<span
						class="relative h-1.5 w-16 overflow-hidden rounded-full bg-wf-edge"
					>
						<span
							class="absolute inset-y-0 left-0 rounded-full bg-wf-cyan"
							style="width: {tracker.total.total
								? (tracker.total.owned / tracker.total.total) * 100
								: 0}%"
						></span>
					</span>
				</div>
			{/if}
			{#if dataset && tracker}
				<button
					type="button"
					data-open-settings
					aria-label="Settings"
					onclick={() => (settingsOpen = true)}
					class="relative rounded-lg border border-wf-edge bg-wf-panel px-2.5 py-1.5 text-wf-muted hover:text-wf-cyan"
				>
					<span aria-hidden="true">⚙</span>
					{#if dataset.quests.some((q) => !tracker?.isQuestDone(q.id))}
						<span
							aria-hidden="true"
							class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-wf-gold"
						></span>
					{/if}
				</button>
			{/if}
		</div>
	</header>

	<div class="mb-4">
		<h1 class="text-xl font-bold text-slate-100">
			Warframe Star Chart Tracker
		</h1>
		<p class="mt-1 text-sm text-wf-muted">
			Track which Warframes you own, find the best farming spots for every
			planet and boss, and never lose progress on a grind again.
		</p>
	</div>

	{#if ws}
		<div class="mb-4 rounded-xl border border-wf-edge bg-wf-panel px-4 py-2">
			<WorldStateTicker store={ws} />
		</div>
	{/if}

	{#if dataset && tracker}
		<div class="mb-4 overflow-hidden rounded-xl border border-wf-edge">
			<StarChart
				regions={planetRegions}
				{specialRegions}
				{selectedId}
				{statusOf}
				onselect={(id) => (selectedId = id)}
			/>
		</div>
		<RegionPanel
			{dataset}
			regionId={selectedId}
			{tracker}
			worldState={ws?.state ?? null}
			now={ws?.now ?? Date.now()}
		/>
	{:else}
		<div class="flex h-96 items-center justify-center text-slate-500">
			Loading Star Chart…
		</div>
	{/if}

	<section class="mt-8">
		<h2 class="mb-3 text-lg font-bold text-slate-100">Browse the Star Chart</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.directory as planet (planet.id)}
				<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
					<h3 class="text-base font-semibold text-slate-100">
						{planet.name}
					</h3>
					{#if planet.frames.length}
						<p class="mt-1 text-xs text-wf-muted">
							Boss frame{planet.frames.length > 1 ? 's' : ''}: {planet.frames.join(
								', ',
							)}
						</p>
					{/if}
					{#if planet.resources.length}
						<ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
							{#each planet.resources as r (r.id)}
								<li>
									{#if r.hasGuide}
										<a
											href={resolve('/guides/[resource]', { resource: r.id })}
											class="text-wf-cyan hover:text-wf-cyan/80"
										>
											{r.name}
										</a>
									{:else}
										<span class="text-wf-muted">{r.name}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<footer class="mt-8 text-center text-xs text-slate-600">
		Planet art &amp; game data © Digital Extremes, via the Warframe wiki.
		Fan-made tool — not affiliated with Digital Extremes.
		<br />
		<a href={resolve('/guides')} class="text-wf-cyan hover:text-wf-cyan/80">
			Browse all resource farming guides
		</a>
	</footer>

	<CommandPalette
		items={paletteItems}
		open={paletteOpen}
		onclose={() => (paletteOpen = false)}
		onselect={handlePick}
	/>
	{#if dataset && tracker}
		<SettingsDrawer
			{dataset}
			{tracker}
			open={settingsOpen}
			onclose={() => (settingsOpen = false)}
			onimport={() => {
				settingsOpen = false;
				importOpen = true;
			}}
		/>
		{#if importStore}
			<ImportDialog
				store={importStore}
				{tracker}
				open={importOpen}
				onclose={() => (importOpen = false)}
			/>
		{/if}
	{/if}
</div>
