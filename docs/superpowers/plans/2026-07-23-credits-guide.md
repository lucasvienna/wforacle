# Credits Farming Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Credits farming guide: six curated recommendation cards in the data pipeline plus a bespoke, data-driven `/guides/credits` page with a two-channel multiplier explainer, stacking table, and myth-bust panel.

**Architecture:** Credits becomes a normal `RESOURCES` entry in `scripts/data/farming.ts` (cards, planet mapping, hub/SEO/sitemap all derive from the dataset). A static route `src/routes/guides/credits/` overrides the dynamic `[resource]` route for the page itself; `[resource]`'s `entries()` excludes `credits` to avoid a duplicate prerender. No schema changes.

**Tech Stack:** SvelteKit (Svelte 5 runes + snippets), TypeScript, Tailwind (project `wf-*` tokens), Vitest + @testing-library/svelte, Playwright, tsx data pipeline.

**Spec:** `docs/superpowers/specs/2026-07-23-credits-guide-design.md`

## Global Constraints

- Branch: `feat/credits-guide` (already created; spec committed there).
- Every card `source` must be a `wiki.warframe.com` URL — `farming.test.ts` enforces this. Patch-note links go only in the bespoke page's source list.
- Every card: `lastVerified: '2026-07-23'`, `boostersApply: true`, and a non-empty `boosterNote` (the canned copy talks resource boosters — always wrong for credits).
- Factual guardrails (wiki-verified 2026-07-23): the Daily First Win Bonus applies **only** to end-of-mission rewards, never to caches/drops (Index, Laomedeia, Techrot, Profit-Taker), and is silently consumed by them. Profit-Taker fully stacked is **500k/kill** (Effigy ×2 · booster ×2) — never write "1M first kill of the day". Dark Sector credit bonus is **flat** (~20k), not a percentage.
- Svelte files: use the Svelte MCP autofixer (svelte-file-editor flow) before committing `.svelte` changes.
- Before the PR: `pnpm format` (not just `format:check`) + `pnpm lint`, commit the result.
- Indentation is tabs (oxfmt); wrap prose strings roughly at the file's existing column width.

---

### Task 1: Curated Credits data (RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS)

**Files:**
- Modify: `scripts/data/farming.ts` (RESOURCES list ~line 37, PLANET_RESOURCES `ceres`/`neptune`/`venus` entries ~lines 51–80, RECOMMENDATIONS record)
- Test: `scripts/data/farming.test.ts`

