<script lang="ts">
	import type { Snippet } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { breadcrumbLd, guideLd } from '$lib/seo/jsonld';
	import { guideDescription } from '$lib/seo/meta';
	import { SITE_URL } from '$lib/seo/config';
	import type { Resource } from '$lib/model/types';
	import { byPhase } from './phases';
	import RecCard from './RecCard.svelte';
	import type { GuideContent } from './types';

	/**
	 * Every section shell for a bespoke long-form guide. Adding a new one (Endo,
	 * Focus) means writing a content file plus the three prose snippets below —
	 * no copied headings, grids, tables or card chrome.
	 *
	 * The three snippets exist because that prose carries inline markup
	 * (<strong> mid-sentence), which does not survive being modelled as plain
	 * data. Everything without inline markup is data in GuideContent.
	 */
	let {
		resource,
		content,
		conceptCards,
		workedExample,
	}: {
		resource: Resource;
		content: GuideContent;
		/** The two side-by-side cards opening the concept section. */
		conceptCards: Snippet;
		/** The paragraph beneath the multipliers table. */
		workedExample: Snippet;
	} = $props();

	let canonical = $derived(`${SITE_URL}/guides/${resource.id}`);
	let recommendations = $derived(byPhase(resource.recommendations));
	// Only render the "Applies to" column when at least one row uses it.
	let hasChannel = $derived(content.multipliers.some((m) => m.channel));
</script>

<SeoHead
	title={content.seoTitle}
	description={guideDescription(resource)}
	path={`/guides/${resource.id}`}
	type="article"
	jsonLd={[
		breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: content.breadcrumb, url: canonical },
		]),
		guideLd(resource, canonical),
	]}
/>

<div class="mx-auto max-w-5xl p-6 text-slate-100">
	<a
		href={resolve('/')}
		class="text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
	>
		&lt; Back to Star Chart
	</a>

	<header class="mt-4 mb-6 flex items-center gap-3">
		<img
			src={asset(`/resources/${resource.id}.webp`)}
			alt={resource.name}
			class="h-12 w-12 rounded"
		/>
		<div>
			<h1 class="text-2xl font-bold">{resource.name} farming guide</h1>
			<p class="mt-1 text-sm text-wf-muted">{content.tagline}</p>
		</div>
	</header>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">{content.conceptTitle}</h2>
		<p class="mb-4 text-sm text-wf-muted">{content.conceptIntro}</p>
		<div class="grid gap-4 sm:grid-cols-2">
			{@render conceptCards()}
		</div>
		<p class="mt-3 text-xs text-amber-300/90">⚠ {content.conceptWarning}</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The progression path</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each recommendations as rec (rec.phase + rec.nodeLabel)}
				<RecCard {rec} />
			{/each}
		</div>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Stacking multipliers</h2>
		<div class="overflow-x-auto rounded-xl border border-wf-edge">
			<table class="w-full text-left text-sm">
				<thead class="bg-wf-panel text-xs text-wf-muted">
					<tr>
						<th scope="col" class="px-3 py-2 font-medium">Multiplier</th>
						{#if hasChannel}
							<th scope="col" class="px-3 py-2 font-medium">Applies to</th>
						{/if}
						<th scope="col" class="px-3 py-2 font-medium">Effect</th>
					</tr>
				</thead>
				<tbody>
					{#each content.multipliers as m (m.name)}
						<tr class="border-t border-wf-edge">
							<td class="px-3 py-2 font-medium text-slate-100">{m.name}</td>
							{#if hasChannel}
								<td class="px-3 py-2 text-wf-muted">{m.channel}</td>
							{/if}
							<td class="px-3 py-2 text-wf-muted">{m.effect}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-wf-muted">{@render workedExample()}</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Outdated advice</h2>
		<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
			<ul class="space-y-3 text-sm">
				{#each content.myths as m (m.claim)}
					<li>
						<p class="font-medium text-slate-100">“{m.claim}”</p>
						<p class="mt-0.5 text-wf-muted">{m.truth}</p>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Honorable mentions</h2>
		{#each content.mentions as m, i (m.lead)}
			<p
				class="text-sm text-wf-muted {i < content.mentions.length - 1
					? 'mb-2'
					: ''}"
			>
				<strong class="text-slate-100">{m.lead}</strong> — {m.text}
			</p>
		{/each}
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Sources</h2>
		<!--
			space-y-1 + inline-block py-1 give each source link a >=24px tap target
			with >=24px between neighbours. At the default 16px line height these
			links were 16px tall and 16.2px apart, failing Lighthouse's target-size
			audit and, more to the point, being genuinely fiddly to hit on a phone.
		-->
		<ul class="list-disc space-y-1 pl-5 text-sm">
			{#each content.sources as s (s.url)}
				<li>
					<a
						href={s.url}
						target="_blank"
						rel="noreferrer"
						class="inline-block py-1 text-wf-cyan hover:text-wf-cyan/80"
					>
						{s.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
