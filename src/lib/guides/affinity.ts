import type { GuideContent } from './types';

/**
 * Content for the Affinity long-form guide. Prose with inline markup (the two
 * concept cards, the worked example) stays in +page.svelte as snippets;
 * everything without inline markup lives here.
 */
export const AFFINITY_GUIDE: GuideContent = {
	tagline:
		'Where you farm matters less than what you carry — the sharing rules decide where the XP goes.',
	seoTitle: 'Affinity Farming Guide — Fastest XP Locations | wforacle',
	breadcrumb: 'Affinity Farming Guide',
	conceptTitle: 'The sharing rules',
	conceptIntro:
		'Every kill routes its affinity by fixed rules, so your loadout is the farming decision that matters most.',
	conceptWarning:
		'Bring only the gear you’re leveling plus one strong fallback. Letting the squad kill levels your weapons faster than killing with them — and fewer equipped weapons means each one levels faster.',
	multipliers: [
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
			effect: 'Occasional official events; multiply with a booster for ×4 on everything.',
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
	],
	myths: [
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
	],
	mentions: [
		{
			lead: 'Solstice Square (Höllvania)',
			text: 'the “better Hydron” added in Update 38.5: a three-round Stage Defense with a static target and a tight kill-box. Needs The Hex quest and Hex rank 4.',
		},
		{
			lead: 'Ascension — Brutus (Uranus)',
			text: 'the highest Eximus prevalence of any node; a full-squad Steel Path run with Fosfors can max a weapon while also paying Riven Slivers and arcanes.',
		},
		{
			lead: 'Adaro (Sedna) stealth',
			text: 'the top solo method: Equinox or Ivara sleep-kills ride the stealth chain at +500%, with melee finishers earning double again.',
		},
		{
			lead: 'The Circuit (Duviri)',
			text: 'your own frames and weapons appear in the rotating offerings and level normally; a frame goes 0→30 in roughly six stages, no Defense queue required.',
		},
	],
	sources: [
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
	],
};
