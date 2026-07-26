<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { WarframePart } from '$lib/model/types';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import CheckboxRow from '$lib/ui/CheckboxRow.svelte';

	// Kept as its own component rather than folded into CheckboxRow: callers
	// pass a part and a tracker, not a boolean and a callback, and PartRow is
	// what knows how to turn one into the other.
	let {
		part,
		tracker,
		children: content,
	}: {
		part: WarframePart;
		tracker: Tracker;
		/** Content area; receives the current `owned` flag for styling. */
		children: Snippet<[boolean]>;
	} = $props();

	let owned = $derived(tracker.isOwned(part.id));
</script>

<CheckboxRow
	checked={owned}
	ontoggle={() => tracker.togglePart(part.id)}
	data-part={part.id}
	data-owned={owned}
>
	{#snippet children(isOwned)}
		{@render content(isOwned)}
	{/snippet}
</CheckboxRow>
