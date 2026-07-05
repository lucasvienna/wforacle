<script lang="ts">
	import type { Region } from '$lib/model/types';
	import { base } from '$app/paths';
	import { layoutRing } from './geometry';

	const planetSrc = (id: string) => `${base}/planets/${id}.webp`;

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
	<defs>
		<radialGradient id="wf-space" cx="50%" cy="34%" r="70%">
			<stop offset="0%" stop-color="#12233b" />
			<stop offset="55%" stop-color="#0a1420" />
			<stop offset="100%" stop-color="#05080d" />
		</radialGradient>
		<radialGradient id="wf-core" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="rgba(230,184,84,0.5)" />
			<stop offset="45%" stop-color="rgba(55,120,140,0.18)" />
			<stop offset="100%" stop-color="rgba(5,8,13,0)" />
		</radialGradient>
	</defs>
	<rect x="0" y="0" width={VBW} height={VBH} fill="url(#wf-space)" />
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
	<ellipse cx={VBW / 2} cy="244" rx="150" ry="120" fill="url(#wf-core)" />
	<text
		x={VBW / 2}
		y="234"
		text-anchor="middle"
		fill="rgba(230,240,255,0.28)"
		font-size="34"
		font-family="serif">&#10022;</text
	>
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
			<!-- transparent hit area so the whole planet region is clickable -->
			<circle cx={p.x} cy={p.y} r={p.r + 9} fill="transparent" />
			{#if sel}
				<circle
					cx={p.x}
					cy={p.y}
					r={p.r + 8}
					fill="none"
					stroke="#37d2e6"
					stroke-width="2.5"
				/>
				<circle
					cx={p.x}
					cy={p.y}
					r={p.r + 13}
					fill="none"
					stroke="#37d2e6"
					stroke-width="1"
					opacity="0.35"
				/>
			{:else if status !== 'none'}
				<circle
					cx={p.x}
					cy={p.y}
					r={p.r + 6}
					fill="none"
					stroke={status === 'done' ? '#2ee6a0' : '#e6b854'}
					stroke-width="2.5"
					opacity="0.85"
				/>
			{/if}
			<image
				href={planetSrc(p.region.id)}
				x={p.x - p.r * 1.05}
				y={p.y - p.r * 1.05}
				width={p.r * 2.1}
				height={p.r * 2.1}
				preserveAspectRatio="xMidYMid meet"
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
