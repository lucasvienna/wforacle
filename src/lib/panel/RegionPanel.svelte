<script lang="ts">
	import type {
		Boss,
		Dataset,
		OpenWorldFarm,
		StarNode,
		Warframe,
		WarframePart,
	} from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { resourcesForRegion, bestPhaseRec } from '$lib/model/resources';
	import { base } from '$app/paths';
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

	const SLOT_LABEL = {
		bp: 'Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
		dayaspect: 'Day Aspect',
		nightaspect: 'Night Aspect',
	} as const;

	// Equinox's dayaspect/nightaspect slots get a sun/moon glyph prefix in
	// the part-row label — purely decorative, additive to SLOT_LABEL text.
	const SLOT_ICON: Partial<Record<string, string>> = {
		dayaspect: '☀',
		nightaspect: '☾',
	};

	// Faction accent for the assassination tag. Extend as new factions appear.
	const FACTION_TAG: Record<string, string> = {
		Corpus: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		Grineer: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
		Infested: 'border-lime-500/40 bg-lime-500/10 text-lime-300',
	};

	// Bosses that require crafting a key item before the node can be played
	// (e.g. Mutalist Alad V Assassinate key, Jordas Golem key). Presentational
	// hint only — not a spoiler gate.
	const KEY_BOSSES = new Set(['Mutalist Alad V', 'Jordas Golem']);

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

	// Open-world zones for this region: group the region's farms by zone node,
	// joined to the node + frame. Guarded for hand-built fixtures without farms.
	type OWEntry = { frame: Warframe; farm: OpenWorldFarm };
	type OWZone = { node: StarNode; entries: OWEntry[] };
	let openWorldZones = $derived.by<OWZone[]>(() => {
		const farms = (dataset.openWorldFarms ?? []).filter(
			(f) => f.regionId === regionId,
		);
		const byNode = new Map<string, OWZone>();
		for (const farm of farms) {
			const node = dataset.nodes.find((n) => n.id === farm.nodeId);
			const frame = dataset.warframes.find((w) => w.id === farm.frameId);
			if (!node || !frame) continue;
			const zone = byNode.get(node.id) ?? { node, entries: [] };
			zone.entries.push({ frame, farm });
			byNode.set(node.id, zone);
		}
		return [...byNode.values()];
	});

	// Source label for an open-world part row: bp shows its bpSource; components
	// show "{source} · {tier} · Rot {rotation} · ~{chance}%", omitting the tier /
	// rotation for non-bounty sources (Exploiter Orb) that carry neither.
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

	// Availability chip for an open-world component row. Null → render nothing
	// (bp slot, unknown rotation, or no live data).
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
</script>

