# wforacle Farming Layer (Plan 3 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the curated farming layer — per-planet resources with early/late "best farm" recommendations (⚡/💀 badges + drill-down) and long-form mdsvex guide pages — for a solid starter set of ~10-12 high-value resources.

**Architecture:** Resource _metadata_ (name, image) comes from the machine layer (`@wfcd/items`, via the Plan-2 pipeline); the _planet→resources map_, the _early/late recommendations_, and the _guide prose_ are hand-curated (committed inputs the pipeline bakes into `static/data/dataset.json`, so a CI refresh preserves them). The panel gains a resources section; each resource links to an mdsvex guide page at `/guides/[resource]`. Every recommendation carries a `lastVerified` date and a `boostersApply` flag.

**Tech Stack:** TypeScript, Svelte 5, Tailwind, `@wfcd/items`, mdsvex, Vitest, Playwright.

## Global Constraints

- **Machine vs curated separation at the source.** Resource `name`/`image` derive from `@wfcd/items`; `planet→resources`, `recommendations`, and guide prose are hand-authored in `scripts/data/farming.ts` + `src/content/guides/`. The pipeline merges them; `dataset.json` stays the single app-loaded artifact.
- **Types extend, never break.** `Dataset` gains `resources: Resource[]`; `Region` gains `resourceIds: string[]`; new `Resource`/`Recommendation` types. Existing Plan 1/2 tests must stay green (additive only). `seed.ts` fixture gets the new fields with empty arrays.
- **Every recommendation carries `lastVerified` + `boostersApply`** (crate-farm recs flag boosters as NOT applying; enemy-kill recs flag they do). Sourced from current `wiki.warframe.com/w/<Resource>_Farming_Guide` pages — cite the source URL in each rec.
- **Starter set = ~10-12 resources** (Orokin Cell, Neurodes, Neural Sensors, Nano Spores, Alloy Plate, Plastids, Polymer Bundle, Oxium, Argon Crystal, Gallium, Control Module, Rubedo). Expandable later.
- **A recommendation's node may not be a real `StarNode`** (e.g. "Ceres — Draco", an old node): store a `nodeLabel` string; `nodeId` is optional and only set when it resolves.
- Package manager `pnpm`; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD; commit per green task; `pnpm lint`/`format` clean. Signing is on.

---

### Task 1: Resource + Recommendation types

**Files:**

- Modify: `src/lib/model/types.ts`
- Create: `src/lib/model/resources.ts`
- Test: `src/lib/model/resources.test.ts`
- Modify: `src/lib/data/seed.ts` (add empty `resources: []` + `resourceIds: []`)

**Interfaces:**

- Produces:
  - `interface Recommendation { phase: 'early' | 'late'; nodeLabel: string; nodeId?: string; boostersApply: boolean; note: string; source: string; lastVerified: string }`
  - `interface Resource { id: string; name: string; image?: string; regionIds: string[]; recommendations: Recommendation[] }`
  - `Dataset` gains `resources: Resource[]`; `Region` gains `resourceIds: string[]`.
  - `resourcesForRegion(dataset: Dataset, regionId: string): Resource[]` — resources whose `regionIds` includes `regionId`, in dataset order.
  - `bestPhaseRec(resource: Resource, phase: 'early' | 'late'): Recommendation | undefined` — first rec for that phase.

- [ ] **Step 1: Write the failing test**

`src/lib/model/resources.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resourcesForRegion, bestPhaseRec } from './resources';
import type { Dataset, Resource } from './types';

const alloy: Resource = {
	id: 'alloyplate',
	name: 'Alloy Plate',
	regionIds: ['venus', 'ceres'],
	recommendations: [
		{
			phase: 'early',
			nodeLabel: 'Venus — Tessera',
			boostersApply: false,
			note: 'crate run',
			source: 'wiki',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Ceres — Gabii',
			boostersApply: true,
			note: 'SP squad',
			source: 'wiki',
			lastVerified: '2026-07-05',
		},
	],
};
const ds = {
	regions: [],
	nodes: [],
	bosses: [],
	warframes: [],
	resources: [alloy],
} as unknown as Dataset;

describe('resources helpers', () => {
	it('lists resources for a region', () => {
		expect(resourcesForRegion(ds, 'ceres').map((r) => r.id)).toEqual(['alloyplate']);
		expect(resourcesForRegion(ds, 'earth')).toEqual([]);
	});
	it('picks the best rec per phase', () => {
		expect(bestPhaseRec(alloy, 'early')?.nodeLabel).toBe('Venus — Tessera');
		expect(bestPhaseRec(alloy, 'late')?.boostersApply).toBe(true);
	});
});
```

