# Mission-Node Frames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Citrine, Dante, Gauss, Voruna, Nidus, Jade, and Gyre as curated mission-node farms (spec: `docs/superpowers/specs/2026-07-24-mission-node-frames-design.md`).

**Architecture:** All seven ride the existing curated-farm path (`OPEN_WORLD_FARMS` → `buildOpenWorldFrames`), referencing real SolNodes already present in `warframe-worldstate-data`. Two small extensions: (1) a Blueprint that drops at the farm node becomes a drop-sourced `bp` part instead of a bare one, and (2) mission-rotation farms reuse the `PER_RUN_ROTATION_FARMS` static-label mechanism so the in-mission "Rotation C" never feeds the live worldstate chips.

**Tech Stack:** TypeScript, Vitest, Svelte 5 (+ svelte MCP/skill for `.svelte` edits), Playwright, `@wfcd/items`, `warframe-worldstate-data`, ImageMagick (glyph script).

## Global Constraints

- Every commit compiles, passes `pnpm test:unit`, and follows repo lint/format (`pnpm lint`, `pnpm format`).
- `.svelte` file edits MUST go through the svelte skill/agent (`svelte:svelte-file-editor` or `svelte-code-writer` skill) and be validated with the svelte MCP autofixer.
- TDD: write the failing test first for every behavior change.
- Curated copy uses the exact strings given below (verified against wiki.warframe.com 2026-07-24); do not invent alternates.

---

### Task 1: Curated farm entries (`openworld.ts`)

**Files:**
- Modify: `scripts/data/openworld.ts`
- Test: `scripts/data/openworld.test.ts`

**Interfaces:**
- Produces: 7 new `OPEN_WORLD_FARMS` entries (frameIds `citrine`, `dante`, `gauss`, `voruna`, `nidus`, `jade`, `gyre`) and 5 new `PER_RUN_ROTATION_FARMS` keys (`citrine`, `dante`, `gauss`, `voruna`, `nidus`). Task 2 reads `PER_RUN_ROTATION_FARMS[frameId][slot]`; Task 5's dataset rebuild consumes the farm entries.

- [ ] **Step 1: Write the failing tests**

In `scripts/data/openworld.test.ts`, extend `ZONE_NODES` and replace the two count/coverage tests; add a per-run coverage expectation:

```ts
const ZONE_NODES = new Set([
	'SolNode228',
	'SolNode129',
	'SolNode229',
	'CuratedAlbrechtLabs',
	'CuratedSayasVisions',
	'CuratedGranumVoid',
	// Real star-chart mission-farm nodes (see 2026-07-24 spec)
	'SolNode450', // Tyana Pass, Mars — Citrine
	'SolNode721', // Armatus, Deimos — Dante
	'SolNode177', // Kappa, Sedna — Gauss
	'SolNode310', // Circulus, Lua — Voruna
	'SolNode167', // Oestrus, Eris — Nidus
	'SolNode723', // Brutus, Uranus — Jade
	'ZarimanHub', // Chrysalith, Zariman — Gyre
]);
```

```ts
	it('has 17 entries covering all sixteen frames', () => {
		expect(OPEN_WORLD_FARMS).toHaveLength(17);
		expect(new Set(OPEN_WORLD_FARMS.map((f) => f.frameId))).toEqual(
			new Set([
				'gara',
				'revenant',
				'caliban',
				'garuda',
				'hildryn',
				'xaku',
				'qorvex',
				'protea',
				'koumei',
				'citrine',
				'dante',
				'gauss',
				'voruna',
				'nidus',
				'jade',
				'gyre',
			]),
		);
	});
```

In the `PER_RUN_ROTATION_FARMS` describe block, replace the coverage test and add one for the mission farms:

