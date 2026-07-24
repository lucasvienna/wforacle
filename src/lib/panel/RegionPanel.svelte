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
	import { formatChance } from './format';

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

	// Assassination source label. A `bp` bought from the Market reads
	// "Market ({credits}cr)"; a curated bp (Atlas, Mesa) reads its bpSource
	// verbatim; a component drop — and a bp that itself drops from the boss
	// (Wisp/Ropalolyst) — reads "{boss} · {chance}%".
	function assassinationSourceText(
		part: WarframePart,
		bossName: string,
	): string {
		if (part.slot === 'bp' && !part.dropSourceNodeId) {
			if (part.bpSource) return part.bpSource;
			if (part.marketCost != null)
				return `Market (${part.marketCost.toLocaleString('en-US')}cr)`;
			return 'Market';
		}
		const chance = part.chance != null ? formatChance(part.chance) : undefined;
		return [bossName, chance].filter(Boolean).join(' · ');
	}

	// Source label for an open-world part row: a bare bp shows its bpSource; a
	// drop-sourced bp (Citrine, Dante, Voruna, Gyre) and components show
	// "{source} · {tier} · Rot {rotation} · {chance}%", omitting tier/rotation
	// for non-bounty sources (Exploiter Orb) that carry neither.
	function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
		if (part.slot === 'bp' && !part.dropSourceNodeId) return farm.bpSource;
		const rot =
			part.rotation === 'any'
				? 'any rot'
				: part.rotation
					? `Rot ${part.rotation}`
					: undefined;
		const chance = part.chance != null ? formatChance(part.chance) : undefined;
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
		// Guard against a missing ("") or malformed expiry so a bad API value
		// never renders as a "NaN" countdown.
		const expiryMs = cyc.expiry ? new Date(cyc.expiry).getTime() : NaN;
		if (!Number.isFinite(expiryMs)) return null;
		return `${CYCLE_GLYPH[cyc.state] ?? ''} ${cyc.state} · ${formatCountdown(expiryMs - now)}`;
	}

	// Per-part availability chip for an open-world component row. Null → render
	// nothing (bare bp slot, unknown rotation, or no live data).
	function owAvailabilityChip(
		part: WarframePart,
	): { cls: string; text: string } | null {
		if (!worldState || (part.slot === 'bp' && !part.dropSourceNodeId)) return null;
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

	// Collapsed-state farm cue for a free-roam frame: is any still-needed
	// component — or drop-sourced blueprint — available on the current
	// rotation? Null when there's no live data or nothing left to farm (a
	// completed frame shows its ✓ instead).
	function owSummary(frame: Warframe): { cls: string; text: string } | null {
		if (!worldState) return null;
		const letter = worldState.rotation.letter;
		const needed = frame.parts.filter(
			(p) => (p.slot !== 'bp' || p.dropSourceNodeId != null) && !tracker.isOwned(p.id),
		);
		if (needed.length === 0) return null;
		const upNow = needed.some((p) => {
			const a = partAvailability(p.rotation, letter);
			return a === 'available' || a === 'always';
		});
		if (upNow) return { cls: 'text-emerald-300', text: '● up now' };
		// Letter underivable → we can't claim "not this rotation" (matches the
		// per-part chip, which renders nothing for the `unknown` case).
		if (letter === null) return null;
		return { cls: 'text-wf-muted', text: '○ not this rotation' };
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
									sourceText={(part) =>
										assassinationSourceText(part, boss.name)}
									aspectNote={`Each ${boss.name} kill drops one Day and one Night component.`}
								/>
							{/each}
						</div>
					</section>
				{/if}

				{#if frames.zones.length > 0}
					<section>
						<h3
							class="mb-3 text-xs font-semibold tracking-wide text-wf-muted uppercase"
						>
							Zones &amp; Missions
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
									<div
										class="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3"
									>
										{#each zone.entries as { frame, farm } (regionId + ':' + zone.node.id + ':' + frame.id)}
											<FrameCard
												{frame}
												{tracker}
												subLine={`Blueprint: ${farm.bpSource}`}
												faction={zone.node.faction}
												kindLabel={zone.node.missionType}
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