- [ ] **Step 2: Run — expect FAIL** — `pnpm vitest run src/lib/model/resources.test.ts` → module not found.

- [ ] **Step 3: Implement**

In `src/lib/model/types.ts` add the two interfaces and extend `Dataset`/`Region`:

```ts
export interface Recommendation {
	phase: 'early' | 'late';
	nodeLabel: string;
	nodeId?: string;
	boostersApply: boolean;
	note: string;
	source: string;
	lastVerified: string;
}
export interface Resource {
	id: string;
	name: string;
	image?: string;
	regionIds: string[];
	recommendations: Recommendation[];
}
// Region: add `resourceIds: string[]`
// Dataset: add `resources: Resource[]`
```

`src/lib/model/resources.ts`:

```ts
import type { Dataset, Resource } from './types';
export function resourcesForRegion(dataset: Dataset, regionId: string): Resource[] {
	return dataset.resources.filter((r) => r.regionIds.includes(regionId));
}
export function bestPhaseRec(resource: Resource, phase: 'early' | 'late') {
	return resource.recommendations.find((r) => r.phase === phase);
}
```

In `src/lib/data/seed.ts`: add `resources: []` to the dataset and `resourceIds: []` to each region literal (keeps the fixture type-valid).

- [ ] **Step 4: Run — expect PASS** — `pnpm test:unit --run` (all prior + 2 new green; seed compiles with new fields).

- [ ] **Step 5: Commit**

```bash
git add src/lib/model/types.ts src/lib/model/resources.ts src/lib/model/resources.test.ts src/lib/data/seed.ts
git commit -m "feat: Resource/Recommendation types + region resources helpers"
```

---

### Task 2: Curated farming data (planet map + recommendations)

**Files:**

- Create: `scripts/data/farming.ts`
- Test: `scripts/data/farming.test.ts`

**Interfaces:**

- Consumes: `Recommendation` (types); `slugify` (`scripts/data/parse.ts`).
- Produces:
  - `RESOURCES: { id: string; name: string }[]` — the ~12 starter resources (`id = slugify(name)`).
  - `PLANET_RESOURCES: Record<string, string[]>` — regionId → resource ids that are signature drops there (curated from the wiki; the 14 main-planet region ids).
  - `RECOMMENDATIONS: Record<string, Recommendation[]>` — resource id → its early + late recs (each with `boostersApply`, `note`, `source` = the wiki farming-guide URL, `lastVerified: '2026-07-05'`).

- [ ] **Step 1: Write the failing test**

`scripts/data/farming.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { slugify } from './parse';

const ids = new Set(RESOURCES.map((r) => r.id));

describe('curated farming data', () => {
	it('has ~12 starter resources with slug ids', () => {
		expect(RESOURCES.length).toBeGreaterThanOrEqual(10);
		for (const r of RESOURCES) expect(r.id).toBe(slugify(r.name));
	});
	it('maps only known resource ids to planets, on the 14 main regions', () => {
		const mains = new Set([
			'earth',
			'venus',
			'mercury',
			'mars',
			'phobos',
			'ceres',
			'jupiter',
			'europa',
			'saturn',
			'uranus',
			'neptune',
			'pluto',
			'eris',
			'sedna',
		]);
		for (const [region, rids] of Object.entries(PLANET_RESOURCES)) {
			expect(mains.has(region)).toBe(true);
			for (const rid of rids) expect(ids.has(rid)).toBe(true);
		}
	});
	it('every resource has an early and a late rec with required fields', () => {
		for (const r of RESOURCES) {
			const recs = RECOMMENDATIONS[r.id] ?? [];
			expect(recs.some((x) => x.phase === 'early')).toBe(true);
			expect(recs.some((x) => x.phase === 'late')).toBe(true);
			for (const x of recs) {
				expect(x.nodeLabel).toBeTruthy();
				expect(typeof x.boostersApply).toBe('boolean');
				expect(x.source).toMatch(/wiki\.warframe\.com/);
				expect(x.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		}
	});
});
```

- [ ] **Step 2: Run — expect FAIL** — module not found.

- [ ] **Step 3: Implement**

`scripts/data/farming.ts` — author from the wiki farming guides (`wiki.warframe.com/w/<Resource>_Farming_Guide`) and the Megazawr guide. One complete worked entry, then fill the rest to satisfy the test (every resource: id, planet mapping, early+late rec). Crate-farm recs set `boostersApply: false`; enemy-kill/Steel-Path recs set `true`.

