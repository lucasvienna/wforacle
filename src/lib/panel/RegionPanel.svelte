<script lang="ts">
	import type {
		Dataset,
		OpenWorldFarm,
		Warframe,
		WarframePart,
	} from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { resourcesForRegion } from '$lib/model/resources';
	import { regionFrames } from './regionFrames';
	import FrameCard from './FrameCard.svelte';
	import ResourceRail from './ResourceRail.svelte';
	import type { WorldState } from '$lib/worldstate/types';
	import {
		partAvailability,
		nextActiveAt,
		formatCountdown,
	} from '$lib/worldstate/availability';

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

	// The main blueprint is bought from the Market; components drop from the boss.
	function sourceLabel(slot: string, bossName: string): string {
		return slot === 'bp' ? 'Market' : bossName;
	}

	// Source label for an open-world part row: bp shows its bpSource; components
	// show "{source} · {tier} · Rot {rotation} · ~{chance}%", omitting tier/rotation
	// for non-bounty sources (Exploiter Orb) that carry neither.
	function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
		if (part.slot === 'bp') return farm.bpSource;
		const rot =
			part.rotation === 'any'
				? 'any rot'
				: part.rotation
					? `Rot ${part.rotation}`
					: undefined;
		const chance =
			part.chance != null ? `~${Math.round(part.chance)}%` : undefined;
		return [farm.componentSource, part.bountyTier, rot, chance]
			.filter(Boolean)
			.join(' · ');
	}

	const ZONE_CYCLE: Record<string, 'cetus' | 'vallis' | 'cambion'> = {
		'Plains of Eidolon': 'cetus',
		'Orb Vallis': 'vallis',
		'Cambion Drift': 'cambion',
	};
	const CYCLE_GLYPH: Record<string, string> = {
		day: '☀',
		night: '🌙',
		warm: '🔥',
		cold: '❄',
		fass: '🟠',
		vome: '🔵',
	};

	function zoneCycleLine(nodeName: string): string | null {
		if (!worldState) return null;
		const key = ZONE_CYCLE[nodeName];
		if (!key) return null;
		const cyc = worldState[key];
		if (!cyc.expiry) return null;
		return `${CYCLE_GLYPH[cyc.state] ?? ''} ${cyc.state} · ${formatCountdown(new Date(cyc.expiry).getTime() - now)}`;
	}

	// Per-part availability chip for an open-world component row. Null → render
	// nothing (bp slot, unknown rotation, or no live data).
	function owAvailabilityChip(
		part: WarframePart,
	): { cls: string; text: string } | null {
		if (!worldState || part.slot === 'bp') return null;
		const rot = worldState.rotation;
		const a = partAvailability(part.rotation, rot.letter);
		if (a === 'available') {
			const resets = rot.expiry
				? ` · resets ${formatCountdown(new Date(rot.expiry).getTime() - now)}`
				: '';
			return { cls: 'text-emerald-300', text: `● up now${resets}` };
		}
		if (a === 'always')
			return { cls: 'text-emerald-300', text: '● always available' };
		if (a === 'unavailable') {
			const next = nextActiveAt(part.rotation, rot.letter, rot.expiry);
			const when = next
				? ` · up in ${formatCountdown(next.getTime() - now)}`
				: '';
			return { cls: 'text-wf-muted', text: `○ Rot ${part.rotation}${when}` };
		}
		return null;
	}

	// Collapsed-state farm cue for a free-roam frame: is any still-needed component
	// available on the current rotation? Null when there's no live data or nothing
	// left to farm (a completed frame shows its ✓ instead).
	function owSummary(frame: Warframe): { cls: string; text: string } | null {
		if (!worldState) return null;
		const letter = worldState.rotation.letter;
		const needed = frame.parts.filter(
			(p) => p.slot !== 'bp' && !tracker.isOwned(p.id),
		);
		if (needed.length === 0) return null;
		const upNow = needed.some((p) => {
			const a = partAvailability(p.rotation, letter);
			return a === 'available' || a === 'always';
		});
		return upNow
			? { cls: 'text-emerald-300', text: '● up now' }
			: { cls: 'text-wf-muted', text: '○ not this rotation' };
	}

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
						<h3
							class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase"
						>
							Assassination
						</h3>
						<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{#each frames.assassination as { node, boss, frame } (regionId + ':' + frame.id)}
								<div class="sm:col-span-2">
									<FrameCard
										{frame}
										{tracker}
										subLine={`${node.name} · Boss: ${boss.name}`}
										faction={node.faction}
										kindLabel="Assassination"
										isKey={KEY_BOSSES.has(boss.name)}
										defaultExpanded={defaultExpanded(frame.id)}
										sourceText={(part) => sourceLabel(part.slot, boss.name)}
									/>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				{#if frames.zones.length > 0}
					<section>
						<h3
							class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase"
						>
							Free Roam
						</h3>
						<div class="space-y-5">
							{#each frames.zones as zone (zone.node.id)}
								{@const line = zoneCycleLine(zone.node.name)}
								<div>
									<div class="mb-2 flex items-baseline justify-between gap-3">
										<h4 class="text-sm font-medium text-slate-200">
											{zone.node.name}
										</h4>
										{#if line}
											<span class="text-xs text-wf-muted" data-zone-cycle
												>{line}</span
											>
										{/if}
									</div>
									<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{#each zone.entries as { frame, farm } (regionId + ':' + frame.id)}
											<FrameCard
												{frame}
												{tracker}
												subLine={`Blueprint: ${farm.bpSource}`}
												faction={zone.node.faction}
												kindLabel="Free Roam"
												defaultExpanded={defaultExpanded(frame.id)}
												sourceText={(part) => owSourceText(part, farm)}
												avail={owAvailabilityChip}
												summary={owSummary(frame)}
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
