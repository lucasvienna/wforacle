<script lang="ts">
	import type { Resource } from '$lib/model/types';
	import { bestPhaseRec } from '$lib/model/resources';
	import { asset, resolve } from '$app/paths';

	let { resources, regionId }: { resources: Resource[]; regionId: string } =
		$props();
</script>

<section
	class="rounded-xl border border-wf-edge bg-wf-panel p-5 lg:sticky lg:top-4"
	data-resource-rail
>
	<h2 class="text-lg font-semibold text-wf-gold">Resources</h2>
	<p class="mt-0.5 mb-4 text-xs text-wf-muted">
		Informational · best farm spots badged by game phase
	</p>
	{#if resources.length > 0}
		<ul class="space-y-2">
			{#each resources as r (r.id)}
				{@const early = bestPhaseRec(r, 'early')}
				{@const late = bestPhaseRec(r, 'late')}
				{@const earlyHere = !!early && early.regionId === regionId}
				{@const lateHere = !!late && late.regionId === regionId}
				<li class="rounded-lg border border-wf-edge px-3 py-2">
					<div class="flex flex-wrap items-center gap-2">
						<img
							src={asset(`/resources/${r.id}.webp`)}
							alt=""
							class="h-8 w-8 shrink-0 rounded"
							loading="lazy"
						/>
						<span class="text-sm font-medium text-slate-200">{r.name}</span>
						{#if earlyHere}
							<span
								class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
							>
								⚡ early best
							</span>
						{/if}
						{#if lateHere}
							<span
								class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
							>
								💀 late best
							</span>
						{/if}
						{#if r.recommendations.length > 0}
							<a
								href={resolve('/guides/[resource]', { resource: r.id })}
								class="ml-auto shrink-0 text-xs font-medium text-wf-cyan hover:text-wf-cyan/80"
							>
								farming ▸
							</a>
						{/if}
					</div>
					{#if early}
						<p
							class="mt-1.5 text-xs {earlyHere
								? 'text-emerald-300'
								: 'text-wf-muted'}"
						>
							⚡ Early: {early.nodeLabel}
						</p>
					{/if}
					{#if late}
						<p
							class="mt-0.5 text-xs {lateHere
								? 'text-amber-300'
								: 'text-wf-muted'}"
						>
							💀 Late: {late.nodeLabel}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-wf-muted">No notable resources.</p>
	{/if}
</section>
