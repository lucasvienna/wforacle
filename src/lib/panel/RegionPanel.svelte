<script lang="ts">
	import type { Dataset } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { resourcesForRegion } from '$lib/model/resources';
	import { regionFrames } from './regionFrames';
	import FrameCard from './FrameCard.svelte';
	import ResourceRail from './ResourceRail.svelte';
	import type { WorldState } from '$lib/worldstate/types';
	import { assassinationSourceText, owSourceText } from './sourceText';
	import { zoneCycleLine, owAvailabilityChip, owSummary } from './chips';

	let {
		dataset,
		regionId,
		tracker,
		worldState = null,
		now = Date.now(),
	}: {
		dataset: Dataset;
		regionId: string;
		tracker: Tracker;
		worldState?: WorldState | null;
		now?: number;
	} = $props();

	// Bosses that require crafting a key item before the node can be played
	// (Mutalist Alad V, Jordas Golem). Presentational hint only — not a spoiler gate.
	const KEY_BOSSES = new Set(['Mutalist Alad V', 'Jordas Golem']);

	let region = $derived(dataset.regions.find((r) => r.id === regionId));
	let resources = $derived(resourcesForRegion(dataset, regionId));
	let frames = $derived(regionFrames(dataset, regionId));

	// Smart-auto: expand a frame unless it's already fully owned. Read at card
	// construction only (FrameCard seeds $state from it).
	function defaultExpanded(frameId: string): boolean {
		const c = tracker.frameCount(frameId);
		return c.owned < c.total;
	}
</script>

<div class="grid items-start gap-4 lg:grid-cols-[1fr_24rem]">
	<div data-region-band>
		<h2 class="mb-4 text-lg font-semibold text-wf-gold">{region?.name}</h2>
		{#if frames.assassination.length > 0 || frames.zones.length > 0}
			<div class="space-y-6">
				{#if frames.assassination.length > 0}
					<section>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase">
							Assassination
						</h3>
						<!-- Assassination cards are the region's primary frames: each
						     reads full-width, stacked, rather than sharing a row. -->
						<div class="space-y-3">
							{#each frames.assassination as { node, boss, frame } (regionId + ':' + node.id)}
								<FrameCard
									{frame}
									{tracker}
									subLine={`${node.name} · Boss: ${boss.name}`}
									faction={node.faction}
									kindLabel="Assassination"
									isKey={KEY_BOSSES.has(boss.name)}
									defaultExpanded={defaultExpanded(frame.id)}
									sourceText={(part) => assassinationSourceText(part, boss.name)}
									aspectNote={`Each ${boss.name} kill drops one Day and one Night component.`}
								/>
							{/each}
						</div>
					</section>
				{/if}

				{#if frames.zones.length > 0}
					<section>
						<h3 class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase">
							Zones &amp; Missions
						</h3>
						<div class="space-y-5">
							{#each frames.zones as zone (zone.node.id)}
								{@const line = zoneCycleLine(zone.node.name, worldState, now)}
								<div>
									<div class="mb-2 flex items-baseline justify-between gap-3">
										<h4 class="text-sm font-medium text-slate-200">
											{zone.node.name}
										</h4>
										{#if line}
											<span class="text-xs text-wf-muted" data-zone-cycle>{line}</span>
										{/if}
									</div>
									<div class="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{#each zone.entries as { frame, farm } (regionId + ':' + zone.node.id + ':' + frame.id)}
											<FrameCard
												{frame}
												{tracker}
												subLine={`Blueprint: ${farm.bpSource}`}
												faction={zone.node.faction}
												kindLabel={zone.node.missionType}
												defaultExpanded={defaultExpanded(frame.id)}
												sourceText={(part) => owSourceText(part, farm)}
												avail={(part) => owAvailabilityChip(part, worldState, now)}
												summary={owSummary(frame, worldState, (id) => tracker.isOwned(id))}
											/>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-wf-muted">No farmable frames here yet.</p>
		{/if}
	</div>

	<ResourceRail {resources} {regionId} />
</div>
