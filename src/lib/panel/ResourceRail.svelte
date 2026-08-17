<script lang="ts">
	import type { Resource } from '$lib/model/types';
	import { bestPhaseRec } from '$lib/model/resources';
	import {
		PHASES,
		PHASE_RAIL_LABEL,
		PHASE_SHORT_LABEL,
		PHASE_TAG,
		PHASE_TEXT,
	} from '$lib/guides/phases';
	import { asset, resolve } from '$app/paths';

	let { resources, regionId }: { resources: Resource[]; regionId: string } = $props();

	/**
	 * Best rec per phase, plus whether that rec's farm is on the region being
	 * viewed. This was previously three hand-written chips and three
	 * hand-written lines with their emoji, wording and colours inlined — a
	 * fourth copy of the phase vocabulary, and the one most likely to drift out
	 * of sync with the guide pages, since nothing connected them.
	 */
	function phaseRows(r: Resource) {
		return PHASES.map((phase) => {
			const rec = bestPhaseRec(r, phase);
			return { phase, rec, here: !!rec && rec.regionId === regionId };
		}).filter((row) => row.rec);
	}
</script>

<section class="lg:sticky lg:top-4" data-resource-rail>
	<!-- Mirrors the left column's header rhythm (h2 mb-4, then a text-xs
	     label line with mb-3) so the first card tops align across columns. -->
	<h2 class="mb-4 text-lg font-semibold text-wf-gold">Resources</h2>
	<p class="mb-3 text-xs text-wf-muted">Informational · best farm spots badged by game phase</p>
	{#if resources.length > 0}
		<ul class="space-y-3">
			{#each resources as r (r.id)}
				{@const rows = phaseRows(r)}
				<li class="rounded-xl border border-wf-edge bg-wf-panel p-4">
					<div class="flex flex-wrap items-center gap-2">
						<img
							src={asset(`/resources/${r.id}.webp`)}
							alt=""
							class="h-8 w-8 shrink-0 rounded"
							loading="lazy"
						/>
						<span class="text-sm font-medium text-slate-200">{r.name}</span>
						{#each rows.filter((row) => row.here) as row (row.phase)}
							<span
								class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[
									row.phase
								]}"
							>
								{PHASE_RAIL_LABEL[row.phase]}
							</span>
						{/each}
						{#if r.recommendations.length > 0}
							<a
								href={resolve('/guides/[resource]', { resource: r.id })}
								class="ml-auto shrink-0 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
							>
								farming ▸
							</a>
						{/if}
					</div>
					{#each rows as row, i (row.phase)}
						<p
							class="{i === 0 ? 'mt-1.5' : 'mt-0.5'} text-xs {row.here
								? PHASE_TEXT[row.phase]
								: 'text-wf-muted'}"
						>
							{PHASE_SHORT_LABEL[row.phase]}: {row.rec?.nodeLabel}
						</p>
					{/each}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-wf-muted">No notable resources.</p>
	{/if}
</section>
