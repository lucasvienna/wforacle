<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { breadcrumbLd, guideLd } from '$lib/seo/jsonld';
	import { guideDescription } from '$lib/seo/meta';
	import { SITE_URL } from '$lib/seo/config';
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

	// Early recs first, then late — recommendations come back from the
	// dataset in that order already, but sort defensively so the layout is
	// stable even if that ever changes.
	let recommendations = $derived(
		[...data.resource.recommendations].sort((a, b) =>
			a.phase === b.phase ? 0 : a.phase === 'early' ? -1 : 1,
		),
	);

	let canonical = $derived(`${SITE_URL}/guides/${data.resource.id}`);
</script>

<SeoHead
	title={`${data.resource.name} Farming Guide — Best Locations | wforacle`}
	description={guideDescription(data.resource)}
	path={`/guides/${data.resource.id}`}
	type="article"
	jsonLd={[
		breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: `${data.resource.name} Farming Guide`, url: canonical },
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
			src={asset(`/resources/${data.resource.id}.webp`)}
			alt={data.resource.name}
			class="h-12 w-12 rounded"
		/>
		<h1 class="text-2xl font-bold">{data.resource.name} farming guide</h1>
	</header>

	<section class="mb-8 grid gap-4 sm:grid-cols-2">
		{#each recommendations as rec (rec.phase + rec.nodeLabel)}
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<span
					class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[
						rec.phase
					]}"
				>
					{PHASE_LABEL[rec.phase]}
				</span>
				<h2 class="mt-2 text-base font-semibold text-slate-100">
					{rec.nodeLabel}
				</h2>
				<p class="mt-1 text-sm text-wf-muted">{rec.note}</p>
				<p class="mt-2 text-xs text-wf-muted">
					{rec.boosterNote ??
						(rec.boostersApply
							? 'Boosters help: this spot relies on enemy drop tables.'
							: "Boosters don't apply: this spot is a container/deposit pickup, not an enemy drop.")}
				</p>
				<div
					class="mt-3 flex items-center justify-between text-xs text-wf-muted"
				>
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
		{/each}
	</section>

	{#if data.guide}
		<section class="guide-prose">
			<data.guide />
		</section>
	{/if}
</div>

<style>
	.guide-prose :global(h2) {
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #f1f5f9;
	}
	.guide-prose :global(p) {
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
		color: #cbd5e1;
	}
	.guide-prose :global(ul) {
		margin-bottom: 0.75rem;
		padding-left: 1.25rem;
		list-style: disc;
		font-size: 0.875rem;
		color: #cbd5e1;
	}
	.guide-prose :global(a) {
		color: #37d2e6;
	}
</style>
