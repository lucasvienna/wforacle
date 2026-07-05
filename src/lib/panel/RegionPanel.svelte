<script lang="ts">
	import type { Boss, Dataset, StarNode, Warframe } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { resourcesForRegion, bestPhaseRec } from '$lib/model/resources';
	import { base } from '$app/paths';

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

	// Faction accent for the assassination tag. Extend as new factions appear.
	const FACTION_TAG: Record<string, string> = {
		Corpus: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		Grineer: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
		Infested: 'border-lime-500/40 bg-lime-500/10 text-lime-300',
	};

	let region = $derived(dataset.regions.find((r) => r.id === regionId));
	let resources = $derived(resourcesForRegion(dataset, regionId));
	// A region can have MULTIPLE Assassination nodes, each linking its own
	// frame (e.g. Jupiter: Themisto→Valkyr and The Ropalolyst→Wisp) — render
	// one frame block per node instead of only the first match.
	type FrameEntry = { node: StarNode; boss: Boss; frame: Warframe };
	let entries = $derived(
		dataset.nodes
			.filter((n) => n.regionId === regionId && n.isAssassination && n.frameId)
			.map((node) => ({
				node,
				boss: dataset.bosses.find((b) => b.id === node.bossId),
				frame: dataset.warframes.find((w) => w.id === node.frameId),
			}))
			.filter((e): e is FrameEntry => !!e.boss && !!e.frame),
	);

	// The main blueprint is bought from the Market; components drop from the boss.
	function sourceLabel(slot: string, bossName: string): string {
		return slot === 'bp' ? 'Market' : bossName;
	}
</script>

<section class="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
	<h2 class="mb-4 text-lg font-semibold text-slate-100">{region?.name}</h2>
	{#if entries.length > 0}
		<div class="space-y-6">
			{#each entries as { node, boss, frame } (node.id)}
				{@const count = tracker.frameCount(frame.id)}
				<div>
					<div class="mb-4 flex items-start justify-between gap-3">
						<div>
							<h3 class="text-base font-semibold text-slate-100">
								{node.name}
							</h3>
							<p class="mt-0.5 text-xs text-slate-400">
								Boss: <span class="text-slate-200">{boss.name}</span> — drops Warframe
								components
							</p>
						</div>
						<span
							class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[
								node.faction
							] ?? 'border-slate-600 text-slate-300'}"
						>
							{node.faction} · Assassination
						</span>
					</div>

					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
							aria-hidden="true"
						>
							{frame.name[0]}
						</div>
						<div>
							<div class="font-semibold text-slate-100">
								{frame.name}
								<span
									class="text-xs font-normal {count.owned === count.total
										? 'text-emerald-400'
										: 'text-slate-400'}"
								>
									· {count.owned}/{count.total} owned
								</span>
							</div>
							<div class="text-xs text-slate-500">
								Blueprint from Market · components from {boss.name}
							</div>
						</div>
					</div>

					<div class="space-y-1">
						{#each frame.parts as part (part.id)}
							{@const owned = tracker.isOwned(part.id)}
							<div
								data-part={part.id}
								data-owned={owned}
								role="button"
								tabindex="0"
								class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-slate-800 {owned
									? 'border-emerald-500/30 bg-emerald-500/10'
									: ''}"
								onclick={() => tracker.togglePart(part.id)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										if (e.key === ' ') e.preventDefault();
										tracker.togglePart(part.id);
									}
								}}
							>
								<span
									class="flex h-4 w-4 items-center justify-center rounded border text-[11px] {owned
										? 'border-emerald-400 bg-emerald-400 text-slate-950'
										: 'border-slate-500 text-transparent'}"
								>
									✓
								</span>
								<span
									class="text-sm {owned
										? 'text-emerald-300'
										: 'text-slate-200'}"
								>
									{SLOT_LABEL[part.slot]}
								</span>
								<span class="ml-auto text-xs text-slate-500"
									>{sourceLabel(part.slot, boss.name)}</span
								>
							</div>
						{/each}
					</div>

					<button
						class="mt-3 text-xs font-medium text-sky-400 hover:text-sky-300"
						onclick={() => tracker.toggleFrame(frame.id)}
					>
						✓ Toggle whole frame
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-slate-400">
			{region?.name}: no Assassination frame here yet.
		</p>
	{/if}

	{#if resources.length > 0}
		<div class="mt-6 border-t border-slate-700 pt-4">
			<h3 class="mb-3 text-sm font-semibold text-slate-100">Resources</h3>
			<ul class="space-y-2">
				{#each resources as r (r.id)}
					{@const early = bestPhaseRec(r, 'early')}
					{@const late = bestPhaseRec(r, 'late')}
					<li
						class="flex items-center gap-3 rounded-lg border border-slate-700 px-3 py-2"
					>
						<img
							src="{base}/resources/{r.id}.webp"
							alt=""
							class="h-8 w-8 shrink-0 rounded"
							loading="lazy"
						/>
						<span class="text-sm text-slate-200">{r.name}</span>
						<div class="ml-auto flex items-center gap-2">
							{#if early}
								<span
									class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
								>
									⚡ early
								</span>
							{/if}
							{#if late}
								<span
									class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
								>
									💀 late
								</span>
							{/if}
							<a
								href="{base}/guides/{r.id}"
								class="text-xs font-medium text-sky-400 hover:text-sky-300"
							>
								farming ▸
							</a>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
