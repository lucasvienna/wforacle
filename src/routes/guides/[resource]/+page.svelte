<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { breadcrumbLd, guideLd } from '$lib/seo/jsonld';
	import { guideDescription } from '$lib/seo/meta';
	import { SITE_URL } from '$lib/seo/config';
	import { byPhase } from '$lib/guides/phases';
	import RecCard from '$lib/guides/RecCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let recommendations = $derived(byPhase(data.resource.recommendations));

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
			<!-- headingLevel 2: these cards sit directly under the page <h1>,
			     unlike the bespoke guides where they nest under a section <h2>. -->
			<RecCard {rec} headingLevel={2} />
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
