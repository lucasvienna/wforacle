<script lang="ts">
	import { tick } from 'svelte';
	import { filterPaletteItems, type PaletteItem } from './search';

	let {
		items,
		open,
		onclose,
		onselect,
	}: {
		items: PaletteItem[];
		open: boolean;
		onclose: () => void;
		onselect: (item: PaletteItem) => void;
	} = $props();

	let query = $state('');
	let highlight = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	let results = $derived(filterPaletteItems(items, query));
	let clampedHighlight = $derived(
		Math.min(highlight, Math.max(results.length - 1, 0)),
	);

	$effect(() => {
		if (open) {
			query = '';
			highlight = 0;
			tick().then(() => inputEl?.focus());
		}
	});

	function select(item: PaletteItem) {
		onselect(item);
		onclose();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(clampedHighlight + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(clampedHighlight - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = results[clampedHighlight];
			if (item) select(item);
		} else if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		role="presentation"
	>
		<div
			class="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			tabindex="-1"
		>
			<input
				bind:this={inputEl}
				bind:value={query}
				{onkeydown}
				type="text"
				placeholder="Search planets, frames, resources…"
				class="w-full border-b border-slate-700 bg-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
			/>
			<div
				class="max-h-80 overflow-y-auto p-2"
				role="listbox"
				aria-label="Results"
			>
				{#if results.length > 0}
					{#each results as item, index (item.type + ':' + item.id)}
						<button
							type="button"
							data-palette-item
							data-type={item.type}
							role="option"
							aria-selected={index === clampedHighlight}
							class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left {index ===
							clampedHighlight
								? 'bg-slate-800'
								: ''}"
							onclick={() => select(item)}
							onmouseenter={() => (highlight = index)}
						>
							<span class="text-sm font-medium text-slate-100"
								>{item.label}</span
							>
							<span class="shrink-0 text-xs text-slate-500"
								>{item.sublabel}</span
							>
						</button>
					{/each}
				{:else}
					<p class="px-3 py-2 text-sm text-slate-500">No matches.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
