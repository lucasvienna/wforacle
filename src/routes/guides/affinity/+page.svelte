<script lang="ts">
	import GuideLongform from '$lib/guides/GuideLongform.svelte';
	import { AFFINITY_GUIDE } from '$lib/guides/affinity';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!--
	Only the prose carrying inline markup lives here; every section shell, the
	SEO block and the recommendation cards come from GuideLongform, and the
	plain-data content from $lib/guides/affinity.
-->
{#snippet conceptCards()}
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<h3 class="text-sm font-semibold text-emerald-300">Your kills</h3>
		<p class="mt-1 text-xs text-wf-muted">
			Ability kills · weapon kills · companion assists
		</p>
		<p class="mt-2 text-sm text-wf-muted">
			An ability kill sends <strong>100% to your Warframe</strong>; a weapon
			kill splits <strong>50/50</strong> between frame and killing weapon. Since Update
			43.0, damaging an enemy that your companion finishes (or vice versa) grants
			both of you full kill affinity.
		</p>
	</div>
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<h3 class="text-sm font-semibold text-amber-300">Squad kills</h3>
		<p class="mt-1 text-xs text-wf-muted">
			Anything killed within 50 m of you (250 m in open worlds, no limit in
			Railjack)
		</p>
		<p class="mt-2 text-sm text-wf-muted">
			<strong
				>25% to your Warframe, 75% split evenly across your equipped weapons</strong
			> — carry one weapon and it takes the full 75%; carry three and each gets 25%.
		</p>
	</div>
{/snippet}

{#snippet workedExample()}
	Worked example — Affinity Booster (×2) × Double Affinity weekend (×2) × MR30
	Blessing (×1.25) = <strong class="text-slate-100">×5 on every kill</strong>,
	all multiplicative. A Charm proc during that window triples it again for two
	minutes.
{/snippet}

<GuideLongform
	resource={data.resource}
	content={AFFINITY_GUIDE}
	{conceptCards}
	{workedExample}
/>
