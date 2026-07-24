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

	const canonical = `${SITE_URL}/guides/affinity`;

	const MULTIPLIERS = [
		{
			name: 'Affinity Booster',
			effect:
				'×2 on all affinity — kills, orbs and mission rewards — plus combat-earned Focus and syndicate standing. 40p/3d · 80p/7d · 200p/30d; also from Daily Tribute milestones.',
		},
		{
			name: 'MR30 Affinity Blessing',
			effect:
				'+25% for 3 h, free from any MR30 player in a relay; stacks multiplicatively with the booster and persists into missions.',
		},
		{
			name: 'Smeeta Kavat Charm',
			effect:
				'×3 affinity for 120 s on a lucky proc. Post-rework Charm is affinity-only — the old resource-doubling now lives in the separate Loyal Retriever mod.',
		},
		{
			name: 'Double Affinity weekends',
			effect:
				'Occasional official events; multiply with a booster for ×4 on everything.',
		},
		{
			name: 'Stealth-kill chain',
			effect:
				'+100% per unalerted kill within 30 s of the last, stacking to +500%; melee stealth kills earn double the bonus. The engine behind Adaro sleep farms.',
		},
		{
			name: 'Dark Sector nodes',
			effect:
				'Flat node bonuses on top of everything: Sechura +30% affinity (+25% more on rifles), Akkad +23% (+18% melee), Seimeni/Gabii +26% (+21% melee).',
		},
	];

	const MYTHS = [
		{
			claim: 'Leave Defense at wave 5',
			truth:
				'Outdated since Update 38.5 (March 2025): Defense rewards and extraction now cycle every 3 waves. Staying to 5 just wastes two waves.',
		},
		{
			claim: 'Go to Draco, Ceres',
			truth:
				'Dead for a decade. Specters of the Rail (2016) changed Draco from Interception to Survival, killing the farm — the node still exists, the meta does not.',
		},
		{
			claim: 'Steel Path gives +100% affinity',
			truth:
				'False — its +100% bonuses are resource and mod drop chance. Steel Path farms are good because enemies are ~100 levels higher, and affinity scales with enemy level.',
		},
		{
			claim: 'Berehynia Interception is the meta',
			truth:
				'Dead by meta shift, not a nerf: nothing was changed, but Sanctuary Onslaught and Steel Path Survival simply out-spawn it. Strictly worse in 2026.',
		},
		{
			claim: 'Smeeta doubles your loot and XP',
			truth:
				'Reworked: Charm is now ×3 affinity for 120 s and nothing else — the resource-doubling moved to the Loyal Retriever beast mod.',
		},
		{
			claim: 'The best affinity farm is the best Focus farm',
			truth:
				'Conflation: Focus lenses convert affinity only from max-rank gear, so leveling gear earns zero Focus. Level in SO; farm Focus with lensed gear in ESO or via Zariman Thrax kills.',
		},
	];

	const SOURCES = [
		{
			label: 'Affinity — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Affinity',
		},
		{
			label: 'Sanctuary Onslaught — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Sanctuary_Onslaught',
		},
		{
			label: 'Helene — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Helene',
		},
		{
			label: 'Hydron — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Hydron',
		},
		{
			label: 'Elara — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Elara',
		},
		{
			label: 'The Steel Path — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/The_Steel_Path',
		},
		{
			label: 'Void Cascade — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Void_Cascade',
		},
		{
			label: 'Charm — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Charm',
		},
		{
			label: "True Master's Font — Warframe Wiki",
			url: 'https://wiki.warframe.com/w/True_Master%27s_Font',
		},
		{
			label: 'Dark Sector — Warframe Wiki',
			url: 'https://wiki.warframe.com/w/Dark_Sector',
		},
		{
			label: 'Update 38.5 (3-wave Defense rotations)',
			url: 'https://www.warframe.com/en/patch-notes/pc/38-5-0',
		},
		{
			label: 'Update 43.0 (companion affinity sharing)',
			url: 'https://www.warframe.com/en/patch-notes/switch/43-0-0',
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
	title="Affinity Farming Guide — Fastest XP Locations | wforacle"
	description={guideDescription(data.resource)}
	path="/guides/affinity"
	type="article"
	jsonLd={[
		breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: 'Affinity Farming Guide', url: canonical },
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
			src={asset('/resources/affinity.webp')}
			alt={data.resource.name}
			class="h-12 w-12 rounded"
		/>
		<div>
			<h1 class="text-2xl font-bold">{data.resource.name} farming guide</h1>
			<p class="mt-1 text-sm text-wf-muted">
				Where you farm matters less than what you carry — the sharing rules
				decide where the XP goes.
			</p>
		</div>
	</header>

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The sharing rules</h2>
		<p class="mb-4 text-sm text-wf-muted">
			Every kill routes its affinity by fixed rules, so your loadout is the
			farming decision that matters most.
		</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-emerald-300">Your kills</h3>
				<p class="mt-1 text-xs text-wf-muted">
					Ability kills · weapon kills · companion assists
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					An ability kill sends <strong>100% to your Warframe</strong>; a weapon
					kill splits <strong>50/50</strong> between frame and killing weapon. Since
					Update 43.0, damaging an enemy that your companion finishes (or vice versa)
					grants both of you full kill affinity.
				</p>
			</div>
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-amber-300">Squad kills</h3>
				<p class="mt-1 text-xs text-wf-muted">
					Anything killed within 50 m of you (250 m in open worlds, no limit in
					Railjack)
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					<strong
						>25% to your Warframe, 75% split evenly across your equipped weapons</strong
					> — carry one weapon and it takes the full 75%; carry three and each gets
					25%.
				</p>
			</div>
		</div>
		<p class="mt-3 text-xs text-amber-300/90">
			⚠ Bring only the gear you’re leveling plus one strong fallback. Letting
			the squad kill levels your weapons faster than killing with them — and
			fewer equipped weapons means each one levels faster.
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
						<th class="px-3 py-2 font-medium">Effect</th>
					</tr>
				</thead>
				<tbody>
					{#each MULTIPLIERS as m (m.name)}
						<tr class="border-t border-wf-edge">
							<td class="px-3 py-2 font-medium text-slate-100">{m.name}</td>
							<td class="px-3 py-2 text-wf-muted">{m.effect}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-wf-muted">
			Worked example — Affinity Booster (×2) × Double Affinity weekend (×2) ×
			MR30 Blessing (×1.25) = <strong class="text-slate-100"
				>×5 on every kill</strong
			>, all multiplicative. A Charm proc during that window triples it again
			for two minutes.
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
			<strong class="text-slate-100">Solstice Square (Höllvania)</strong> — the “better
			Hydron” added in Update 38.5: a three-round Stage Defense with a static target
			and a tight kill-box. Needs The Hex quest and Hex rank 4.
		</p>
		<p class="mb-2 text-sm text-wf-muted">
			<strong class="text-slate-100">Ascension — Brutus (Uranus)</strong> — the highest
			Eximus prevalence of any node; a full-squad Steel Path run with Fosfors can
			max a weapon while also paying Riven Slivers and arcanes.
		</p>
		<p class="mb-2 text-sm text-wf-muted">
			<strong class="text-slate-100">Adaro (Sedna) stealth</strong> — the top solo
			method: Equinox or Ivara sleep-kills ride the stealth chain at +500%, with melee
			finishers earning double again.
		</p>
		<p class="text-sm text-wf-muted">
			<strong class="text-slate-100">The Circuit (Duviri)</strong> — your own frames
			and weapons appear in the rotating offerings and level normally; a frame goes
			0→30 in roughly six stages, no Defense queue required.
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
