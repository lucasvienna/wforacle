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
	import { loadOwned, saveOwned, loadQuests, saveQuests, persist } from '$lib/tracker/persistence';
	import { revealedRegions } from '$lib/model/reveal';
	import CommandPalette from '$lib/palette/CommandPalette.svelte';
	import { buildPaletteItems, type PaletteItem } from '$lib/palette/search';
	import { createWorldStateStore, type WorldStateStore } from '$lib/worldstate/worldstate.svelte';
	import WorldStateTicker from '$lib/worldstate/WorldStateTicker.svelte';
	import ImportDialog from '$lib/import/ImportDialog.svelte';
	import { createImportStore, type ImportStore } from '$lib/import/importState.svelte';
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
	// Venus is the default selection: the first region with a trackable
	// assassination frame (Rhino/Fossa), so a first-time visitor lands on
	// something with content rather than an empty panel.
	const DEFAULT_REGION = 'venus';

	let selectedId = $state(DEFAULT_REGION);
	let paletteOpen = $state(false);
	let settingsOpen = $state(false);
	let importOpen = $state(false);
	let loadError = $state(false);
	let ready = false;
	// Plain let, not $state: this guards control flow and is never read by the
	// template. Prevents a double-click on Retry from booting twice and leaking
	// a second polling WorldStateStore.
	let booting = false;

	const IMPORT_ACTION: PaletteItem = {
		type: 'action',
		id: 'import',
		label: 'Import from account',
		sublabel: 'Sync owned frames & quests',
	};

	async function boot() {
		if (booting) return;
		booting = true;
		loadError = false;
		try {
			const ds = await loadDataset();
			// Read the persisted state before constructing the tracker: if a read
			// rejects (blocked IndexedDB), an already-constructed tracker's
			// $effect.root would never be disposed, because `t` has not been
			// assigned to the `tracker` state that onDestroy cleans up.
			const [owned, quests] = await Promise.all([loadOwned(), loadQuests()]);
			const t = createTracker(
				ds.warframes,
				(ids) => {
					if (browser && ready) persist('saving owned parts', saveOwned(ids));
				},
				(ids) => {
					if (browser && ready) persist('saving completed quests', saveQuests(ids));
				},
			);
			t.load(owned);
			t.loadQuestState(quests);
			ready = true;
			dataset = ds;
			tracker = t;
			ws = createWorldStateStore();
			importStore = createImportStore(ds);
			importStore.init();
		} catch (e) {
			// The specifics stay in the console — the UI gets a fixed, user-safe
			// message. Without this the whole app sat on "Loading Star Chart…"
			// forever, with the failure invisible to both user and maintainer.
			console.error('[wforacle] failed to load the star chart:', e);
			loadError = true;
		} finally {
			booting = false;
		}
	}

	onMount(boot);

	onDestroy(() => {
		tracker?.dispose();
		ws?.dispose();
	});

	function statusOf(regionId: string): 'done' | 'part' | 'none' {
		if (!dataset || !tracker) return 'none';
		// A region can have multiple Assassination-frame nodes (e.g. Jupiter:
		// Themisto→Valkyr and The Ropalolyst→Wisp) — aggregate across all of
		// them so the status only reports 'done' when every frame is complete.
		// Type predicate rather than `n.frameId!` — same idiom as
		// regionFrames.ts:35. The filter already proves it, but only a predicate
		// tells the compiler so.
		const frameIds = dataset.nodes
			.filter((n) => n.regionId === regionId && n.isAssassination)
			.map((n) => n.frameId)
			.filter((id): id is string => id !== undefined);
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
			? [...buildPaletteItems(dataset, new Set(visible.map((r) => r.id))), IMPORT_ACTION]
			: ([] as PaletteItem[]),
	);

	$effect(() => {
		if (visible.length && !visible.some((r) => r.id === selectedId)) {
			selectedId = DEFAULT_REGION;
		}
	});

	function onWindowKey(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = true;
		}
	}

	// Switch on `type` rather than chaining ifs. The old chain tested
	// targetRegionId before type === 'resource', so a resource item that ever
	// gained a targetRegionId would have silently navigated to a region instead
	// of its guide. The `never` default also makes adding a PaletteItem type a
	// compile error here rather than a silent no-op.
	function handlePick(item: PaletteItem) {
		switch (item.type) {
			case 'action':
				if (item.id === 'import') importOpen = true;
				return;
			case 'resource':
				void goto(resolve('/guides/[resource]', { resource: item.id }));
				return;
			case 'region':
			case 'frame':
				if (item.targetRegionId) selectedId = item.targetRegionId;
				return;
			default: {
				const exhaustive: never = item.type;
				void exhaustive;
			}
		}
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
		<span class="text-lg font-bold text-wf-gold">wf<span class="text-wf-cyan">oracle</span></span>
		<div class="ml-auto flex items-center gap-2 sm:gap-3">
			<button
				type="button"
				data-open-palette
				onclick={() => (paletteOpen = true)}
				class="flex items-center gap-2 rounded-lg border border-wf-edge bg-wf-panel px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
			>
				<span aria-hidden="true">🔍</span>
				Search
				<kbd class="rounded border border-wf-edge px-1 text-[10px] text-wf-muted">Ctrl K</kbd>
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
			{#if !tracker}
				<!--
					Dimension-matched placeholder for the readout below. Both widgets
					appear only after boot(); letting them pop in grew the header row
					and pushed the whole page down. The count uses a fixed-width,
					`tabular-nums` slot so "0/48" and "12/48" reserve the same
					space and the row cannot re-wrap when the real numbers land.
				-->
				<div
					aria-hidden="true"
					class="flex items-center gap-2 rounded-lg border border-wf-edge bg-wf-panel px-3 py-1.5 text-xs text-wf-muted"
				>
					<span
						>Frame Parts <b
							class="inline-block min-w-[3.25rem] text-center text-wf-gold tabular-nums">—</b
						></span
					>
					<span class="relative h-1.5 w-16 overflow-hidden rounded-full bg-wf-edge"></span>
				</div>
				<div
					aria-hidden="true"
					class="rounded-lg border border-transparent px-2.5 py-1.5 text-wf-muted"
				>
					<span class="invisible" aria-hidden="true">⚙</span>
				</div>
			{/if}
			{#if tracker}
				<div
					class="flex items-center gap-2 rounded-lg border border-wf-edge bg-wf-panel px-3 py-1.5 text-xs text-wf-muted"
					title="Node frame parts owned"
				>
					<span
						>Frame Parts <b
							class="inline-block min-w-[3.25rem] text-center text-wf-gold tabular-nums"
							>{tracker.total.owned}/{tracker.total.total}</b
						></span
					>
					<span class="relative h-1.5 w-16 overflow-hidden rounded-full bg-wf-edge">
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
		<h1 class="text-xl font-bold text-slate-100">Warframe Star Chart Tracker</h1>
		<p class="mt-1 text-sm text-wf-muted">
			Track which Warframes you own, find the best farming spots for every planet and boss, and
			never lose progress on a grind again.
		</p>
	</div>

	<!--
		The wrapper renders unconditionally. `ws` only exists after boot(), so
		gating the whole block on it inserted ~50px of new content mid-load and
		pushed everything below it down — a measurable slice of the page's CLS.
		The placeholder mirrors WorldStateTicker's own loading branch exactly, so
		the swap is height-neutral.
	-->
	<div class="mb-4 rounded-xl border border-wf-edge bg-wf-panel px-4 py-2">
		{#if ws}
			<WorldStateTicker store={ws} />
		{:else}
			<div data-worldstate class="text-xs text-wf-muted">Loading live status…</div>
		{/if}
	</div>

	<!--
		min-h-screen reserves roughly a viewport for the client-rendered chart and
		panel. Without it this slot was a 384px placeholder replaced by ~3100px of
		content, which shoved the prerendered directory below — and that directory
		starts *inside* the viewport, so the displacement scored CLS 0.47 ("poor"
		is anything over 0.25) and held the home page's performance score at 79.

		Reserving the full loaded height is not an option (3100px of blank page),
		but it isn't necessary either: layout shift only counts elements visible in
		the viewport. One viewport of reserve puts the directory below the fold
		before the swap happens, so its later movement costs nothing, and the chart
		and panel are newly inserted nodes rather than moved ones.
	-->
	<div class="min-h-screen">
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
		{:else if loadError}
			<div
				data-load-error
				role="alert"
				class="flex h-96 flex-col items-center justify-center gap-3 px-6 text-center"
			>
				<p class="text-slate-300">Couldn’t load the Star Chart data.</p>
				<p class="max-w-md text-sm text-wf-muted">
					This is usually a temporary network problem. Your tracked progress is stored locally and
					hasn’t been lost.
				</p>
				<button
					type="button"
					data-retry-load
					onclick={boot}
					class="rounded-lg border border-wf-edge bg-wf-panel px-4 py-2 text-sm text-wf-cyan hover:border-wf-cyan/40"
				>
					Try again
				</button>
			</div>
		{:else}
			<div class="flex h-96 items-center justify-center text-slate-500">Loading Star Chart…</div>
		{/if}
	</div>

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
							Boss frame{planet.frames.length > 1 ? 's' : ''}: {planet.frames.join(', ')}
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
		Planet art &amp; game data © Digital Extremes, via the Warframe wiki. Fan-made tool — not
		affiliated with Digital Extremes.
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
