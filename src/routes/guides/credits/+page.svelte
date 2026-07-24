<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { breadcrumbLd, guideLd } from '$lib/seo/jsonld';
	import { guideDescription } from '$lib/seo/meta';
	import { SITE_URL } from '$lib/seo/config';
	import type { Recommendation } from '$lib/model/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const PHASE_LABEL = {
		early: '⚡ Early game',
		mid: '🌗 Mid game',
		late: '💀 Late / endgame',
	} as const;
	const PHASE_TAG = {
		early: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
		mid: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		late: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
	} as const;

	let early = $derived(
		data.resource.recommendations.filter((r) => r.phase === 'early'),
	);
	let mid = $derived(
		data.resource.recommendations.filter((r) => r.phase === 'mid'),
	);
	let late = $derived(
		data.resource.recommendations.filter((r) => r.phase === 'late'),
	);

	const canonical = `${SITE_URL}/guides/credits`;

	const MULTIPLIERS = [
		{
			name: 'Credit Booster',
			channel: 'Everything',
			effect:
				'×2 on rewards, caches and drops. 40p/3d · 80p/7d · 200p/30d; also from Daily Tribute and occasionally Baro Ki’Teer.',
		},
		{
			name: 'Daily First Win Bonus',
			channel: 'Rewards only',
			effect:
				'×2 on the first mission completed after 00:00 UTC — silently consumed by cache/drop missions.',
		},
		{
			name: "Chroma's Effigy",
			channel: 'Drops only',
			effect:
				'×2 on credit pickups within 10 m of the sentry — cast it before collecting.',
		},
		{
			name: 'MR30 Credit Blessing',
			channel: 'Drops & caches',
			effect:
				'+25% for 3 h, free from any MR30 player in a relay; additive with the booster.',
		},
		{
			name: 'Prosperous Retriever',
			channel: 'Drops only',
			effect:
				"18% chance to double each pickup (beast companions) — a mod slot you control, unlike Smeeta's random Charm procs.",
		},
		{
			name: 'Double-credit weekends',
			channel: 'Everything',
			effect: 'Occasional official events; multiply with a booster for ×4.',
		},
	];

	const MYTHS = [
		{
			claim: 'Secura Lecta is a credit printer',
			truth:
				'Dead since Hotfix 42.0.10 (May 2026): the multi-trigger exploit was fixed. The weapon keeps only a modest MR-scaled bonus on its own kills.',
		},
		{
			claim: "Chroma's Effigy credit doubling was removed",
			truth:
				'False — the patch history is clean through 2026. The rumor conflates the Secura Lecta nerf; only a bug with Techrot cache credits is open.',
		},
		{
			claim: 'Dark Sectors boost credits by +35%',
			truth:
				'Those percentages are the resource and affinity bonuses. The credit benefit is a flat ~20,000 added to the mission reward.',
		},
		{
			claim: 'Farm credits on Gian Point',
			truth:
				'Removed in Update 29.10 (2021). Veil Proxima skirmishes still pay 80–150k per mission.',
		},
		{
			claim: 'Sell Ayatan sculptures for credits',
			truth:
				'Their credit sell value is negligible — Ayatans are Endo (or platinum), not a credit source.',
		},
	];

	const SOURCES = [
		{
			label: 'Credits — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Credits',
		},
		{
			label: 'Dark Sector — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Dark_Sector',
		},
		{
			label: 'Daily Tribute — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Daily_Tribute',
		},
		{
			label: 'The Index — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/The_Index',
		},
		{
			label: 'Laomedeia — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Laomedeia',
		},
		{
			label: 'Legacyte Harvest — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Legacyte_Harvest',
		},
		{
			label: 'Profit-Taker Orb — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Profit-Taker_Orb',
		},
		{
			label: 'Hotfix 42.0.10 (Secura Lecta fix)',
			url: 'https://www.warframe.com/en/patch-notes/pc/42-0-10',
		},
		{
			label: 'Update 27.4 (Railjack credit rewards)',
			url: 'https://www.warframe.com/en/patch-notes/pc/27-4-0',
		},
	];
</script>

{#snippet recCard(rec: Recommendation)}
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<span
			class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[
				rec.phase
			]}"
		>
			{PHASE_LABEL[rec.phase]}
		</span>
		<h3 class="mt-2 text-base font-semibold text-slate-100">{rec.nodeLabel}</h3>
		<p class="mt-1 text-sm text-wf-muted">{rec.note}</p>
		<p class="mt-2 text-xs text-wf-muted">{rec.boosterNote}</p>
		<div class="mt-3 flex items-center justify-between text-xs text-wf-muted">
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
{/snippet}