<div class="grid items-start gap-4 md:grid-cols-2">
	<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
		<h2 class="mb-4 text-lg font-semibold text-wf-gold">{region?.name}</h2>
		{#snippet frameCard(
			frame: Warframe,
			subLine: string,
			sourceText: (part: WarframePart) => string,
			avail?: (part: WarframePart) => { cls: string; text: string } | null,
		)}
			{@const count = tracker.frameCount(frame.id)}
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-lg border border-wf-edge bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
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
								: 'text-wf-muted'}"
						>
							· {count.owned}/{count.total} owned
						</span>
					</div>
					<div class="text-xs text-wf-muted">{subLine}</div>
				</div>
			</div>

			{#if frame.parts.some((p) => p.slot === 'dayaspect' || p.slot === 'nightaspect')}
				<p class="mb-2 text-xs text-wf-muted">
					Assembled from its Day and Night aspects.
				</p>
			{/if}

			<div class="space-y-1">
				{#each frame.parts as part (part.id)}
					{@const owned = tracker.isOwned(part.id)}
					<div
						data-part={part.id}
						data-owned={owned}
						role="button"
						tabindex="0"
						class="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {owned
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
								: 'border-wf-edge text-transparent'}"
						>
							✓
						</span>
						<span
							class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}"
						>
							{#if SLOT_ICON[part.slot]}<span
									aria-hidden="true"
									class="mr-1 text-wf-gold">{SLOT_ICON[part.slot]}</span
								>{/if}{SLOT_LABEL[part.slot]}
						</span>
						<span class="ml-auto text-xs text-wf-muted">{sourceText(part)}</span
						>
						{#if avail}
							{@const chip = avail(part)}
							{#if chip}
								<span class="ml-2 shrink-0 text-[11px] {chip.cls}"
									>{chip.text}</span
								>
							{/if}
						{/if}
					</div>
				{/each}
			</div>

			<button
				class="mt-3 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
				onclick={() => tracker.toggleFrame(frame.id)}
			>
				✓ Toggle whole frame
			</button>
		{/snippet}
		{#if entries.length > 0 || openWorldZones.length > 0}
			<div class="space-y-6">
				{#each entries as { node, boss, frame } (node.id)}
					<div>
						<div class="mb-4 flex items-start justify-between gap-3">
							<div>
								<h3 class="text-base font-semibold text-slate-100">
									{node.name}
								</h3>
								<p class="mt-0.5 text-xs text-wf-muted">
									Boss: <span class="text-slate-200">{boss.name}</span> — drops Warframe
									components
								</p>
							</div>
							<span
								class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[
									node.faction
								] ?? 'border-wf-edge text-wf-muted'}"
							>
								{node.faction} · Assassination
								{#if KEY_BOSSES.has(boss.name)}
									<span data-key class="text-wf-muted">· key</span>
								{/if}
							</span>
						</div>

						{@render frameCard(
							frame,
							`Blueprint from Market · components from ${boss.name}`,
							(part) => sourceLabel(part.slot, boss.name),
						)}
					</div>
				{/each}

				{#each openWorldZones as zone (zone.node.id)}
					{@const line = zoneCycleLine(zone.node.name)}
					<div>
						<div class="mb-4 flex items-start justify-between gap-3">
							<div>
								<h3 class="text-base font-semibold text-slate-100">
									{zone.node.name}
								</h3>
								{#if line}
									<p class="mt-0.5 text-xs text-wf-muted" data-zone-cycle>
										{line}
									</p>
								{/if}
							</div>
							<span
								class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[
									zone.node.faction
								] ?? 'border-wf-edge text-wf-muted'}"
							>
								{zone.node.faction} · Free Roam
							</span>
						</div>
						<div class="space-y-6">
							{#each zone.entries as { frame, farm } (frame.id)}
								{@render frameCard(
									frame,
									`Blueprint: ${farm.bpSource}`,
									(part) => owSourceText(part, farm),
									owAvailabilityChip,
								)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-wf-muted">
				{region?.name}: no Assassination frame here yet.
			</p>
		{/if}
	</section>

	<section class="rounded-xl border border-wf-edge bg-wf-panel p-5">
		<h2 class="text-lg font-semibold text-wf-gold">
			Resources on {region?.name}
		</h2>
		<p class="mt-0.5 mb-4 text-xs text-wf-muted">
			Informational · best farm spots badged by game phase
		</p>
		{#if resources.length > 0}
			<ul class="space-y-2">
				{#each resources as r (r.id)}
					{@const early = bestPhaseRec(r, 'early')}
					{@const late = bestPhaseRec(r, 'late')}
					{@const earlyHere = !!early && early.regionId === regionId}
					{@const lateHere = !!late && late.regionId === regionId}
					<li
						class="flex items-start gap-3 rounded-lg border border-wf-edge px-3 py-2"
					>
						<img
							src="{base}/resources/{r.id}.webp"
							alt=""
							class="mt-0.5 h-8 w-8 shrink-0 rounded"
							loading="lazy"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-medium text-slate-200">{r.name}</span>
								{#if earlyHere}
									<span
										class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
									>
										⚡ early best
									</span>
								{/if}
								{#if lateHere}
									<span
										class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
									>
										💀 late best
									</span>
								{/if}
							</div>
							<!-- Best farm per phase (highlighted when it's this planet, muted when elsewhere) -->
							{#if early}
								<p
									class="mt-0.5 text-xs {earlyHere
										? 'text-emerald-300'
										: 'text-wf-muted'}"
								>
									⚡ Early: {early.nodeLabel}
								</p>
							{/if}
							{#if late}
								<p
									class="text-xs {lateHere
										? 'text-amber-300'
										: 'text-wf-muted'}"
								>
									💀 Late: {late.nodeLabel}
								</p>
							{/if}
						</div>
						{#if r.recommendations.length > 0}
							<a
								href="{base}/guides/{r.id}"
								class="mt-0.5 shrink-0 self-start text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
							>
								farming ▸
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-wf-muted">No notable resources.</p>
		{/if}
	</section>
</div>