```ts
import type { Recommendation } from '../../src/lib/model/types';

export const RESOURCES = [
	{ id: 'orokincell', name: 'Orokin Cell' },
	{ id: 'neurodes', name: 'Neurodes' },
	{ id: 'neuralsensors', name: 'Neural Sensors' },
	{ id: 'nanospores', name: 'Nano Spores' },
	{ id: 'alloyplate', name: 'Alloy Plate' },
	{ id: 'plastids', name: 'Plastids' },
	{ id: 'polymerbundle', name: 'Polymer Bundle' },
	{ id: 'oxium', name: 'Oxium' },
	{ id: 'argoncrystal', name: 'Argon Crystal' },
	{ id: 'gallium', name: 'Gallium' },
	{ id: 'controlmodule', name: 'Control Module' },
	{ id: 'rubedo', name: 'Rubedo' },
];

// regionId -> signature resource ids (curated from the wiki planet pages)
export const PLANET_RESOURCES: Record<string, string[]> = {
	venus: ['alloyplate', 'polymerbundle'],
	earth: ['neurodes', 'rubedo'],
	saturn: ['orokincell', 'nanospores', 'plastids'],
	jupiter: ['neuralsensors', 'oxium'],
	uranus: ['plastids', 'polymerbundle', 'gallium'],
	ceres: ['alloyplate', 'orokincell'],
	// … fill the remaining main-planet mappings for the 12 resources …
};

// One complete worked example; author the rest the same way from the cited guide.
export const RECOMMENDATIONS: Record<string, Recommendation[]> = {
	orokincell: [
		{
			phase: 'early',
			nodeLabel: 'Saturn — Helene (Defense)',
			nodeId: undefined,
			boostersApply: true,
			note: 'Reliable early Orokin Cell + Sargas Ruk (Tethys) as an alt; boosters help enemy drops.',
			source: 'https://wiki.warframe.com/w/Orokin_Cell_Farming_Guide',
			lastVerified: '2026-07-05',
		},
		{
			phase: 'late',
			nodeLabel: 'Ceres — Gabii (Dark Sector Survival)',
			boostersApply: true,
			note: 'Steel Path + Nekros/Khora; dense Grineer.',
			source: 'https://wiki.warframe.com/w/Orokin_Cell_Farming_Guide',
			lastVerified: '2026-07-05',
		},
	],
	// … author early+late for the other 11 resources, citing each resource's wiki farming guide …
};
```

- [ ] **Step 4: Run — expect PASS** — `pnpm vitest run scripts/data/farming.test.ts` (3 passed once all resources are filled).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/farming.ts scripts/data/farming.test.ts
git commit -m "feat(farming): curated planet-resources map + early/late recommendations"
```

---

### Task 3: Pipeline — emit resources into the dataset

**Files:**

- Modify: `scripts/data/assemble.ts` (build resources; extend validate)
- Modify: `scripts/data/build.ts` (region `resourceIds`)
- Modify: `scripts/data/sources.ts` (load `Resources` category)
- Test: `scripts/data/assemble.test.ts`

**Interfaces:**

- Consumes: `RESOURCES`, `PLANET_RESOURCES`, `RECOMMENDATIONS` (Task 2); `slugify`; `@wfcd/items` `Resources` (each raw resource: `{ name, imageName, type }`).
- Produces:
  - `type RawResource = { name: string; imageName?: string; type?: string }`
  - `buildResources(rawResources: RawResource[]): Resource[]` — for each curated `RESOURCES` entry, match `@wfcd/items` by name to get `image = imageName`, set `regionIds` (reverse of `PLANET_RESOURCES`), attach `RECOMMENDATIONS[id]`.
  - `assembleDataset` now takes `rawResources` and includes `resources`; each region's `resourceIds` filled from `PLANET_RESOURCES`.
  - `validateDataset` also checks: every `region.resourceIds` id exists in `resources`; every `resource.regionIds` id exists in `regions`; every recommendation `nodeId` (when set) resolves.

- [ ] **Step 1: Write the failing test**

Append to `scripts/data/assemble.test.ts` (inline raw resources so it's network-free):

```ts
import { buildResources } from './assemble';
const rawResources = [
	{ name: 'Alloy Plate', imageName: 'AlloyPlate.png', type: 'Resource' },
	{ name: 'Orokin Cell', imageName: 'ComponentCell.png', type: 'Resource' },
];
describe('buildResources', () => {
	const resources = buildResources(rawResources);
	it('builds curated resources with image + regionIds + recs', () => {
		const alloy = resources.find((r) => r.id === 'alloyplate');
		expect(alloy?.image).toBe('AlloyPlate.png');
		expect(alloy?.regionIds).toContain('venus');
		expect(alloy?.recommendations.length).toBeGreaterThan(0);
	});
});
```

(Also update the existing `assembleDataset` test call to pass `rawResources` and assert `ds.resources.length > 0` and a region's `resourceIds` is populated.)

- [ ] **Step 2: Run — expect FAIL** — `buildResources` not exported.

- [ ] **Step 3: Implement**

In `scripts/data/build.ts` `buildRegions`, set `resourceIds: PLANET_RESOURCES[id] ?? []` (import from `./farming`).
In `scripts/data/assemble.ts`:

```ts
import { RESOURCES, PLANET_RESOURCES, RECOMMENDATIONS } from './farming';
import { slugify } from './parse';
import type { Resource } from '../../src/lib/model/types';

