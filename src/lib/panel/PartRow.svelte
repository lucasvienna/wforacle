<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';

	let {
		part,
		tracker,
		children,
	}: {
		part: WarframePart;
		tracker: Tracker;
		/** Content area; receives the current `owned` flag for styling. */
		children: Snippet<[boolean]>;
	} = $props();

	let owned = $derived(tracker.isOwned(part.id));
</script>

<div
	data-part={part.id}
	data-owned={owned}
	role="checkbox"
	aria-checked={owned}
	tabindex="0"
	class="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {owned
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
		aria-hidden="true"
		class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] {owned
			? 'border-emerald-400 bg-emerald-400 text-slate-950'
			: 'border-wf-edge text-transparent'}"
	>
		✓
	</span>
	<div class="min-w-0 flex-1">{@render children(owned)}</div>
</div>