<SeoHead
	title="Credits Farming Guide — Best Locations | wforacle"
	description={guideDescription(data.resource)}
	path="/guides/credits"
	type="article"
	jsonLd={[
		breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: 'Credits Farming Guide', url: canonical },
		]),
		guideLd(data.resource, canonical),
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
			src={asset('/resources/credits.webp')}
			alt={data.resource.name}
			class="h-12 w-12 rounded"
		/>
		<div>
			<h1 class="text-2xl font-bold">{data.resource.name} farming guide</h1>
			<p class="mt-1 text-sm text-wf-muted">
				Every credit source pays through one of two channels — and every
				multiplier only works on one of them.
			</p>
		</div>
	</header>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The two-channel rule</h2>
		<p class="mb-4 text-sm text-wf-muted">
			Every credit source pays through one of two channels, and every multiplier
			attaches to exactly one of them — which explains every “why didn’t my
			booster work?” moment.
		</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-emerald-300">
					End-of-mission rewards
				</h3>
				<p class="mt-1 text-xs text-wf-muted">
					Dark Sectors · Arbitrations · Sorties · Railjack
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					Doubled by the <strong>Daily First Win Bonus</strong> and by a
					<strong>Credit Booster</strong> — stack both for ×4.
				</p>
			</div>
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-amber-300">
					Pickups &amp; caches
				</h3>
				<p class="mt-1 text-xs text-wf-muted">
					The Index · Laomedeia · Techrot Safes · Profit-Taker
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					Doubled by a <strong>Credit Booster</strong>,
					<strong>Chroma’s Effigy</strong>
					(drops), the <strong>MR30 Blessing</strong> and
					<strong>Prosperous Retriever</strong> — never by the First Win Bonus.
				</p>
			</div>
		</div>
		<p class="mt-3 text-xs text-amber-300/90">
			⚠ Running a cache mission first each day wastes the First Win Bonus — it
			is consumed with no effect. Spend it on an Arbitration or a Dark Sector
			first.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The progression path</h2>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each early as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
			{#each mid as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
			{#each late as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
		</div>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Stacking multipliers</h2>
		<div class="overflow-x-auto rounded-xl border border-wf-edge">
			<table class="w-full text-left text-sm">
				<thead class="bg-wf-panel text-xs text-wf-muted">
					<tr>
						<th class="px-3 py-2 font-medium">Multiplier</th>
						<th class="px-3 py-2 font-medium">Applies to</th>
						<th class="px-3 py-2 font-medium">Effect</th>
					</tr>
				</thead>
				<tbody>
					{#each MULTIPLIERS as m (m.name)}
						<tr class="border-t border-wf-edge">
							<td class="px-3 py-2 font-medium text-slate-100">{m.name}</td>
							<td class="px-3 py-2 text-wf-muted">{m.channel}</td>
							<td class="px-3 py-2 text-wf-muted">{m.effect}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-wf-muted">
			Worked example — Profit-Taker’s guaranteed drop: 125,000 base → 250,000
			with Effigy → <strong class="text-slate-100">500,000 per kill</strong> with
			a Credit Booster on top. The First Win Bonus never touches drops, so spend it
			elsewhere.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Outdated advice</h2>
		<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
			<ul class="space-y-3 text-sm">
				{#each MYTHS as m (m.claim)}
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
		<p class="mb-2 text-sm text-wf-muted">
			<strong class="text-slate-100">Railjack</strong> — Veil Proxima skirmishes pay
			80–150k per mission (per the Update 27.4 reward tables) while also earning Endo,
			intrinsics and relics: the relaxed farm-while-doing-other-things pick.
		</p>
		<p class="mb-2 text-sm text-wf-muted">
			<strong class="text-slate-100">Sorties</strong> — a fixed 100,000 per day (20k
			+ 30k + 50k) for ~20 minutes of endgame missions.
		</p>
		<p class="text-sm text-wf-muted">
			<strong class="text-slate-100">Zariman bounties</strong> — up to ~60,000 as
			end-of-mission rewards if you’re already grinding Holdfasts standing.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">Sources</h2>
		<ul class="list-disc pl-5 text-sm">
			{#each SOURCES as s (s.url)}
				<li>
					<a
						href={s.url}
						target="_blank"
						rel="noreferrer"
						class="text-wf-cyan hover:text-wf-cyan/80"
					>
						{s.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
