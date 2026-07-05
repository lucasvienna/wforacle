<script lang="ts">
	import { base } from '$app/paths';
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
</script>

<div class="mx-auto max-w-3xl p-6 text-slate-100">
	<a href="{base}/" class="text-xs font-medium text-sky-400 hover:text-sky-300">
		&lt; Back to Star Chart
	</a>

	<header class="mt-4 mb-6 flex items-center gap-3">
		<img
			src="{base}/resources/{data.resource.id}.webp"
			alt=""
			class="h-12 w-12 rounded"
		/>
		<h1 class="text-2xl font-bold">{data.resource.name} farming guide</h1>
	</header>

	<section class="mb-8 grid gap-4 sm:grid-cols-2">
		{#each recommendations as rec (rec.phase + rec.nodeLabel)}
			<div class="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
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
				<p class="mt-1 text-sm text-slate-400">{rec.note}</p>
				<p class="mt-2 text-xs text-slate-500">
					{rec.boostersApply
						? 'Boosters help: this spot relies on enemy drop tables.'
						: "Boosters don't apply: this spot is a container/deposit pickup, not an enemy drop."}
				</p>
				<div
					class="mt-3 flex items-center justify-between text-xs text-slate-500"
				>
					<a
						href={rec.source}
						target="_blank"
						rel="noreferrer"
						class="text-sky-400 hover:text-sky-300"
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
		color: #38bdf8;
	}
</style>