export type RawResource = { name: string; imageName?: string; type?: string };

export function buildResources(raw: RawResource[]): Resource[] {
	const imgByName = new Map(raw.map((r) => [r.name, r.imageName]));
	const regionsByResource = new Map<string, string[]>();
	for (const [region, rids] of Object.entries(PLANET_RESOURCES))
		for (const rid of rids)
			(regionsByResource.get(rid) ?? regionsByResource.set(rid, []).get(rid)!).push(region);
	return RESOURCES.map((r) => ({
		id: r.id,
		name: r.name,
		image: imgByName.get(r.name),
		regionIds: regionsByResource.get(r.id) ?? [],
		recommendations: RECOMMENDATIONS[r.id] ?? [],
	}));
}
```

Extend `assembleDataset(solNodes, warframes, rawResources)` to include `resources: buildResources(rawResources)`, and extend `validateDataset` with the three new referential checks. In `scripts/data/sources.ts`, also load the `Resources` category (`new Items(['Resources'])` filtered to `type === 'Resource'`) and return it; in `scripts/build-data.ts` pass it through and add a sanity check (`resources.length >= 10`).

- [ ] **Step 4: Run — expect PASS** — `pnpm test:unit --run` (assemble + build tests green).

- [ ] **Step 5: Commit**

```bash
git add scripts/data/assemble.ts scripts/data/build.ts scripts/data/sources.ts scripts/data/assemble.test.ts scripts/build-data.ts
git commit -m "feat(pipeline): build resources (image + regions + recs) into the dataset"
```

---

### Task 4: Regenerate dataset + download resource images

**Files:**

- Modify: `static/data/dataset.json` (regenerated with resources)
- Create: `static/resources/*.webp` (starter set icons)
- Create: `scripts/fetch-resource-images.sh`

**Interfaces:** none (data + asset generation).

- [ ] **Step 1: Regenerate the dataset** — `pnpm data:build`. Expected: prints resources count ≥ 10; `dataset.json` now has a `resources` array and regions carry `resourceIds`. Hand-verify a couple (Alloy Plate → venus/ceres, has early+late recs).

- [ ] **Step 2: Download + optimize the resource icons**

`scripts/fetch-resource-images.sh` (flat sequential curls, matching `scripts` conventions — the CDN base is `https://cdn.warframestat.us/img/`, images optimized to ~64px webp):

```bash
#!/usr/bin/env bash
set -e
mkdir -p static/resources
U="wforacle"; B="https://cdn.warframestat.us/img"
dl() { curl -sL -A "$U" -o "/tmp/res-$1" "$B/$2" && convert "/tmp/res-$1" -resize 64x64 -strip "static/resources/$1" && echo "ok $1"; }
dl orokincell.webp ComponentCell.png
dl alloyplate.webp AlloyPlate.png
dl argoncrystal.webp ArgonCrystal.png
# … one line per starter resource, using the imageName from dataset.json's resources[] …
```

Run it; the app will reference `/resources/${resource.id}.webp`.

- [ ] **Step 3: Verify + commit**

```bash
node -e "const d=require('./static/data/dataset.json').data; console.log('resources:', d.resources.length, '| with image:', d.resources.filter(r=>r.image).length)"
git add static/data/dataset.json static/resources scripts/fetch-resource-images.sh
git commit -m "feat(data): regenerate dataset with resources + starter resource icons"
```

---

### Task 5: Resources section in the panel (badges)

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: `resourcesForRegion`, `bestPhaseRec` (`$lib/model/resources`); `base` (`$app/paths`).
- Behavior: below the assassination frame block(s), a **Resources** section lists the region's resources (icon `/resources/${id}.webp` + name). Each shows an ⚡ badge if it has an `early` rec and a 💀 badge if it has a `late` rec, and a `farming ▸` link to `${base}/guides/${id}`. Read-only (no checkboxes). Nothing renders when the region has no resources.

- [ ] **Step 1: Write the failing test**

Add to `RegionPanel.svelte.test.ts` an inline dataset whose `venus` region has a resource `alloyplate` (with an early + late rec), render for `venus`, assert the resource name renders, both ⚡ and 💀 badges present (by `title`/`aria-label` or emoji text), and a link to `/guides/alloyplate` exists.

```ts
it('renders the region resources with phase badges and a guide link', () => {
	const ds = {
		regions: [
			{
				id: 'venus',
				name: 'Venus',
				kind: 'planet',
				progressionOrder: 2,
				factions: ['Corpus'],
				nodeIds: [],
				spoilerGated: false,
				resourceIds: ['alloyplate'],
			},
		],
		nodes: [],
		bosses: [],
		warframes: [],
		resources: [
			{
				id: 'alloyplate',
				name: 'Alloy Plate',
				image: 'AlloyPlate.png',
				regionIds: ['venus'],
				recommendations: [
					{
						phase: 'early',
						nodeLabel: 'A',
						boostersApply: false,
						note: '',
						source: '',
						lastVerified: '2026-07-05',
					},
					{
						phase: 'late',
						nodeLabel: 'B',
						boostersApply: true,
						note: '',
						source: '',
						lastVerified: '2026-07-05',
					},
				],
			},
		],
	} as unknown as Dataset;
	const tracker = createTracker([]);
	render(RegionPanel, { dataset: ds, regionId: 'venus', tracker });
	expect(screen.getByText('Alloy Plate')).toBeInTheDocument();
	expect(screen.getByText('⚡ early')).toBeInTheDocument();
	expect(screen.getByText('💀 late')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: /farming/i })).toHaveAttribute(
		'href',
		'/guides/alloyplate',
	);
});
```

- [ ] **Step 2: Run — expect FAIL** — no resources section yet.

- [ ] **Step 3: Implement** — add the resources section markup to `RegionPanel.svelte` (after the frame blocks, before the empty-state branch's close), using `resourcesForRegion(dataset, regionId)`, `bestPhaseRec`, Tailwind badge classes (`b-early` green, `b-late` gold as in the mockup), an `<img src={`${base}/resources/${r.id}.webp`}>`, and an `<a href={`${base}/guides/${r.id}`}>farming ▸</a>`. Validate with the Svelte MCP.

- [ ] **Step 4: Run — expect PASS** — `pnpm test:unit --run` (new test + all prior green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat: region resources section with early/late badges + guide link"
```

---

### Task 6: mdsvex setup + guide route

**Files:**

- Modify: `vite.config.ts` (mdsvex preprocess) + `package.json` (mdsvex dep)
- Create: `src/routes/guides/[resource]/+page.ts` + `+page.svelte`
- Create: `src/content/guides/orokincell.svx` (one worked guide)
- Test: `e2e/guides.test.ts`

**Interfaces:**

- Produces: a route `/guides/[resource]` that renders the mdsvex guide for that resource id, with the resource's recommendations shown structured above the prose. Guides are prerendered.

- [ ] **Step 1: Add mdsvex**

```bash
pnpm add -D mdsvex
```

In `vite.config.ts`, add mdsvex to the sveltekit plugin's `preprocess` and add `.svx` to `extensions`. (mdsvex config: `import { mdsvex } from 'mdsvex'` → `preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'] })]`, `extensions: ['.svelte', '.svx']`.)

- [ ] **Step 2: Guide route loader**

`src/routes/guides/[resource]/+page.ts`:

```ts
import { loadDataset } from '$lib/data/dataset';
import { error } from '@sveltejs/kit';
export const prerender = true;
export async function load({ params, fetch }) {
	const ds = await loadDataset(fetch);
	const resource = ds.resources.find((r) => r.id === params.resource);
	if (!resource) throw error(404, 'Unknown resource');
	// dynamic-import the matching .svx guide if present (else prose-less)
	const guides = import.meta.glob('/src/content/guides/*.svx');
	const key = `/src/content/guides/${params.resource}.svx`;
	const guide = guides[key] ? (await guides[key]()).default : null;
	return { resource, guide };
}
export function entries() {
	return [];
} // entries generated from dataset at build via prerender crawl
```

(If prerendering needs explicit entries, generate them from the dataset's resource ids; the crawl from the panel links also suffices.)

- [ ] **Step 3: Guide page** — `+page.svelte` renders the resource name + icon, the early/late recommendations (nodeLabel, note, `boostersApply` hint "boosters help / don't affect crates", source link, `lastVerified`), then `<svelte:component this={data.guide} />` for the prose when present.

- [ ] **Step 4: One worked guide** — `src/content/guides/orokincell.svx`: a short editorial guide (early vs mid/late sections, synthesized + cited from `wiki.warframe.com/w/Orokin_Cell_Farming_Guide`). This is the template for the rest (Task 7).

- [ ] **Step 5: e2e** — `e2e/guides.test.ts`: navigate to `/guides/orokincell`, assert the resource name + an early and a late recommendation render, and the prose heading is present.

- [ ] **Step 6: Verify + commit** — `pnpm build` (guides prerender), `pnpm exec playwright test` (new + existing pass).

```bash
git add vite.config.ts package.json pnpm-lock.yaml src/routes/guides src/content/guides e2e/guides.test.ts
git commit -m "feat: mdsvex guide route with structured recommendations + prose"
```

---

### Task 7: Author the starter-set guides

**Files:**

- Create: `src/content/guides/*.svx` (one per starter resource beyond orokincell)

**Interfaces:** none (content).

- [ ] **Step 1: Author each guide** — for each of the other ~11 starter resources, create `src/content/guides/<id>.svx` following the orokincell template: an **Early game** section (crate/solo, with the "boosters don't affect crates" caveat where relevant) and a **Mid/Late** section (Steel-Path + squad), synthesized and cited from that resource's `wiki.warframe.com/w/<Resource>_Farming_Guide` (or the Megazawr guide where no dedicated page exists). Keep each concise (a few paragraphs). Do NOT fabricate node names — use the ones from the cited guide.

- [ ] **Step 2: Verify all guide routes prerender** — `pnpm build`; confirm `/guides/<id>` exists for every starter resource (no 404s). Spot-check two in the browser.

- [ ] **Step 3: Commit**

```bash
git add src/content/guides
git commit -m "content: author early/late farming guides for the starter resources"
```

---

## Self-Review

**Spec coverage (Plan 3 slice):**

- Per-planet resources (curated map) shown in the panel → Tasks 1–5. ✅
- Early/late recommendations + ⚡/💀 badges + `boostersApply` + `lastVerified` → Tasks 2, 5, 6. ✅
- Drill-down to farming detail → Task 5 (link) + Task 6 (page). ✅
- mdsvex long-form guides (included per decision) → Tasks 6–7. ✅
- Resource metadata (name/image) from `@wfcd/items`; curated map/recs/guides hand-authored; pipeline merges → Tasks 3–4. ✅ (machine-vs-curated separation honored)
- Starter set ~12 resources → Task 2. ✅
- **Deferred (correctly absent):** special regions/Deimos + spoiler disclosure + Ctrl-K palette + themes (Plan 4). Resource _tracking_ (resources stay read-only/informational per the design).

**Placeholder scan:** The curated data (Task 2 `RECOMMENDATIONS`/`PLANET_RESOURCES`) and guide prose (Task 7) are authored-during-execution _content_ with a complete schema, a passing-test contract, one fully-worked example each, and cited sources — this is how curated-content work is planned, not a code placeholder. All code steps carry complete code.

**Type consistency:** `Resource`/`Recommendation` fields identical across Tasks 1/2/3/5/6; `Dataset.resources` + `Region.resourceIds` added in Task 1 and consumed consistently; `resourcesForRegion`/`bestPhaseRec` signatures stable; `RawResource` defined in Task 3 and used in 3/4; guide route id = resource id = `slugify(name)` throughout. ✅

**Note for executor:** Tasks 2 and 7 are curation — verify node names against the cited wiki guide as of the run date and set `lastVerified` accordingly; the test contracts guarantee structure, not editorial accuracy (that's the human sign-off). The `entries()`/prerender-crawl detail in Task 6 may need adjustment to the installed SvelteKit version — the panel's `/guides/<id>` links make the pages crawlable regardless.
