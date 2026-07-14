<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SeoHead
	title="Warframe Resource Farming Guides — wforacle"
	description="Curated, wiki-sourced farming locations for every Warframe resource — where to farm each material early and late game."
	path="/guides"
/>

<div class="mx-auto max-w-screen-2xl p-6 text-slate-100">
	<a
		href={resolve('/')}
		class="text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
	>
		&lt; Back to Star Chart
	</a>

	<header class="mt-4 mb-6">
		<h1 class="text-2xl font-bold">Warframe Resource Farming Guides</h1>
		<p class="mt-2 text-sm text-wf-muted">
			Wiki-sourced farming locations for every tracked resource — pick a
			material below for its best early- and late-game spots.
		</p>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each data.guides as g (g.id)}
			<a
				href={resolve('/guides/[resource]', { resource: g.id })}
				class="flex items-start gap-3 rounded-xl border border-wf-edge bg-wf-panel p-4 hover:border-wf-cyan/60"
			>
				<img
					src={asset(`/resources/${g.id}.webp`)}
					alt={g.name}
					class="h-10 w-10 shrink-0 rounded"
					loading="lazy"
				/>
				<div>
					<h2 class="text-base font-semibold text-slate-100">{g.name}</h2>
					<p class="mt-1 text-sm text-wf-muted">{g.blurb}</p>
				</div>
			</a>
		{/each}
	</section>
</div>
