<script lang="ts">
	import type { Region } from '$lib/model/types';
	import { layoutRing } from './geometry';

	let {
		regions,
		selectedId,
		statusOf,
		onselect,
	}: {
		regions: Region[];
		selectedId: string;
		statusOf: (id: string) => 'done' | 'part' | 'none';
		onselect: (id: string) => void;
	} = $props();

	const VBW = 1120,
		VBH = 480;
	let placed = $derived(layoutRing(regions, { cx: VBW / 2 }));
</script>

<svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" class="block select-none">
	<ellipse
		cx={VBW / 2}
		cy="238"
		rx="500"
		ry="150"
		fill="none"
		stroke="#1c3050"
		stroke-width="1.5"
		opacity="0.7"
	/>
	{#each placed as p (p.region.id)}
		{@const status = statusOf(p.region.id)}
		{@const sel = p.region.id === selectedId}
		<g
			role="button"
			tabindex="0"
			data-region={p.region.id}
			class="cursor-pointer"
			onclick={() => onselect(p.region.id)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if (e.key === ' ') e.preventDefault();
					onselect(p.region.id);
				}
			}}
		>
			{#if sel}
				<circle
					cx={p.x}
					cy={p.y}
					r={p.r + 7}
					fill="none"
					stroke="#37d2e6"
					stroke-width="2"
				/>
			{:else if status !== 'none'}
				<circle
					cx={p.x}
					cy={p.y}
					r={p.r + 4}
					fill="none"
					stroke={status === 'done' ? '#2ee6a0' : '#e6b854'}
					stroke-width="2"
					opacity="0.7"
				/>
			{/if}
			<circle
				cx={p.x}
				cy={p.y}
				r={p.r}
				fill={status === 'done'
					? '#2ee6a0'
					: status === 'part'
						? '#c99a4a'
						: '#33506f'}
				stroke="#0a1018"
			/>
			<text
				x={p.x}
				y={p.y + p.r + 16}
				text-anchor="middle"
				font-size={p.front > 0.55 ? 15 : 12}
				fill={sel ? '#37d2e6' : p.front > 0.5 ? '#cfe0f2' : '#8298b4'}
				>{p.region.name.toUpperCase()}</text
			>
		</g>
	{/each}
</svg>
