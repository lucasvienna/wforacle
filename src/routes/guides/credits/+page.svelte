<script lang="ts">
	import GuideLongform from '$lib/guides/GuideLongform.svelte';
	import { CREDITS_GUIDE } from '$lib/guides/credits';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!--
	Only the prose carrying inline markup lives here; every section shell, the
	SEO block and the recommendation cards come from GuideLongform, and the
	plain-data content from $lib/guides/credits.
-->
{#snippet conceptCards()}
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<h3 class="text-sm font-semibold text-emerald-300">
			End-of-mission rewards
		</h3>
		<p class="mt-1 text-xs text-wf-muted">
			Dark Sectors · Arbitrations · Sorties · Railjack
		</p>
		<p class="mt-2 text-sm text-wf-muted">
			Doubled by the <strong>Daily First Win Bonus</strong> and by a
			<strong>Credit Booster</strong> — stack both for ×4.
		</p>
	</div>
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<h3 class="text-sm font-semibold text-amber-300">Pickups &amp; caches</h3>
		<p class="mt-1 text-xs text-wf-muted">
			The Index · Laomedeia · Techrot Safes · Profit-Taker
		</p>
		<p class="mt-2 text-sm text-wf-muted">
			Doubled by a <strong>Credit Booster</strong>,
			<strong>Chroma’s Effigy</strong>
			(drops), the <strong>MR30 Blessing</strong> and
			<strong>Prosperous Retriever</strong> — never by the First Win Bonus.
		</p>
	</div>
{/snippet}

{#snippet workedExample()}
	Worked example — Profit-Taker’s guaranteed drop: 125,000 base → 250,000 with
	Effigy → <strong class="text-slate-100">500,000 per kill</strong> with a Credit
	Booster on top. The First Win Bonus never touches drops, so spend it elsewhere.
{/snippet}

<GuideLongform
	resource={data.resource}
	content={CREDITS_GUIDE}
	{conceptCards}
	{workedExample}
/>