```ts
	it('covers exactly the farms whose rewards are per-run ranks, not the bounty cycle', () => {
		expect(Object.keys(PER_RUN_ROTATION_FARMS).sort()).toEqual([
			'citrine',
			'dante',
			'gauss',
			'koumei',
			'nidus',
			'protea',
			'voruna',
		]);
	});

	it('labels every mission-farm slot Rotation C, including drop-sourced blueprints', () => {
		expect(PER_RUN_ROTATION_FARMS.citrine).toEqual({
			bp: 'Rotation C',
			neuroptics: 'Rotation C',
			chassis: 'Rotation C',
			systems: 'Rotation C',
		});
		// Gauss's bp is a Market purchase, not a drop — no bp label.
		expect(PER_RUN_ROTATION_FARMS.gauss).toEqual({
			neuroptics: 'Rotation C',
			chassis: 'Rotation C',
			systems: 'Rotation C',
		});
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run scripts/data/openworld.test.ts`
Expected: FAIL — length 10 ≠ 17, per-run keys `['koumei','protea']`.

- [ ] **Step 3: Implement the curated entries**

In `scripts/data/openworld.ts`, extend `PER_RUN_ROTATION_FARMS` (keep the existing comment, append to it):

```ts
// Mission-node farms (Mirror Defense, Disruption, Conjunction Survival,
// Infested Salvage) are also per-run: their "Rotation C" is the in-mission
// AABC reward cadence, not the 150-min cycle. The parsed letter is discarded
// and a static "Rotation C" label lands in bountyTier — including on bp slots
// whose blueprint drops at the node (Citrine, Dante, Voruna). Jade's Ascension
// rewards have no rotation at all, and Gyre's Zariman bounty rotations ARE the
// live cycle, so neither is listed.
export const PER_RUN_ROTATION_FARMS: Record<string, Partial<Record<Slot, string>>> = {
	protea: { chassis: 'Extended', systems: 'Nightmare' },
	koumei: {},
	citrine: {
		bp: 'Rotation C',
		neuroptics: 'Rotation C',
		chassis: 'Rotation C',
		systems: 'Rotation C',
	},
	dante: {
		bp: 'Rotation C',
		neuroptics: 'Rotation C',
		chassis: 'Rotation C',
		systems: 'Rotation C',
	},
	gauss: { neuroptics: 'Rotation C', chassis: 'Rotation C', systems: 'Rotation C' },
	voruna: {
		bp: 'Rotation C',
		neuroptics: 'Rotation C',
		chassis: 'Rotation C',
		systems: 'Rotation C',
	},
	nidus: { neuroptics: 'Rotation C', chassis: 'Rotation C', systems: 'Rotation C' },
};
```

Append to `OPEN_WORLD_FARMS` (after the koumei entry), with a short comment above the block:

```ts
	// Mission-node farms: real star-chart SolNodes (all present in
	// warframe-worldstate-data), rewards on the in-mission rotation table.
	// bpSource strings verified against wiki.warframe.com (2026-07-24).
	{
		frameId: 'citrine',
		nodeId: 'SolNode450',
		regionId: 'mars',
		componentSource: 'Mirror Defense',
		bpSource: 'Mirror Defense drop (Rot C)',
	},
	{
		frameId: 'dante',
		nodeId: 'SolNode721',
		regionId: 'deimos',
		componentSource: 'Disruption',
		bpSource: 'Disruption drop (Rot C)',
	},
	{
		frameId: 'gauss',
		nodeId: 'SolNode177',
		regionId: 'sedna',
		componentSource: 'Disruption',
		bpSource: 'Market (30,000cr)',
	},
	{
		frameId: 'voruna',
		nodeId: 'SolNode310',
		regionId: 'lua',
		componentSource: 'Conjunction Survival',
		bpSource: 'Circulus drop or Yonta (125 Lua Thrax Plasm)',
	},
	{
		frameId: 'nidus',
		nodeId: 'SolNode167',
		regionId: 'eris',
		componentSource: 'Infested Salvage',
		bpSource: 'Complete The Glast Gambit',
	},
	{
		frameId: 'jade',
		nodeId: 'SolNode723',
		regionId: 'uranus',
		componentSource: 'Ascension',
		bpSource: 'Complete Jade Shadows or 450 Vestigial Motes',
	},
	{
		frameId: 'gyre',
		nodeId: 'ZarimanHub',
		regionId: 'zariman',
		componentSource: 'Zariman Bounty',
		bpSource: 'Zariman Bounty drop (L90–95+)',
	},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run scripts/data/openworld.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/openworld.ts scripts/data/openworld.test.ts
git commit -m "feat(data): curate seven mission-node farms (Citrine, Dante, Gauss, Voruna, Nidus, Jade, Gyre)"
```

