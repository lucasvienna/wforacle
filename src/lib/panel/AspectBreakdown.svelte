<script lang="ts">
	import type { WarframePart } from '$lib/model/types';
	import { aspectBreakdownLines } from './format';

	let { part, owned }: { part: WarframePart; owned: boolean } = $props();

	// Seed collapse state ONCE: collapsed if the aspect is already owned, open
	// while unobtained. Mirrors FrameCard's seed-once defaultExpanded and its
	// rule that toggling a part must not snap sections shut mid-interaction.
	// svelte-ignore state_referenced_locally
	let open = $state(!owned);
</script>

<div class="mt-1">
	<button
		type="button"
		class="flex items-center gap-1 text-[11px] text-wf-muted hover:text-slate-300"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
		onkeydown={(e) => e.stopPropagation()}
	>
		<span aria-hidden="true">{open ? '▾' : '▸'}</span>
		Blueprints
	</button>
	{#if open}
		<div class="mt-0.5 pl-4 text-[11px] text-wf-muted">
			{#each aspectBreakdownLines(part) as line (line)}
				<div>{line}</div>
			{/each}
		</div>
	{/if}
</div>
