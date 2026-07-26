<script lang="ts">
	import type { Recommendation } from '$lib/model/types';
	import { PHASE_LABEL, PHASE_TAG, boosterNote } from './phases';

	// `headingLevel` because the same card is used in two document outlines: the
	// bespoke guides nest it under a section <h2> (so h3), while [resource]
	// renders cards directly under the page <h1> (so h2). Hard-coding either
	// one would break heading order on the other page.
	let { rec, headingLevel = 3 }: { rec: Recommendation; headingLevel?: 2 | 3 } =
		$props();
</script>

<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
	<span
		class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[
			rec.phase
		]}"
	>
		{PHASE_LABEL[rec.phase]}
	</span>
	<svelte:element
		this={`h${headingLevel}`}
		class="mt-2 text-base font-semibold text-slate-100"
	>
		{rec.nodeLabel}
	</svelte:element>
	<p class="mt-1 text-sm text-wf-muted">{rec.note}</p>
	<p class="mt-2 text-xs text-wf-muted">{boosterNote(rec)}</p>
	<div class="mt-3 flex items-center justify-between text-xs text-wf-muted">
		<a
			href={rec.source}
			target="_blank"
			rel="noopener noreferrer"
			class="text-wf-cyan hover:text-wf-cyan/80"
		>
			Source ↗
		</a>
		<span>Verified {rec.lastVerified}</span>
	</div>
</div>
