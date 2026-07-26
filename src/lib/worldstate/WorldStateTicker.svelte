<script lang="ts">
	import type { WorldStateStore } from './worldstate.svelte';
	import { formatCountdown } from './availability';
	import { CYCLE_GLYPH } from './cycles';

	let { store }: { store: Pick<WorldStateStore, 'state' | 'error' | 'now'> } =
		$props();

	function left(expiry: string): string {
		if (!expiry) return '—';
		return formatCountdown(new Date(expiry).getTime() - store.now);
	}
</script>

{#if store.state}
	{@const ws = store.state}
	<div
		data-worldstate
		class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wf-muted"
	>
		<span title="Cetus / Plains of Eidolon"
			>{CYCLE_GLYPH[ws.cetus.state] ?? ''} Cetus {ws.cetus.state} · {left(
				ws.cetus.expiry,
			)}</span
		>
		<span title="Orb Vallis"
			>{CYCLE_GLYPH[ws.vallis.state] ?? ''} Vallis {ws.vallis.state} · {left(
				ws.vallis.expiry,
			)}</span
		>
		<span title="Cambion Drift"
			>{CYCLE_GLYPH[ws.cambion.state] ?? ''} Cambion {ws.cambion.state} · {left(
				ws.cambion.expiry,
			)}</span
		>
		{#if ws.rotation.letter}
			{@const flip = ws.rotation.expiry
				? ` · flips ${left(ws.rotation.expiry)}`
				: ''}
			<span class="text-wf-gold" title="Global bounty reward rotation"
				>Rotation {ws.rotation.letter}{flip}</span
			>
		{/if}
	</div>
{:else if store.error}
	<div data-worldstate class="text-xs text-wf-muted">
		⚠ live status unavailable
	</div>
{:else}
	<div data-worldstate class="text-xs text-wf-muted">Loading live status…</div>
{/if}