**Interfaces:**
- Consumes: `Recommendation` from `src/lib/model/types.ts`, `slugify` from `./parse`, `recRegionId` from `./assemble` (all existing).
- Produces: `RECOMMENDATIONS['credits']` — six `Recommendation` objects (3 early, 3 late) consumed by the build pipeline in Task 2; resource id `'credits'` referenced by Tasks 3–6.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('curated farming data', …)` block of `scripts/data/farming.test.ts`, after the Cryotic test:

```ts
	it('includes a curated Credits farming guide', () => {
		const id = slugify('Credits');
		expect(ids.has(id)).toBe(true);
		// Credits are mapped (like Cryotic) onto their signature farm planets:
		// Ceres (Seimeni/Gabii), Neptune (Index, Laomedeia), Venus (Profit-Taker).
		expect(PLANET_RESOURCES.ceres).toContain(id);
		expect(PLANET_RESOURCES.neptune).toContain(id);
		expect(PLANET_RESOURCES.venus).toContain(id);
		const recs = RECOMMENDATIONS[id];
		expect(recs).toHaveLength(6);
		expect(recs.filter((x) => x.phase === 'early')).toHaveLength(3);
		// Credit boosters ≠ resource boosters: every rec must override the
		// canned booster copy.
		for (const x of recs) expect(x.boosterNote).toBeTruthy();
		// 'Anywhere' (First Win habit) and 'Höllvania' (not a chart region)
		// must not resolve to a region, or a "best farm here" badge lands on
		// the wrong panel.
		const firstWin = recs.find((x) => /first win/i.test(x.nodeLabel));
		expect(recRegionId(firstWin!.nodeLabel)).toBeUndefined();
		const techrot = recs.find((x) => /legacyte/i.test(x.nodeLabel));
		expect(techrot?.phase).toBe('late');
		expect(recRegionId(techrot!.nodeLabel)).toBeUndefined();
		// The guide's core rule: cache-paying farms must warn that the Daily
		// First Win Bonus doesn't apply to them.
		const index = recs.find((x) => /index/i.test(x.nodeLabel));
		expect(index?.boosterNote).toMatch(/first win/i);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run scripts/data/farming.test.ts`
Expected: FAIL — `expect(ids.has(id)).toBe(true)` receives `false` (no Credits entry yet).

- [ ] **Step 3: Implement the data**

In `scripts/data/farming.ts`:

(a) Append to `RESOURCES` (after the Entrati Lanthorn line):

```ts
	{ id: slugify('Credits'), name: 'Credits' },
```

(b) Append `R['Credits']` to the `ceres`, `neptune`, and `venus` arrays in `PLANET_RESOURCES`, with a comment above the `ceres` entry:

```ts
	// Credits are a currency, not a drop-pool resource, but (like Cryotic)
	// they're mapped onto the planets their signature farms live on: Ceres
	// (Seimeni/Gabii Dark Sectors), Neptune (The Index, Laomedeia) and Venus
	// (Profit-Taker via Orb Vallis).
```

(c) Add to `RECOMMENDATIONS` (after the Cryotic entry), preceded by this comment:

```ts
	// Credits pay through two channels, and every multiplier attaches to
	// exactly one: end-of-mission REWARDS (doubled by the Daily First Win
	// Bonus and Credit Boosters) vs in-mission DROPS/CACHES (doubled by
	// Credit Boosters, Chroma's Effigy, the MR30 Blessing and Retriever mods
	// — never by First Win, which a cache mission silently consumes). All
	// verified against wiki.warframe.com 2026-07-23; see the credits spec.
	[R['Credits']]: [
		{
			phase: 'early',
			nodeLabel: 'Ceres — Seimeni / Gabii (Dark Sector)',
			boostersApply: true,
			boosterNote:
				'Boosters help: this is an end-of-mission reward, so a Credit Booster doubles it and the Daily First Win Bonus doubles it again — resource boosters do nothing for credits.',
			note: 'Dark Sectors pay a flat credit bonus on completion — not a percentage: Seimeni (Defense) and Gabii (Survival) add ~20,000 on top of the base reward for ~22,400 per run. Run five waves (or five minutes) and re-queue; staying longer never repeats the bonus. Same payout as the famous Akkad on Eris, four planets closer to the start of the chart.',
			source: 'https://wiki.warframe.com/w/Dark_Sector',
			lastVerified: '2026-07-23',
		},
		{
			phase: 'early',
			nodeLabel: 'Anywhere — Daily First Win Bonus',
			boostersApply: true,
			boosterNote:
				'Boosters help: the daily double multiplies with a Credit Booster — a 50,000-credit Arbitration pays 200,000 with both running.',
			note: 'The first mission you complete after 00:00 UTC pays double end-of-mission credits. Spend it on your biggest flat payout — an Arbitration (50,000 → 100,000) or a Dark Sector run — and never on the Index, Laomedeia or open-world bounties: those pay through credit caches, which the bonus skips entirely while still being used up.',
			source: 'https://wiki.warframe.com/w/Daily_Tribute',
			lastVerified: '2026-07-23',
		},
		{
			phase: 'early',
			nodeLabel: 'Neptune — The Index (High Risk)',
			boostersApply: true,
			boosterNote:
				'Boosters help, with a catch: a Credit Booster only doubles the first round of a match — one round and re-queue beats marathons — and the Daily First Win Bonus never applies to Index winnings.',
			note: 'Wager 50,000, reach 100 points, collect 250,000 — and every extra round pays another 250,000 with no new stake. Bring a frame that ignores Financial Stress (Rhino or Nezha early, Revenant later), bank around 15 points at a time and keep a small point buffer so the enemy team can never score. Only the host needs the node unlocked, so newer players can be taxied in.',
			source: 'https://wiki.warframe.com/w/The_Index',
			lastVerified: '2026-07-23',
		},
		{
			phase: 'late',
			nodeLabel: 'Neptune — Laomedeia (Disruption)',
			boostersApply: true,
			boosterNote:
				'Boosters help: a Credit Booster doubles every cache — silently, the reward screen never shows it — while the Daily First Win Bonus does not apply here.',
			note: 'A Disruption whose reward table is mostly credit caches: defend all four conduits and rounds 1–4 pay 30k / 30k / 50k / 50k — 160,000 in under twenty minutes, then 50,000 every round for as long as you stay. No wager to front, and normal mission rules mean squads, companions and loot frames all work.',
			source: 'https://wiki.warframe.com/w/Laomedeia',
			lastVerified: '2026-07-23',
		},
		{
			phase: 'late',
			nodeLabel: 'Höllvania — Legacyte Harvest (Techrot Safes)',
			boostersApply: true,
			boosterNote:
				"Boosters help — all of them: safe credits are an in-mission drop, so a Credit Booster, Chroma's Effigy, the MR30 Credit Blessing and Prosperous Retriever all stack on top of each other.",
			note: "Every Höllvania mission except Exterminate can spawn one Techrot Safe holding a 100,000-credit drop plus an Arcane. Spam short Legacyte Harvest runs (requires The Hex quest), and take SHELL CRACKER bounties or bring Loot Detector so finding the safe doesn't eat the run time. The current top-tier credit farm, at a fraction of Profit-Taker's gear bar.",
			source: 'https://wiki.warframe.com/w/Legacyte_Harvest',
			lastVerified: '2026-07-23',
		},
		{
			phase: 'late',
			nodeLabel: 'Venus — Profit-Taker Orb (Heist Phase 4)',
			boostersApply: true,
			boosterNote:
				"Boosters help — the stacking showcase: the credits arrive as drops, so Chroma's Effigy doubles them and a Credit Booster doubles them again for 500,000 per kill — but the Daily First Win Bonus skips drops entirely.",
			note: 'Killing the Profit-Taker drops a guaranteed 125,000 credits (5 × 25,000 pickups) plus a Crisma Toroid. Requires Old Mate rank with Solaris United and an arch-gun fitted with a Gravimag; once geared, kills take two to eight minutes. Cast Effigy near the corpse before picking the credits up.',
			source: 'https://wiki.warframe.com/w/Profit-Taker_Orb',
			lastVerified: '2026-07-23',
		},
	],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run scripts/data/farming.test.ts`
Expected: PASS (all suites — the generic per-resource conventions test also covers the new entries).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/farming.ts scripts/data/farming.test.ts
git commit -m "feat(data): add curated Credits farming recommendations"
```

---

### Task 2: Dataset rebuild + Credits icon

**Files:**
- Modify: `scripts/fetch-resource-images.sh`
- Create: `static/resources/credits.webp`
- Regenerate: `static/data/dataset.json` (via `pnpm data:build`)

**Interfaces:**
- Consumes: Task 1's `RECOMMENDATIONS['credits']` (picked up by `scripts/build-data.ts`).
- Produces: `dataset.json` `data.resources[]` entry `{ id: 'credits', regionIds: ['ceres','neptune','venus'], recommendations: […6] }` consumed by Tasks 3–6; icon at `/resources/credits.webp` (the page hardcodes this path — the dataset `image` field may stay absent, that's fine).

- [ ] **Step 1: Find a working icon URL**

Run in order until one returns `200`:

```bash
curl -fsIL -o /dev/null -w '%{http_code}\n' https://cdn.warframestat.us/img/Credits.png
curl -fsIL -o /dev/null -w '%{http_code}\n' https://cdn.warframestat.us/img/credits.png
curl -fsIL -o /dev/null -w '%{http_code}\n' -A wforacle https://wiki.warframe.com/images/CreditsLarge.png
```

Expected: at least one `200`. If only the wiki URL works, use a one-off `curl | convert` with the same flags as the script's `dl` helper instead of adding a CDN line.

- [ ] **Step 2: Add the icon to the fetch script and download it**

Append to `scripts/fetch-resource-images.sh` (adjust the source filename to the URL that worked in Step 1):

```bash
dl credits.webp Credits.png
```

Then run only the new download (don't re-fetch all 28 — replicate the helper inline):

```bash
cd /home/vienna/Workspace/github.com/lucasvienna/wforacle
T=$(mktemp -d)
curl -fsSL -A wforacle -o "$T/credits.webp" https://cdn.warframestat.us/img/Credits.png
convert "$T/credits.webp" -resize 64x64 -strip static/resources/credits.webp
rm -rf "$T"
```

Expected: `static/resources/credits.webp` exists, ~64×64. Verify: `file static/resources/credits.webp` → `RIFF … Web/P image`.

- [ ] **Step 3: Rebuild the dataset**

Run: `pnpm data:build`
Expected: exits 0 (needs network for @wfcd/wiki fetches). Verify the new entry:

```bash
jq '.data.resources[] | select(.id=="credits") | {regionIds, n: (.recommendations|length)}' static/data/dataset.json
```

Expected: `{ "regionIds": ["ceres", "neptune", "venus"], "n": 6 }` (regionIds order may differ).

- [ ] **Step 4: Run the full unit suite**

Run: `pnpm test:unit --run`
Expected: PASS. (Dataset-shape tests pick up the new resource; nothing asserts exhaustive counts, but if a fixture-based test fails, fix the fixture expectation — not the data.)

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-resource-images.sh static/resources/credits.webp static/data/dataset.json
git commit -m "feat(data): build Credits into dataset + fetch icon"
```

---

### Task 3: Exclude `credits` from the dynamic guide route's prerender entries

**Files:**
- Modify: `src/routes/guides/[resource]/+page.ts:39-44` (`entries()`)
- Test: `src/routes/guides/[resource]/entries.test.ts` (create)

**Interfaces:**
- Consumes: `entries` export from `./+page` (existing), Task 2's regenerated dataset.
- Produces: guarantee that `/guides/credits` is prerendered only by the static route added in Task 4.

- [ ] **Step 1: Write the failing test**

Create `src/routes/guides/[resource]/entries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { entries } from './+page';

describe('guide prerender entries', () => {
	it('lists curated resources but not credits (bespoke static route)', async () => {
		const list = await entries();
		expect(list).toContainEqual({ resource: 'cryotic' });
		// Argon Crystal has no panel link (regionIds: []) — entries() is what
		// keeps it prerendered.
		expect(list).toContainEqual({ resource: 'argoncrystal' });
		// credits is served by src/routes/guides/credits — listing it here
		// would prerender the same path twice.
		expect(list).not.toContainEqual({ resource: 'credits' });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/routes/guides/\[resource\]/entries.test.ts`
Expected: FAIL — the list currently contains `{ resource: 'credits' }` (it has recommendations).

- [ ] **Step 3: Implement the exclusion**

In `src/routes/guides/[resource]/+page.ts`, change the return of `entries()`:

```ts
	return raw.data.resources
		// credits has curated recommendations but its page is the bespoke
		// static route at src/routes/guides/credits — listing it here would
		// prerender /guides/credits from both routes.
		.filter((r) => r.recommendations.length > 0 && r.id !== 'credits')
		.map((r) => ({ resource: r.id }));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit --run src/routes/guides/\[resource\]/entries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/guides/[resource]/+page.ts" "src/routes/guides/[resource]/entries.test.ts"
git commit -m "feat(guides): exclude credits from dynamic guide prerender entries"
```

---

### Task 4: Bespoke route skeleton — load, SEO, hero, recommendation cards

**Files:**
- Create: `src/routes/guides/credits/+page.ts`
- Create: `src/routes/guides/credits/+page.svelte`
- Test: `src/routes/guides/credits/page.svelte.test.ts` (create)

**Interfaces:**
- Consumes: `loadDataset(fetch)` from `$lib/data/dataset`; `SeoHead`, `breadcrumbLd`, `guideLd`, `guideDescription`, `SITE_URL` (same imports as `[resource]/+page.svelte`); `Recommendation` type.
- Produces: `PageData = { resource: Resource }`; the page structure Task 5 extends (section order: hero → `<!-- two-channel -->` placeholder position → cards → Task 5 sections). Test fixture `fixtureResource` reused by Task 5's tests.

- [ ] **Step 1: Write the failing test**

Create `src/routes/guides/credits/page.svelte.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { Resource } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import Page from './+page.svelte';
import type { PageData } from './$types';

export const fixtureResource: Resource = {
	id: 'credits',
	name: 'Credits',
	regionIds: ['ceres', 'neptune', 'venus'],
	recommendations: [
		{
			phase: 'early',
			nodeLabel: 'Ceres — Seimeni / Gabii (Dark Sector)',
			boostersApply: true,
			boosterNote: 'Credit Booster and First Win both apply.',
			note: 'Flat ~20,000 bonus per run.',
			source: 'https://wiki.warframe.com/w/Dark_Sector',
			lastVerified: '2026-07-23',
			regionId: 'ceres',
		},
		{
			phase: 'late',
			nodeLabel: 'Venus — Profit-Taker Orb (Heist Phase 4)',
			boostersApply: true,
			boosterNote: 'Effigy and booster double the drops.',
			note: 'Guaranteed 125,000 credit drop.',
			source: 'https://wiki.warframe.com/w/Profit-Taker_Orb',
			lastVerified: '2026-07-23',
			regionId: 'venus',
		},
	],
};

const data = { resource: fixtureResource } as PageData;

describe('bespoke credits guide page', () => {
	it('sets the guide title, canonical and JSON-LD', () => {
		render(Page, { data });
		expect(document.title).toBe('Credits Farming Guide — Best Locations | wforacle');
		const canonical = document.head.querySelector('link[rel="canonical"]');
		expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/guides/credits`);
		expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
	});

	it('renders every recommendation card with its booster note and source', () => {
		render(Page, { data });
		expect(screen.getByText('Ceres — Seimeni / Gabii (Dark Sector)')).toBeInTheDocument();
		expect(screen.getByText('Venus — Profit-Taker Orb (Heist Phase 4)')).toBeInTheDocument();
		expect(screen.getByText(/Effigy and booster double the drops/)).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /source/i })).toHaveLength(2);
	});

	it('groups early cards before late cards', () => {
		render(Page, { data });
		const headings = screen.getAllByRole('heading', { level: 3 });
		const labels = headings.map((h) => h.textContent);
		expect(labels.indexOf('Ceres — Seimeni / Gabii (Dark Sector)')).toBeLessThan(
			labels.indexOf('Venus — Profit-Taker Orb (Heist Phase 4)'),
		);
	});

	it('gives the credits icon a descriptive alt', () => {
		render(Page, { data });
		expect(screen.getByRole('img', { name: 'Credits' })).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/routes/guides/credits/page.svelte.test.ts`
Expected: FAIL — `./+page.svelte` does not exist.

- [ ] **Step 3: Create `+page.ts`**

```ts
import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/dataset';
import type { PageLoad } from './$types';

export const prerender = true;

// Static route: overrides the dynamic [resource] guide page for credits only.
// The dataset entry still drives cards, hub listing, sitemap and panel links;
// [resource]'s entries() excludes 'credits' so this path prerenders once.
export const load: PageLoad = async ({ fetch }) => {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === 'credits');
	if (!resource) throw error(404, 'Credits guide data missing from dataset');
	return { resource };
};
```

- [ ] **Step 4: Create `+page.svelte` (skeleton: SEO, hero, cards)**

```svelte
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
		late: '💀 Late / endgame',
	} as const;
	const PHASE_TAG = {
		early: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
		late: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
	} as const;

	let early = $derived(data.resource.recommendations.filter((r) => r.phase === 'early'));
	let late = $derived(data.resource.recommendations.filter((r) => r.phase === 'late'));

	const canonical = `${SITE_URL}/guides/credits`;
</script>

{#snippet recCard(rec: Recommendation)}
	<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
		<span
			class="rounded-full border px-2 py-0.5 text-[11px] font-medium {PHASE_TAG[rec.phase]}"
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

<div class="mx-auto max-w-3xl p-6 text-slate-100">
	<a href={resolve('/')} class="text-xs font-medium text-wf-cyan hover:text-wf-cyan/80">
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

	<!-- two-channel rule section inserted here in a follow-up -->

	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The progression path</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each early as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
			{#each late as rec (rec.nodeLabel)}
				{@render recCard(rec)}
			{/each}
		</div>
	</section>

	<!-- stacking table, myth-bust and honorable-mention sections inserted here in a follow-up -->
</div>
```

- [ ] **Step 5: Run svelte autofixer, then the tests**

Run the Svelte MCP autofixer on `+page.svelte`, apply fixes, then:
Run: `pnpm test:unit --run src/routes/guides/credits/page.svelte.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/routes/guides/credits/
git commit -m "feat(guides): bespoke credits guide route with data-driven cards"
```

---

### Task 5: Content sections — two-channel rule, stacking table, myth-bust, honorable mentions & sources

**Files:**
- Modify: `src/routes/guides/credits/+page.svelte`
- Modify: `src/routes/guides/credits/page.svelte.test.ts`

**Interfaces:**
- Consumes: Task 4's page skeleton (`fixtureResource`, the two HTML comment placeholders mark the insertion points).
- Produces: the finished page; no downstream consumers.

- [ ] **Step 1: Verify the non-wiki source URLs**

```bash
curl -fsIL -o /dev/null -w '%{http_code}\n' https://www.warframe.com/en/patch-notes/pc/42-0-10
curl -fsIL -o /dev/null -w '%{http_code}\n' https://www.warframe.com/en/patch-notes/pc/27-4-0
```

Expected: `200` each. If a patch-notes URL 404s, link the wiki mirror instead (`https://wiki.warframe.com/w/Update_42#42.0.10` / `https://wiki.warframe.com/w/Update_27#27.4`) — verify the replacement the same way.

- [ ] **Step 2: Write the failing tests**

Append to the `describe` block in `page.svelte.test.ts`:

```ts
	it('explains the two-channel rule with the first-win warning', () => {
		render(Page, { data });
		expect(screen.getByRole('heading', { name: /two-channel rule/i })).toBeInTheDocument();
		expect(screen.getByText('End-of-mission rewards')).toBeInTheDocument();
		expect(screen.getByText(/Pickups & caches/)).toBeInTheDocument();
		expect(screen.getByText(/wastes the First Win Bonus/i)).toBeInTheDocument();
	});

	it('renders the multiplier stacking table with the 500k worked example', () => {
		render(Page, { data });
		expect(screen.getByRole('heading', { name: /stacking multipliers/i })).toBeInTheDocument();
		expect(screen.getByRole('cell', { name: "Chroma's Effigy" })).toBeInTheDocument();
		expect(screen.getByText(/500,000 per kill/)).toBeInTheDocument();
	});

	it('busts outdated advice', () => {
		render(Page, { data });
		expect(screen.getByRole('heading', { name: /outdated advice/i })).toBeInTheDocument();
		// "Secura Lecta" appears in two myth entries — assert presence, not uniqueness.
		expect(screen.getAllByText(/Secura Lecta/).length).toBeGreaterThan(0);
		expect(screen.getByText(/Gian Point/)).toBeInTheDocument();
	});

	it('lists honorable mentions and sources', () => {
		render(Page, { data });
		// "Railjack" also appears in the two-channel rewards panel.
		expect(screen.getAllByText(/Railjack/).length).toBeGreaterThan(0);
		expect(screen.getByRole('link', { name: /Credits — Warframe Wiki/i })).toBeInTheDocument();
	});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `pnpm test:unit --run src/routes/guides/credits/page.svelte.test.ts`
Expected: 4 PASS (Task 4), 4 FAIL (headings not found).

- [ ] **Step 4: Add the content data to the script block**

Insert after the `canonical` constant in `+page.svelte`:

```ts
	const MULTIPLIERS = [
		{
			name: 'Credit Booster',
			channel: 'Everything',
			effect: '×2 on rewards, caches and drops. 40p/3d · 80p/7d · 200p/30d; also from Daily Tribute and occasionally Baro Ki’Teer.',
		},
		{
			name: 'Daily First Win Bonus',
			channel: 'Rewards only',
			effect: '×2 on the first mission completed after 00:00 UTC — silently consumed by cache/drop missions.',
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
			effect: '18% chance to double each pickup (beast companions) — the deterministic Smeeta alternative.',
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
			truth: 'Dead since Hotfix 42.0.10 (May 2026): the multi-trigger exploit was fixed. The weapon keeps only a modest MR-scaled bonus on its own kills.',
		},
		{
			claim: "Chroma's Effigy credit doubling was removed",
			truth: 'False — the patch history is clean through 2026. The rumor conflates the Secura Lecta nerf; only a bug with Techrot cache credits is open.',
		},
		{
			claim: 'Dark Sectors boost credits by +35%',
			truth: 'Those percentages are the resource and affinity bonuses. The credit benefit is a flat ~20,000 added to the mission reward.',
		},
		{
			claim: 'Farm credits on Gian Point',
			truth: 'Removed in Update 29.10 (2021). Veil Proxima skirmishes still pay 80–150k per mission.',
		},
		{
			claim: 'Sell Ayatan sculptures for credits',
			truth: 'Their credit sell value is negligible — Ayatans are Endo (or platinum), not a credit source.',
		},
	];

	const SOURCES = [
		{ label: 'Credits — Warframe Wiki', url: 'https://wiki.warframe.com/w/Credits' },
		{ label: 'Dark Sector — Warframe Wiki', url: 'https://wiki.warframe.com/w/Dark_Sector' },
		{ label: 'Daily Tribute — Warframe Wiki', url: 'https://wiki.warframe.com/w/Daily_Tribute' },
		{ label: 'The Index — Warframe Wiki', url: 'https://wiki.warframe.com/w/The_Index' },
		{ label: 'Laomedeia — Warframe Wiki', url: 'https://wiki.warframe.com/w/Laomedeia' },
		{ label: 'Legacyte Harvest — Warframe Wiki', url: 'https://wiki.warframe.com/w/Legacyte_Harvest' },
		{ label: 'Profit-Taker Orb — Warframe Wiki', url: 'https://wiki.warframe.com/w/Profit-Taker_Orb' },
		{ label: 'Hotfix 42.0.10 (Secura Lecta fix)', url: 'https://www.warframe.com/en/patch-notes/pc/42-0-10' },
		{ label: 'Update 27.4 (Railjack credit rewards)', url: 'https://www.warframe.com/en/patch-notes/pc/27-4-0' },
	];
```

- [ ] **Step 5: Replace the first placeholder comment with the two-channel section**

Replace `<!-- two-channel rule section inserted here in a follow-up -->` with:

```svelte
	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">The two-channel rule</h2>
		<p class="mb-4 text-sm text-wf-muted">
			Every credit source pays through one of two channels, and every multiplier
			attaches to exactly one of them — which explains every “why didn’t my
			booster work?” moment.
		</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-emerald-300">End-of-mission rewards</h3>
				<p class="mt-1 text-xs text-wf-muted">
					Dark Sectors · Arbitrations · Sorties · Railjack
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					Doubled by the <strong>Daily First Win Bonus</strong> and by a
					<strong>Credit Booster</strong> — stack both for ×4.
				</p>
			</div>
			<div class="rounded-xl border border-wf-edge bg-wf-panel p-4">
				<h3 class="text-sm font-semibold text-amber-300">Pickups &amp; caches</h3>
				<p class="mt-1 text-xs text-wf-muted">
					The Index · Laomedeia · Techrot Safes · Profit-Taker
				</p>
				<p class="mt-2 text-sm text-wf-muted">
					Doubled by a <strong>Credit Booster</strong>, <strong>Chroma’s Effigy</strong>
					(drops), the <strong>MR30 Blessing</strong> and
					<strong>Prosperous Retriever</strong> — never by the First Win Bonus.
				</p>
			</div>
		</div>
		<p class="mt-3 text-xs text-amber-300/90">
			⚠ Running a cache mission first each day wastes the First Win Bonus — it is
			consumed with no effect. Spend it on an Arbitration or a Dark Sector first.
		</p>
	</section>
```

- [ ] **Step 6: Replace the second placeholder comment with the remaining sections**

Replace `<!-- stacking table, myth-bust and honorable-mention sections inserted here in a follow-up -->` with:

```svelte
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
			Worked example — Profit-Taker’s guaranteed drop: 125,000 base → 250,000 with
			Effigy → <strong class="text-slate-100">500,000 per kill</strong> with a
			Credit Booster on top. The First Win Bonus never touches drops, so spend it
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
			80–150k per mission (per the Update 27.4 reward tables) while also earning
			Endo, intrinsics and relics: the relaxed farm-while-doing-other-things pick.
		</p>
		<p class="mb-2 text-sm text-wf-muted">
			<strong class="text-slate-100">Sorties</strong> — a fixed 100,000 per day
			(20k + 30k + 50k) for ~20 minutes of endgame missions.
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
```

- [ ] **Step 7: Run svelte autofixer, then the tests**

Run the Svelte MCP autofixer on `+page.svelte`, apply fixes, then:
Run: `pnpm test:unit --run src/routes/guides/credits/page.svelte.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: Commit**

```bash
git add src/routes/guides/credits/
git commit -m "feat(guides): credits guide content — two-channel rule, stacking table, myth-bust"
```

---

### Task 6: End-to-end test + full verification

**Files:**
- Modify: `e2e/guides.test.ts`

**Interfaces:**
- Consumes: everything above; the built app (`pnpm build` + `pnpm preview`, which `playwright.config` orchestrates).
- Produces: a merge-ready branch.

- [ ] **Step 1: Add the e2e test**

Append to `e2e/guides.test.ts`:

```ts
test('credits guide renders the bespoke page', async ({ page }) => {
	await page.goto('/guides/credits');

	await expect(page.getByRole('heading', { name: /Credits farming guide/i })).toBeVisible();
	// Data-driven card from the dataset entry.
	await expect(page.getByText('Ceres — Seimeni / Gabii (Dark Sector)')).toBeVisible();
	// Bespoke sections that the generic [resource] shell doesn't have.
	await expect(page.getByRole('heading', { name: /two-channel rule/i })).toBeVisible();
	await expect(page.getByRole('heading', { name: /outdated advice/i })).toBeVisible();
});
```

- [ ] **Step 2: Build (verifies the prerender doesn't collide)**

Run: `pnpm build`
Expected: exits 0. A duplicate-prerender error mentioning `/guides/credits` means Task 3's `entries()` filter regressed.

- [ ] **Step 3: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS, including the new credits test.

- [ ] **Step 4: Full gate — unit, types, lint, format**

```bash
pnpm test:unit --run
pnpm check
pnpm lint
pnpm format
```

Expected: all clean; `pnpm format` may rewrite files — include them in the commit.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(e2e): cover bespoke credits guide page"
```

---

## Out of scope (from the spec)

- No `credits.svx` — prose lives in the bespoke page.
- No schema changes (`kind: 'currency'`, `mid` phase).
- No in-game verification of Railjack payouts — copy cites the 27.4 patch-note range.
- The uncorroborated "The Teacher" Vox Solaris prerequisite is deliberately absent from all copy.
