<script lang="ts">
	import type { WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import PartRow from './PartRow.svelte';
	import { formatChance } from './format';

	let {
		aspect,
		parts,
		tracker,
	}: {
		aspect: 'day' | 'night';
		parts: WarframePart[];
		tracker: Tracker;
	} = $props();

	const HEAD = {
		day: { glyph: '☀', name: 'Day Aspect' },
		night: { glyph: '☾', name: 'Night Aspect' },
	} as const;

	// Leaf label: the aspect's own blueprint reads "Aspect Blueprint"; the three
	// components keep their component names.
	const LEAF_LABEL: Record<string, string> = {
		bp: 'Aspect Blueprint',
		neuroptics: 'Neuroptics',
		chassis: 'Chassis',
		systems: 'Systems',
	};

	let ownedCount = $derived(parts.filter((p) => tracker.isOwned(p.id)).length);

	// Seed collapse ONCE: collapsed if the whole aspect is already owned, open
	// while anything is missing. Mirrors FrameCard's seed-once expand pattern;
	// toggling a leaf must not snap the group shut mid-interaction.
	// svelte-ignore state_referenced_locally
	let open = $state(parts.some((p) => !tracker.isOwned(p.id)));
</script>

<div class="mt-1">
	<button
		type="button"
		class="flex w-full items-center gap-2 text-left text-sm text-slate-200 hover:text-slate-100"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
		onkeydown={(e) => e.stopPropagation()}
	>
		<span aria-hidden="true" class="text-wf-muted">{open ? '▾' : '▸'}</span>
		<span aria-hidden="true" class="text-wf-gold">{HEAD[aspect].glyph}</span>
		<span class="font-medium">{HEAD[aspect].name}</span>
		<span class="ml-auto shrink-0 text-xs text-wf-muted"
			>{ownedCount}/{parts.length}</span
		>
	</button>
	{#if open}
		<div class="mt-1 space-y-1 pl-4">
			{#each parts as part (part.id)}
				<PartRow {part} {tracker}>
					{#snippet children(owned)}
						<div class="flex items-center gap-2">
							<span
								class="text-sm {owned ? 'text-emerald-300' : 'text-slate-200'}"
							>
								{LEAF_LABEL[part.slot] ?? part.slot}
							</span>
							{#if part.chance != null}
								<span class="ml-auto shrink-0 text-[11px] text-wf-muted"
									>{formatChance(part.chance)}</span
								>
							{/if}
						</div>
					{/snippet}
				</PartRow>
			{/each}
		</div>
	{/if}
</div>
