<script lang="ts">
	import type { Warframe, WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import { asset } from '$app/paths';
	import PartRow from './PartRow.svelte';
	import AspectGroup from './AspectGroup.svelte';

	let {
		frame,
		tracker,
		subLine,
		faction,
		kindLabel,
		isKey = false,
		defaultExpanded = true,
		sourceText,
		avail,
		summary = null,
		aspectNote,
	}: {
		frame: Warframe;
		tracker: Tracker;
		subLine: string;
		faction: string;
		kindLabel: string;
		isKey?: boolean;
		defaultExpanded?: boolean;
		sourceText: (part: WarframePart) => string;
		avail?: (part: WarframePart) => { cls: string; text: string } | null;
		summary?: { cls: string; text: string } | null;
		/** Info line shown under the parts for aspect-built frames (Equinox). */
		aspectNote?: string;
	} = $props();

	const SLOT_LABEL = {
		bp: 'Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
	} as const;

	// Faction accent for the acquisition tag. Extend as new factions appear.
	const FACTION_TAG: Record<string, string> = {
		Corpus: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		Grineer: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
		Infested: 'border-lime-500/40 bg-lime-500/10 text-lime-300',
	};

	// Captured ONCE at construction (smart-auto default). Seeding $state from the
	// prop — rather than a $derived of tracker.frameCount — is deliberate: checking
	// the last part must not snap an open card shut mid-interaction. A fresh initial
	// state per visit comes from region-prefixed {#each} keys in RegionPanel.
	// svelte-ignore state_referenced_locally
	let expanded = $state(defaultExpanded);
	// Wiki glyphs are committed to static/frames/<id>.webp; if one is missing
	// or fails to load, fall back to the initial-letter tile.
	let iconFailed = $state(false);
	let count = $derived(tracker.frameCount(frame.id));
	let done = $derived(count.total > 0 && count.owned === count.total);
	let pct = $derived(
		count.total ? Math.round((count.owned / count.total) * 100) : 0,
	);

	type Row =
		| { kind: 'part'; part: WarframePart }
		| { kind: 'aspect'; aspect: 'day' | 'night'; parts: WarframePart[] };

	// Partition parts into ungrouped rows and Day/Night aspect groups, preserving
	// order: the first leaf of an aspect emits the whole group; later leaves of
	// the same aspect are folded in and skipped.
	let rows = $derived.by<Row[]>(() => {
		const out: Row[] = [];
		const seen = new Set<'day' | 'night'>();
		for (const p of frame.parts) {
			if (p.aspect) {
				if (seen.has(p.aspect)) continue;
				seen.add(p.aspect);
				out.push({
					kind: 'aspect',
					aspect: p.aspect,
					parts: frame.parts.filter((q) => q.aspect === p.aspect),
				});
			} else {
				out.push({ kind: 'part', part: p });
			}
		}
		return out;
	});
</script>

<div
	data-frame={frame.id}
	data-expanded={expanded}
	class="rounded-xl border border-wf-edge bg-wf-panel p-4 {done
		? 'opacity-60'
		: ''}"
>
	<button
		type="button"
		class="flex w-full items-center gap-3 text-left"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
	>
		<div
			class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-wf-edge bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
			aria-hidden="true"
		>
			{#if iconFailed}
				{frame.name[0]}
			{:else}
				<img
					src={asset(`/frames/${frame.id}.webp`)}
					alt=""
					loading="lazy"
					class="h-full w-full object-cover"
					onerror={() => (iconFailed = true)}
				/>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="truncate font-semibold text-slate-100">{frame.name}</span>
				<span
					class="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium {FACTION_TAG[
						faction
					] ?? 'border-wf-edge text-wf-muted'}"
				>
					{faction} · {kindLabel}{#if isKey}<span
							data-key
							class="text-wf-muted"
						>
							· key</span
						>{/if}
				</span>
			</div>
			<div class="mt-1 flex items-center gap-2">
				<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-wf-edge">
					<div
						class="h-full rounded-full {done ? 'bg-emerald-400' : 'bg-wf-cyan'}"
						style="width: {pct}%"
					></div>
				</div>
				<span
					class="shrink-0 text-xs {done ? 'text-emerald-400' : 'text-wf-muted'}"
				>
					{#if done}✓ done{:else}{count.owned}/{count.total}{/if}
				</span>
				<span class="shrink-0 text-wf-muted" aria-hidden="true"
					>{expanded ? '▾' : '▸'}</span
				>
			</div>
			<div class="mt-0.5 text-xs text-wf-muted">{subLine}</div>
		</div>
	</button>

	{#if expanded}
		{#if frame.parts.some((p) => p.aspect)}
			<p class="mt-3 mb-2 text-xs text-wf-muted">
				Assembled from its Day and Night aspects.
			</p>
		{/if}
		<!-- Group the part checkboxes under the frame name so a screen reader
		     navigating control-to-control keeps the frame context — each row's
		     own name still carries its slot + source. -->
		<div class="mt-3 space-y-1" role="group" aria-label={frame.name}>
			{#each rows as row (row.kind === 'aspect' ? row.aspect : row.part.id)}
				{#if row.kind === 'aspect'}
					<AspectGroup aspect={row.aspect} parts={row.parts} {tracker} />
				{:else}
					{@const part = row.part}
					{@const chip = avail?.(part) ?? null}
					<PartRow {part} {tracker}>
						{#snippet children(owned)}
							<div class="flex items-center gap-2">
								<span
									class="text-sm {owned
										? 'text-emerald-300'
										: 'text-slate-200'}"
								>
									{SLOT_LABEL[part.slot]}
								</span>
								{#if chip}
									<span class="ml-auto shrink-0 text-[11px] {chip.cls}"
										>{chip.text}</span
									>
								{/if}
							</div>
							<div class="mt-0.5 text-xs text-wf-muted">{sourceText(part)}</div>
						{/snippet}
					</PartRow>
				{/if}
			{/each}
		</div>
		{#if aspectNote && frame.parts.some((p) => p.aspect)}
			<p class="mt-2 text-[11px] text-wf-muted">
				<span aria-hidden="true" class="mr-1">ⓘ</span><span>{aspectNote}</span>
			</p>
		{/if}
		<button
			type="button"
			class="mt-3 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
			onclick={() => tracker.toggleFrame(frame.id)}
		>
			✓ Toggle whole frame
		</button>
	{:else if summary}
		<div class="mt-2 text-[11px] {summary.cls}">{summary.text}</div>
	{/if}
</div>
