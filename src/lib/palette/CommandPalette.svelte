<script lang="ts">
	import { tick } from 'svelte';
	import { trapFocus } from '$lib/actions/trapFocus';
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
	let rowEls: (HTMLButtonElement | undefined)[] = $state([]);
	let triggerEl: HTMLElement | null = null;

	let results = $derived(filterPaletteItems(items, query));
	let clampedHighlight = $derived(
		Math.min(highlight, Math.max(results.length - 1, 0)),
	);

	$effect(() => {
		if (open) {
			triggerEl =
				typeof document !== 'undefined'
					? (document.activeElement as HTMLElement | null)
					: null;
			query = '';
			highlight = 0;
			tick().then(() => inputEl?.focus());
		} else {
			triggerEl?.focus?.();
		}
	});

	function scrollHighlightIntoView() {
		rowEls[clampedHighlight]?.scrollIntoView?.({ block: 'nearest' });
	}

	function select(item: PaletteItem) {
		onselect(item);
		onclose();
	}

	// Reset the highlight back to the top result whenever the query changes,
	// so a stale highlight (e.g. from arrowing) can't linger after narrowing.
	function oninput() {
		highlight = 0;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(clampedHighlight + 1, results.length - 1);
			scrollHighlightIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(clampedHighlight - 1, 0);
			scrollHighlightIntoView();
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
			class="w-full max-w-lg rounded-xl border border-wf-edge bg-wf-panel/95 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			tabindex="-1"
			use:trapFocus
		>
			<input
				bind:this={inputEl}
				bind:value={query}
				{onkeydown}
				{oninput}
				type="text"
				role="combobox"
				aria-expanded="true"
				aria-autocomplete="list"
				aria-controls="palette-listbox"
				aria-activedescendant={results.length
					? `palette-opt-${clampedHighlight}`
					: undefined}
				placeholder="Search planets, frames, resources…"
				class="w-full border-b border-wf-edge bg-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-wf-muted focus:outline-none"
			/>
			<div
				id="palette-listbox"
				class="max-h-80 overflow-y-auto p-2"
				role="listbox"
				aria-label="Results"
			>
				{#if results.length > 0}
					{#each results as item, index (item.type + ':' + item.id)}
						<button
							bind:this={rowEls[index]}
							id={`palette-opt-${index}`}
							type="button"
							data-palette-item
							data-type={item.type}
							role="option"
							aria-selected={index === clampedHighlight}
							class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left {index ===
							clampedHighlight
								? 'bg-wf-cyan/10'
								: ''}"
							onclick={() => select(item)}
							onmouseenter={() => (highlight = index)}
						>
							<span class="text-sm font-medium text-slate-100"
								>{item.label}</span
							>
							<span class="shrink-0 text-xs text-wf-muted">{item.sublabel}</span
							>
						</button>
					{/each}
				{:else}
					<p class="px-3 py-2 text-sm text-wf-muted">No matches.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
