import type { GuideContent } from './types';

/**
 * Content for the Credits long-form guide. Prose with inline markup (the two
 * concept cards, the worked example) stays in +page.svelte as snippets;
 * everything without inline markup lives here.
 */
export const CREDITS_GUIDE: GuideContent = {
	tagline:
		'Every credit source pays through one of two channels — and every multiplier only works on one of them.',
	seoTitle: 'Credits Farming Guide — Best Locations | wforacle',
	breadcrumb: 'Credits Farming Guide',
	conceptTitle: 'The two-channel rule',
	conceptIntro:
		'Every credit source pays through one of two channels, and every multiplier attaches to exactly one of them — which explains every “why didn’t my booster work?” moment.',
	conceptWarning:
		'Running a cache mission first each day wastes the First Win Bonus — it is consumed with no effect. Spend it on an Arbitration or a Dark Sector first.',
	multipliers: [
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
			effect: '×2 on credit pickups within 10 m of the sentry — cast it before collecting.',
		},
		{
			name: 'MR30 Credit Blessing',
			channel: 'Drops & caches',
			effect: '+25% for 3 h, free from any MR30 player in a relay; additive with the booster.',
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
	],
	myths: [
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
	],
	mentions: [
		{
			lead: 'Railjack',
			text: 'Veil Proxima skirmishes pay 80–150k per mission (per the Update 27.4 reward tables) while also earning Endo, intrinsics and relics: the relaxed farm-while-doing-other-things pick.',
		},
		{
			lead: 'Sorties',
			text: 'a fixed 100,000 per day (20k + 30k + 50k) for ~20 minutes of endgame missions.',
		},
		{
			lead: 'Zariman bounties',
			text: 'up to ~60,000 as end-of-mission rewards if you’re already grinding Holdfasts standing.',
		},
	],
	sources: [
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
	],
};
