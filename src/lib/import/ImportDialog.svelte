<script lang="ts">
	import Drawer from '$lib/ui/Drawer.svelte';
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
	let helpOpen = $state(false);

	/**
	 * Differentiate the *action*, not just the wording — the messages were
	 * already per-kind. A wrong or malformed ID means the user needs the "how to
	 * find it" steps, so expand them for real rather than making them hunt; a
	 * network or rate-limit failure is transient, so offer a retry. `empty` and
	 * `unknown` get neither, because neither would help.
	 */
	let wrongId = $derived(store.errorKind === 'notFound' || store.errorKind === 'invalid');
	let retryable = $derived(store.errorKind === 'network' || store.errorKind === 'rateLimited');

	$effect(() => {
		if (wrongId) helpOpen = true;
	});

	function onOpen() {
		store.reset();
		value = store.rememberedId ?? '';
		helpOpen = false;
	}

	function doApply() {
		store.apply(tracker, value, remember);
		onclose();
	}
</script>

<Drawer
	{open}
	{onclose}
	title="Import from account"
	closeLabel="Close import"
	closeAttrs={{ 'data-import-close': '' }}
	onopen={onOpen}
	data-import-dialog
>
	<label class="text-sm text-wf-muted" for="account-id-input">Account ID</label>
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

	<details
		bind:open={helpOpen}
		data-import-help
		class="rounded-lg border border-wf-edge p-3 text-xs text-wf-muted"
	>
		<summary class="cursor-pointer text-wf-cyan">How to find your account ID</summary>
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
			This is not your display name. Your account ID is a public in-game identifier and is not a
			password or login credential — we only send it to the profile API, and store it (if you allow)
			in your own browser.
		</p>
	</details>

	{#if store.phase === 'error'}
		<div role="alert">
			<p data-import-error class="text-sm text-amber-300">{store.error}</p>
			{#if retryable}
				<button
					data-import-retry
					type="button"
					onclick={() => store.run(value)}
					class="mt-2 rounded border border-wf-edge px-3 py-1.5 text-sm text-wf-muted hover:text-wf-cyan"
				>
					Try again
				</button>
			{/if}
		</div>
	{/if}

	{#if store.phase === 'preview' && store.result}
		<div data-import-preview class="rounded-lg border border-wf-edge p-3 text-sm text-slate-200">
			<p>
				<b class="text-wf-gold">{store.result.frameIds.length}</b> frames →
				<b class="text-wf-gold">{store.result.partIds.length}</b> parts
			</p>
			<p>
				<b class="text-wf-gold">{store.result.questIds.length}</b> completed quests
			</p>
			{#if store.result.ownedUntrackedCount > 0}
				<p class="mt-1 text-xs text-wf-muted">
					{store.result.ownedUntrackedCount} owned frames aren't tracked here (skipped).
				</p>
			{/if}
			<p class="mt-2 text-xs text-wf-muted">Applying only adds checks — nothing is un-checked.</p>
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
</Drawer>
