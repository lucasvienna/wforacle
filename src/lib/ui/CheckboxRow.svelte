<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { activateOnKey } from './activate';

	/**
	 * A clickable, keyboard-operable checkbox row: the tick box, the checked
	 * styling, and role/aria/tabindex wiring.
	 *
	 * PartRow and QuestsPanel each had this markup verbatim, differing only in
	 * their data attribute and toggle callback (audit A4c). Two copies of
	 * hand-rolled `role="checkbox"` semantics is two chances to get the ARIA
	 * wrong, and only the one you happen to test.
	 *
	 * Extra attributes are spread onto the root, but cannot override the ARIA
	 * wiring or handlers — see the comment on the element below.
	 */
	let {
		checked,
		ontoggle,
		children,
		...rest
	}: {
		checked: boolean;
		ontoggle: () => void;
		/** Content area; receives `checked` so callers can style off it. */
		children: Snippet<[boolean]>;
		// `children` omitted from the spread: HTMLAttributes declares its own,
		// and the intersection would demand a snippet satisfying both arities.
	} & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();
</script>

<!--
	`{...rest}` is spread FIRST, deliberately. Svelte spread is last-wins, so
	spreading it last would let a caller passing `class` or `onclick` silently
	clobber the very checkbox semantics this component exists to centralise.
	Callers may add attributes; they may not override these.
-->
<div
	{...rest}
	role="checkbox"
	aria-checked={checked}
	tabindex="0"
	class="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-wf-cyan/10 {checked
		? 'border-emerald-500/30 bg-emerald-500/10'
		: ''}"
	onclick={ontoggle}
	onkeydown={activateOnKey(ontoggle)}
>
	<span
		aria-hidden="true"
		class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] {checked
			? 'border-emerald-400 bg-emerald-400 text-slate-950'
			: 'border-wf-edge text-transparent'}"
	>
		✓
	</span>
	<div class="min-w-0 flex-1">{@render children(checked)}</div>
</div>
