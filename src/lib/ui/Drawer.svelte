<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { trapFocus } from '$lib/actions/trapFocus';
	import { createFocusRestore } from './focusRestore';

	/**
	 * The right-hand modal drawer shell: backdrop, focus trap, Escape and
	 * click-outside to close, focus moved to the close button on open and
	 * restored to the trigger on close.
	 *
	 * ImportDialog and SettingsDrawer each hand-rolled all of this identically
	 * (audit A4c). Accessibility is the reason to share it rather than the
	 * markup — three separate focus-trap implementations means three chances to
	 * get a keyboard trap subtly wrong, and only the one you happen to test.
	 */
	let {
		open,
		title,
		onclose,
		onopen,
		children,
		closeLabel,
		closeAttrs = {},
		...rest
	}: {
		open: boolean;
		/** Rendered as the drawer's <h2> and its accessible name. */
		title: string;
		onclose: () => void;
		/** Run when the drawer opens — for resetting caller-owned state. */
		onopen?: () => void;
		children: Snippet;
		/** aria-label for the ✕ button; defaults to "Close {title}". */
		closeLabel?: string;
		/** Extra attributes for the close button, e.g. a data-* test hook. */
		closeAttrs?: Record<string, string>;
		// Anything else is spread onto the dialog element. Typed as div
		// attributes rather than an index signature so `data-import-dialog`
		// is accepted while a typo'd prop name still fails the build.
	} & HTMLAttributes<HTMLDivElement> = $props();

	let closeBtn: HTMLButtonElement | undefined = $state();
	const focus = createFocusRestore();

	$effect(() => {
		if (open) {
			onopen?.();
			focus.capture();
			// Deferred a tick: the button does not exist until the {#if} block
			// has rendered.
			tick().then(() => closeBtn?.focus());
		} else {
			focus.restore();
		}
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function onBackdropClick(e: MouseEvent) {
		// Only a click on the backdrop itself, not one bubbling out of the panel.
		if (e.target === e.currentTarget) onclose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50" onclick={onBackdropClick} role="presentation"></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-label={title}
		class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-wf-edge bg-wf-panel p-5"
		onkeydown={onKey}
		tabindex="-1"
		use:trapFocus
		{...rest}
	>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-wf-gold">{title}</h2>
			<button
				bind:this={closeBtn}
				type="button"
				aria-label={closeLabel ?? `Close ${title.toLowerCase()}`}
				class="text-wf-muted hover:text-wf-cyan"
				onclick={onclose}
				{...closeAttrs}
			>
				✕
			</button>
		</div>

		{@render children()}
	</div>
{/if}