---

### Task 2: Blueprint-drop support in `buildOpenWorldFrames`

**Files:**
- Modify: `scripts/data/build.ts` (the `buildOpenWorldFrames` function, ~lines 305–351)
- Test: `scripts/data/build.test.ts` (the `buildOpenWorldFrames` describe block)

**Interfaces:**
- Consumes: `PER_RUN_ROTATION_FARMS` from Task 1 (already imported in build.ts).
- Produces: `bp` parts gain `dropSourceNodeId`/`chance`/`bountyTier`/`rotation` when the Blueprint has farm-shaped drops; stay bare (`{id, frameId, slot}`) otherwise. Task 3's UI relies on `part.slot === 'bp' && part.dropSourceNodeId` to switch rendering.

- [ ] **Step 1: Write the failing tests**

Add to the `buildOpenWorldFrames` describe block in `scripts/data/build.test.ts` (fixtures use the real @wfcd location strings; note Gyre's double space after `Level`):

```ts
	// Citrine's main blueprint drops at the farm node itself (Mirror Defense
	// Rot C). The bp part must become drop-sourced, with the per-run static
	// label and NO live rotation.
	const citrine: RawWarframe = {
		name: 'Citrine',
		uniqueName: '/Lotus/Powersuits/Citrine/Citrine',
		type: 'Warframe',
		components: [
			{
				name: 'Blueprint',
				drops: [{ location: 'Mars/Tyana Pass (Defense), Rotation C', chance: 9.3 }],
			},
			{
				name: 'Systems',
				drops: [{ location: 'Mars/Tyana Pass (Defense), Rotation C', chance: 6.1 }],
			},
		],
	};
	// Nidus's blueprint rows are vendor/quest entries (Cephalon Simaris @100),
	// which must NOT turn the bp part into a fake 100% drop.
	const nidus: RawWarframe = {
		name: 'Nidus',
		uniqueName: '/Lotus/Powersuits/Nidus/Nidus',
		type: 'Warframe',
		components: [
			{
				name: 'Blueprint',
				drops: [{ location: 'Cephalon Simaris, Complete The Glast Gambit', chance: 100 }],
			},
			{
				name: 'Systems',
				drops: [{ location: 'Eris/Oestrus (Infested Salvage), Rotation C', chance: 14.29 }],
			},
		],
	};
	// Gyre's blueprint is a bounty reward at two tiers (equal chance → the
	// lower tier wins); Zariman bounty rotations are the live cycle, so the
	// rotation letter is kept.
	const gyre: RawWarframe = {
		name: 'Gyre',
		uniqueName: '/Lotus/Powersuits/Gyre/Gyre',
		type: 'Warframe',
		components: [
			{
				name: 'Blueprint',
				drops: [
					{
						location: 'Zariman Ten Zero (Level  110 - 115 Zariman Bounty), Rotation C',
						chance: 12.99,
					},
					{
						location: 'Zariman Ten Zero (Level  90 - 95 Zariman Bounty), Rotation C',
						chance: 12.99,
					},
				],
			},
			{
				name: 'Neuroptics',
				drops: [
					{
						location: 'Zariman Ten Zero (Level  50 - 55 Zariman Bounty), Rotation C',
						chance: 13.04,
					},
				],
			},
		],
	};
	const missionFarms: OpenWorldFarm[] = [
		{
			frameId: 'citrine',
			nodeId: 'SolNode450',
			regionId: 'mars',
			componentSource: 'Mirror Defense',
			bpSource: 'Mirror Defense drop (Rot C)',
		},
		{
			frameId: 'nidus',
			nodeId: 'SolNode167',
			regionId: 'eris',
			componentSource: 'Infested Salvage',
			bpSource: 'Complete The Glast Gambit',
		},
		{
			frameId: 'gyre',
			nodeId: 'ZarimanHub',
			regionId: 'zariman',
			componentSource: 'Zariman Bounty',
			bpSource: 'Zariman Bounty drop (L90–95+)',
		},
	];

	it('makes a node-dropped blueprint a drop-sourced part with the per-run label', () => {
		const cit = buildOpenWorldFrames([citrine], missionFarms).find((f) => f.id === 'citrine')!;
		const bp = cit.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBe('SolNode450');
		expect(bp.chance).toBeCloseTo(9.3, 1);
		expect(bp.bountyTier).toBe('Rotation C');
		expect(bp.rotation).toBeUndefined();
	});

	it('keeps a vendor/quest-sourced blueprint bare', () => {
		const nid = buildOpenWorldFrames([nidus], missionFarms).find((f) => f.id === 'nidus')!;
		const bp = nid.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBeUndefined();
		expect(bp.chance).toBeUndefined();
		const sys = nid.parts.find((p) => p.slot === 'systems')!;
		expect(sys.chance).toBeCloseTo(14.29, 2);
		expect(sys.bountyTier).toBe('Rotation C');
		expect(sys.rotation).toBeUndefined();
	});

	it('resolves a bounty-dropped blueprint with live rotation and lowest-tier tiebreak', () => {
		const gy = buildOpenWorldFrames([gyre], missionFarms).find((f) => f.id === 'gyre')!;
		const bp = gy.parts.find((p) => p.slot === 'bp')!;
		expect(bp.dropSourceNodeId).toBe('ZarimanHub');
		expect(bp.chance).toBeCloseTo(12.99, 2);
		expect(bp.bountyTier).toBe('L90–95');
		expect(bp.rotation).toBe('C');
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run scripts/data/build.test.ts`
Expected: the three new tests FAIL (bp parts are always bare today); all existing tests PASS.

- [ ] **Step 3: Implement**

In `scripts/data/build.ts`, add a helper above `buildOpenWorldFrames`:

```ts
/** A Blueprint's drop rows may be vendor/quest entries ("Cephalon Simaris,
 * Complete …" @100, "Vox Solaris, Agent") rather than farmable drops. Only
 * node-shaped ("Planet/Node (Type)") or bounty-shaped locations may turn the
 * bp part into a drop-sourced row. */
function isFarmDropLocation(loc: string): boolean {
	return parseDropLocation(loc) != null || /Bounty\)/.test(loc);
}
```

Then rework the component loop and parts mapping inside `buildOpenWorldFrames` (replacing the current `if (slot !== 'bp')` stage guard and the `if (slot === 'bp') return …` bare-part branch):

```ts
		const present = new Set<Slot>(['bp']);
		const stageBySlot = new Map<Slot, BountyStage | null>();
		for (const c of wf.components) {
			const slot = SLOT_BY_COMPONENT[c.name];
			if (!slot) continue;
			present.add(slot);
			const drops =
				slot === 'bp'
					? (c.drops ?? []).filter((d) => isFarmDropLocation(d.location))
					: (c.drops ?? []);
			stageBySlot.set(slot, bestBountyStage(drops));
		}
		// Per-run-rotation farms (Granum Void, Shrine Defense, mission-node
		// farms): the rotation letter parsed from drop locations is an in-run
		// rank/cadence, not the 150-min bounty cycle, so it's discarded; curated
		// tier labels replace it.
		const perRun = PER_RUN_ROTATION_FARMS[frameId];
		const parts: WarframePart[] = ORDER.filter((s) => present.has(s)).map((slot) => {
			const stage = stageBySlot.get(slot);
			// A bp without a farmable drop stays bare: the panel renders the
			// farm's bpSource label for it (quest/Market/vendor blueprints).
			if (slot === 'bp' && !stage) return { id: partId(frameId, slot), frameId, slot };
			return {
				id: partId(frameId, slot),
				frameId,
				slot,
				dropSourceNodeId: nodeId,
				chance: stage?.chance,
				bountyTier: perRun ? perRun[slot] : stage?.bountyTier,
				rotation: perRun ? undefined : stage?.rotation,
			};
		});
```

`parseDropLocation` is already imported in build.ts.

- [ ] **Step 4: Run the full script test suite**

Run: `pnpm vitest run scripts/data/`
Expected: PASS — including the pre-existing "nothing on the bp part" (Gara) and Protea/Koumei per-run tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/data/build.ts scripts/data/build.test.ts
git commit -m "feat(data): drop-sourced blueprints in buildOpenWorldFrames"
```

---

### Task 3: Panel rendering for drop-sourced blueprints

**Files:**
- Modify: `src/lib/panel/RegionPanel.svelte` (`owSourceText` ~line 64, `owAvailabilityChip` ~line 109)
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**
- Consumes: Task 2's contract — drop-sourced bp parts carry `dropSourceNodeId`; bare bp parts don't.

**IMPORTANT:** `.svelte` edits must go through the svelte skill/agent and be checked with the svelte MCP autofixer.

- [ ] **Step 1: Write the failing test**

Add to `RegionPanel.svelte.test.ts`, inside the open-world describe block (reuse the `createTracker`/`render`/`screen` harness used by the "labels a mission-farm zone" test; the fixture mirrors that test's shape):

```ts
	it('renders a drop-sourced blueprint like a component row, not the bpSource label', () => {
		const mirror: Dataset = {
			regions: [
				{
					id: 'mars',
					name: 'Mars',
					kind: 'planet',
					progressionOrder: 4,
					factions: ['Grineer'],
					nodeIds: ['tyanapass'],
					spoilerGated: false,
					resourceIds: [],
				},
			],
			nodes: [
				{
					id: 'tyanapass',
					regionId: 'mars',
					name: 'Tyana Pass',
					missionType: 'Mirror Defense',
					faction: 'Crossfire',
					isAssassination: false,
				},
			],
			bosses: [],
			warframes: [
				{
					id: 'citrine',
					name: 'Citrine',
					nodeId: 'tyanapass',
					parts: [
						{
							id: 'citrine:bp',
							frameId: 'citrine',
							slot: 'bp',
							dropSourceNodeId: 'tyanapass',
							chance: 9.3,
							bountyTier: 'Rotation C',
						},
						{
							id: 'citrine:systems',
							frameId: 'citrine',
							slot: 'systems',
							dropSourceNodeId: 'tyanapass',
							chance: 6.1,
							bountyTier: 'Rotation C',
						},
					],
				},
			],
			resources: [],
			quests: [],
			openWorldFarms: [
				{
					frameId: 'citrine',
					nodeId: 'tyanapass',
					regionId: 'mars',
					componentSource: 'Mirror Defense',
					bpSource: 'Mirror Defense drop (Rot C)',
				},
			],
		};
		const tracker = createTracker(mirror.warframes);
		render(RegionPanel, { dataset: mirror, regionId: 'mars', tracker });
		const bpRow = document.querySelector('[data-part="citrine:bp"]') as HTMLElement;
		expect(bpRow.textContent).toMatch(/Mirror Defense · Rotation C · 9\.3%/);
		expect(bpRow.textContent).not.toMatch(/drop \(Rot C\)/);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/panel/RegionPanel.svelte.test.ts`
Expected: the new test FAILS (bp row shows `Mirror Defense drop (Rot C)` via bpSource).

- [ ] **Step 3: Implement (via svelte skill)**

In `owSourceText`, only bare blueprints fall back to the farm label (mirrors `assassinationSourceText`'s guard):

```ts
	function owSourceText(part: WarframePart, farm: OpenWorldFarm): string {
		if (part.slot === 'bp' && !part.dropSourceNodeId) return farm.bpSource;
		…(rest unchanged)
	}
```

Update its preceding comment to say "a bare bp shows its bpSource; a drop-sourced bp (Citrine, Dante, Voruna, Gyre) and components show …".

In `owAvailabilityChip`, let a drop-sourced bp get the same chip treatment as components:

```ts
		if (!worldState || (part.slot === 'bp' && !part.dropSourceNodeId)) return null;
```

Update its comment's "(bp slot, …)" to "(bare bp slot, …)".

- [ ] **Step 4: Run panel tests, validate with svelte autofixer**

Run: `pnpm vitest run src/lib/panel/`
Expected: PASS. Then run the svelte MCP autofixer on `RegionPanel.svelte` and confirm no issues.

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/RegionPanel.svelte src/lib/panel/RegionPanel.svelte.test.ts
git commit -m "feat(panel): render drop-sourced open-world blueprints as drop rows"
```

---

### Task 4: Frame glyphs

**Files:**
- Modify: `scripts/fetch-frame-glyphs.sh`
- Create (generated): `static/frames/{citrine,dante,gauss,voruna,nidus,jade,gyre}.webp`

- [ ] **Step 1: Add the seven `dl` lines** (flat calls — the script deliberately avoids loops):

```bash
dl citrine.webp CitrineGlyph-Dark.png
dl dante.webp DanteGlyph-Dark.png
dl gauss.webp GaussGlyph-Dark.png
dl voruna.webp VorunaGlyph-Dark.png
dl nidus.webp NidusGlyph-Dark.png
dl jade.webp JadeGlyph-Dark.png
dl gyre.webp GyreGlyph-Dark.png
```

- [ ] **Step 2: Run the script**

Run: `bash scripts/fetch-frame-glyphs.sh`
Expected: `ok <frame>.webp` for every line (existing frames re-fetch too — that's fine, output is deterministic 96×96 webp). If a wiki filename 404s, check the exact glyph filename at `https://wiki.warframe.com/w/<Frame>` (convention: `<Frame>Glyph-Dark.png`) and fix the line rather than skipping the frame.

- [ ] **Step 3: Verify assets**

Run: `ls -la static/frames/ | grep -E "citrine|dante|gauss|voruna|nidus|jade|gyre"`
Expected: seven non-empty `.webp` files. Confirm `git status` shows only the seven new files (re-fetched existing glyphs should be byte-identical; restore them if not: `git checkout -- static/frames/<unchanged>.webp`).

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-frame-glyphs.sh static/frames/citrine.webp static/frames/dante.webp static/frames/gauss.webp static/frames/voruna.webp static/frames/nidus.webp static/frames/jade.webp static/frames/gyre.webp
git commit -m "feat(assets): Dark glyphs for the seven mission-node frames"
```

---

### Task 5: Dataset rebuild + integrity assertions

**Files:**
- Modify (generated): `static/data/dataset.json`
- Modify: `src/lib/data/dataset.test.ts` (only if it asserts frame counts/names — check first)

- [ ] **Step 1: Rebuild**

Run: `pnpm data:build`
Expected: completes without validation problems (`validateDataset` runs in the build script).

- [ ] **Step 2: Spot-check the dataset**

```bash
node -e "
const d = JSON.parse(require('fs').readFileSync('static/data/dataset.json')).data;
const f = Object.fromEntries(d.warframes.map(w=>[w.id,w]));
console.log('total frames:', d.warframes.length); // expect 32
for (const id of ['citrine','dante','gauss','voruna','nidus','jade','gyre'])
  console.log(id, f[id].nodeId, JSON.stringify(f[id].parts.map(p=>[p.slot,p.chance,p.bountyTier,p.rotation])));
"
```

Expected against the spec table: citrine bp 9.3/`Rotation C`, parts 6.1; dante bp 7.5, parts 5; gauss parts 7.84 (bp bare); voruna nodeId `SolNode310`, bp 12.24, parts 8.16; nidus parts 14.29 (bp bare); jade parts 4.63 with no bountyTier/rotation; gyre bp 12.99/`L90–95`/rot `C`, parts with per-tier chances and live rotation `C`. Also confirm Koumei's bp is now drop-sourced (4.09) — an expected improvement.

- [ ] **Step 3: Run the full unit suite; fix any count-assertion drift**

Run: `pnpm test:unit`
Expected: PASS after updating any tests that assert the old 25-frame roster (check `src/lib/data/dataset.test.ts` and `e2e`-adjacent fixtures; `seed.test.ts` uses its own seed data and should be untouched).

- [ ] **Step 4: Commit**

```bash
git add static/data/dataset.json src/lib/data/dataset.test.ts
git commit -m "feat(frames): add Citrine, Dante, Gauss, Voruna, Nidus, Jade, Gyre to the dataset"
```

---

### Task 6: E2E coverage

**Files:**
- Modify: `e2e/completeness.test.ts`

- [ ] **Step 1: Add the test** (pattern: the existing "Protea and Koumei render as mission farms" test; Mars and Uranus are ungated so no quest toggles needed):

```ts
test('Citrine and Jade render as mission-node farms on Mars and Uranus', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('svg').getByText('MARS')).toBeVisible();

	// Citrine: Tyana Pass Mirror Defense; drop-sourced blueprint renders as a
	// drop row (static Rotation C label, no live rotation chip).
	await page.locator('svg [data-region="mars"]').click();
	await expect(page.locator('[data-part="citrine:bp"]')).toBeVisible();
	await expect(page.getByText(/Mirror Defense · Rotation C · 9\.3%/)).toBeVisible();

	// Jade: Brutus Ascension — flat chance, no rotation labels at all.
	await page.locator('svg [data-region="uranus"]').click();
	await expect(page.locator('[data-part="jade:systems"]')).toBeVisible();
	await expect(page.getByText('Blueprint: Complete Jade Shadows or 450 Vestigial Motes')).toBeVisible();
});
```

- [ ] **Step 2: Run e2e**

Run: `pnpm test:e2e`
Expected: all pass, including the new test. If an existing completeness test asserts region frame counts, update it for the new roster.

- [ ] **Step 3: Commit**

```bash
git add e2e/completeness.test.ts
git commit -m "test(e2e): cover mission-node frame cards (Citrine, Jade)"
```

---

### Task 7: Gates + PR

- [ ] **Step 1: Format & lint (mandatory pre-PR — see memory `pre-pr-format-lint`)**

Run: `pnpm format && pnpm lint && pnpm test:unit && pnpm test:e2e`
Expected: clean; commit any formatter output:

```bash
git add -A && git commit -m "style: format" || true
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feat/mission-node-frames
gh pr create --title "feat(frames): add seven mission-node frames (Citrine, Dante, Gauss, Voruna, Nidus, Jade, Gyre)" --body "$(cat <<'EOF'
## Summary
- Adds the last seven non-Prime frames farmable at trackable star-chart nodes: Citrine (Tyana Pass), Dante (Armatus), Gauss (Kappa), Voruna (Circulus), Nidus (Oestrus), Jade (Brutus), Gyre (Chrysalith/Zariman bounties) — all via the curated-farm path with real SolNodes.
- `buildOpenWorldFrames` now emits drop-sourced `bp` parts when a main blueprint drops at the farm (Citrine, Dante, Voruna, Gyre — and retroactively Koumei), guarded so vendor/quest rows (Cephalon Simaris @100%) never become fake drops.
- Mission-farm "Rotation C" is the in-mission AABC cadence, so those farms use static `PER_RUN_ROTATION_FARMS` labels; Gyre's bounty rotations stay live.
- Seven new Dark glyphs.

Spec: docs/superpowers/specs/2026-07-24-mission-node-frames-design.md

## Test plan
- [ ] Unit: scripts/data + panel suites (new bp-drop, per-run, farm-entry tests)
- [ ] E2E: completeness (Citrine on Mars, Jade on Uranus)
- [ ] Dataset spot-check against verified wiki chances
EOF
)"
```

---

## Self-Review Notes

- Spec coverage: farms/labels (T1), bp-drop builder (T2), panel rendering (T3), glyphs (T4), dataset+tests (T5), e2e (T6) — all spec sections mapped.
- Voruna single-entry decision is encoded in T1 (only `SolNode310`); `bestBountyStage` picks Circulus over Yuvarium by chance, asserted via the T5 spot-check (bp 12.24 = Circulus).
- Type consistency: `isFarmDropLocation` defined and used only in T2; `PER_RUN_ROTATION_FARMS[frameId][slot]` shape unchanged from the existing `Partial<Record<Slot, string>>`.
