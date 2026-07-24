<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { breadcrumbLd, guideLd } from '$lib/seo/jsonld';
	import { guideDescription } from '$lib/seo/meta';
	import { SITE_URL } from '$lib/seo/config';
	import type { Recommendation } from '$lib/model/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const PHASE_LABEL = {
		early: '⚡ Early game',
		late: '💀 Late / endgame',
	} as const;
	const PHASE_TAG = {
		early: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
		late: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
	} as const;

	let early = $derived(
		data.resource.recommendations.filter((r) => r.phase === 'early'),
	);
	let late = $derived(
		data.resource.recommendations.filter((r) => r.phase === 'late'),
	);

	const canonical = `${SITE_URL}/guides/credits`;
</script>

{#snippet recCard(rec: Recommendation)}
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<span
			class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[
				rec.phase
			]}"
		>
			{PHASE_LABEL[rec.phase]}
		</span>
		<h3 class="mt-2 text-base font-semibold text-slate-100">{rec.nodeLabel}</h3>
		<p class="mt-1 text-sm text-wf-muted">{rec.note}</p>
		<p class="mt-2 text-xs text-wf-muted">{rec.boosterNote}</p>
		<div class="mt-3 flex items-center justify-between text-xs text-wf-muted">
			<a
				href={rec.source}
				target="_blank"
				rel="noreferrer"
				class="text-wf-cyan hover:text-wf-cyan/80"
			>
				Source ↗
			</a>
			<span>Verified {rec.lastVerified}</span>
		</div>
	</div>
{/snippet}

<SeoHead
	title="Credits Farming Guide — Best Locations | wforacle"
	description={guideDescription(data.resource)}
	path="/guides/credits"
	type="article"
	jsonLd={[
		breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: 'Credits Farming Guide', url: canonical },
		]),
		guideLd(data.resource, canonical),
	]}
/>

<div class="mx-auto max-w-3xl p-6 text-slate-100">
	<a
		href={resolve('/')}
		class="text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
	>
		&lt; Back to Star Chart
	</a>

	<header class="mt-4 mb-6 flex items-center gap-3">
		<img
			src={asset('/resources/credits.webp')}
			alt={data.resource.name}
			class="h-12 w-12 rounded"
		/>
		<div>
			<h1 class="text-2xl font-bold">{data.resource.name} farming guide</h1>
			<p class="mt-1 text-sm text-wf-muted">
				Every credit source pays through one of two channels — and every
				multiplier only works on one of them.
			</p>
		</div>
	</header>

	<!-- two-channel rule section inserted here in a follow-up -->

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The progression path</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each early as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
			{#each late as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
		</div>
	</section>

	<!-- stacking table, myth-bust and honorable-mention sections inserted here in a follow-up -->
</div>
