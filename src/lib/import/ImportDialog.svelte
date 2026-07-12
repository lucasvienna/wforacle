<script lang="ts">
	import { tick } from 'svelte';
	import { trapFocus } from '$lib/actions/trapFocus';
	import type { Tracker } from '$lib/tracker/tracker.svelte';
	import type { ImportStore } from './importState.svelte';

	let {
		store,
		tracker,
		open,
		onclose,
	}: {
		store: ImportStore;
		tracker: Tracker;
		open: boolean;
		onclose: () => void;
	} = $props();

	let value = $state('');
	let remember = $state(true);
	let closeBtn: HTMLButtonElement | undefined = $state();
	let prevFocus: HTMLElement | null = null;

	$effect(() => {
		if (open) {
			store.reset();
			value = store.rememberedId ?? '';
			prevFocus =
				typeof document !== 'undefined'
					? (document.activeElement as HTMLElement | null)
					: null;
			tick().then(() => closeBtn?.focus());
		} else {
			prevFocus?.focus?.();
		}
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
	function doApply() {
		store.apply(tracker, value, remember);
		onclose();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/50"
		onclick={onBackdropClick}
		role="presentation"
	></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Import from account"
		data-import-dialog
		class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-4 overflow-y-auto border-l border-wf-edge bg-wf-panel p-5"
		onkeydown={onKey}
		tabindex="-1"
		use:trapFocus
	>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-wf-gold">Import from account</h2>
			<button
				bind:this={closeBtn}
				data-import-close
				type="button"
				aria-label="Close import"
				class="text-wf-muted hover:text-wf-cyan"
				onclick={onclose}
			>
				✕
			</button>
		</div>

		<label class="text-sm text-wf-muted" for="account-id-input"
			>Account ID</label
		>
		<input
			id="account-id-input"
			data-account-input
			bind:value
			type="text"
			autocomplete="off"
			spellcheck="false"
			placeholder="24-character account ID"
			class="w-full rounded border border-wf-edge bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-wf-muted focus:outline-none"
		/>

		<details class="rounded-lg border border-wf-edge p-3 text-xs text-wf-muted">
			<summary class="cursor-pointer text-wf-cyan"
				>How to find your account ID</summary
			>
			<ol class="mt-2 list-decimal space-y-1 pl-4">
				<li>
					Open
					<a
						class="text-wf-cyan underline"
						href="https://www.warframe.com/api/user-data"
						target="_blank"
						rel="noopener noreferrer">warframe.com/api/user-data</a
					> and log in if prompted.
				</li>
				<li>
					Copy the value after <code>"user_id":</code> — a 24-character code.
				</li>
				<li>Paste it above.</li>
			</ol>
			<p class="mt-2">
				This is not your display name. Your account ID is a public in-game
				identifier and is not a password or login credential — we only send it
				to the profile API, and store it (if you allow) in your own browser.
			</p>
		</details>

		{#if store.phase === 'error'}
			<p data-import-error class="text-sm text-amber-300">{store.error}</p>
		{/if}

		{#if store.phase === 'preview' && store.result}
			<div
				data-import-preview
				class="rounded-lg border border-wf-edge p-3 text-sm text-slate-200"
			>
				<p>
					<b class="text-wf-gold">{store.result.frameIds.length}</b> frames →
					<b class="text-wf-gold">{store.result.partIds.length}</b> parts
				</p>
				<p>
					<b class="text-wf-gold">{store.result.questIds.length}</b> completed quests
				</p>
				{#if store.result.ownedUntrackedCount > 0}
					<p class="mt-1 text-xs text-wf-muted">
						{store.result.ownedUntrackedCount} owned frames aren't tracked farms (skipped).
					</p>
				{/if}
				<p class="mt-2 text-xs text-wf-muted">
					Applying only adds checks — nothing is un-checked.
				</p>
			</div>
			<label class="flex items-center gap-2 text-sm text-wf-muted">
				<input data-import-remember type="checkbox" bind:checked={remember} />
				Remember my account ID on this device
			</label>
			<button
				data-import-apply
				type="button"
				onclick={doApply}
				class="rounded border border-wf-cyan/40 bg-wf-cyan/10 px-3 py-1.5 text-sm text-wf-cyan"
			>
				Apply import
			</button>
		{:else}
			<button
				data-import-run
				type="button"
				disabled={store.phase === 'loading'}
				onclick={() => store.run(value)}
				class="rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan disabled:opacity-50"
			>
				{store.phase === 'loading' ? 'Fetching…' : 'Fetch my inventory'}
			</button>
		{/if}

		{#if store.rememberedId}
			<button
				data-import-forget
				type="button"
				onclick={() => store.forget()}
				class="self-start text-xs text-wf-muted underline hover:text-wf-cyan"
			>
				Forget saved account ID
			</button>
		{/if}
	</div>
{/if}
