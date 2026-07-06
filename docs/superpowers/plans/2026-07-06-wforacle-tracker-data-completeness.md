# wforacle Tracker Data Completeness (Plan 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining data gaps in the tracker — make the three currently-unbuildable frames (Equinox, Mesa, Atlas) trackable, and populate the Lua / Kuva Fortress / Zariman resource cards.

**Architecture:** Two independent workstreams over the existing curated pipeline. (A) Frames: extend the `Slot` model with Equinox's Day/Night Aspect, generalize `buildFrames` to derive a frame's parts from its actual components (instead of a hardcoded 4-slot list), and curate two key-boss pseudo-nodes on Eris (Mutalist Alad V, Jordas Golem) so Mesa/Atlas link. (B) Resources: add 4 new curated resources (Somatic Fibers, Kuva, Voidgel Orb, Entrati Lanthorn) + `PLANET_RESOURCES` entries for the three special regions + recs + icons + guides. Both end by regenerating `static/data/dataset.json`.

**Tech Stack:** TypeScript, Svelte 5 runes, `@wfcd/items` + `warframe-worldstate-data`, Vitest, Playwright.

## Global Constraints

- **Additive types.** `Slot` gains `'dayaspect' | 'nightaspect'`. Existing frames keep exactly `bp/neuroptics/chassis/systems`. No existing test may break; `partId(frameId, slot)` stays `\`${frameId}:${slot}\``.
- **Frames are derived, not hardcoded.** A frame's parts = `'bp'` plus the slots its components actually map to (via `SLOT_BY_COMPONENT`), in a fixed display order. Standard frames still yield 4 parts; Equinox yields 3 (`bp`, `dayaspect`, `nightaspect`).
- **Key-gated ≠ spoiler-gated.** Mesa/Atlas's Eris key-boss nodes are always visible (Eris is a normal planet); they are NOT `spoilerGated`. A light "· key" hint in the UI is optional polish, not a gate.
- **Curated vs machine.** Frame component→slot mapping, key-boss pseudo-nodes, boss names, resource→planet maps, recs, and guides are curated; resource `image`/frame data come from `@wfcd/items` by name.
- **Verified data (use verbatim):**
  - Equinox → node `Titania (Uranus)` (SolNode105, Grineer, Assassination), boss **Tyl Regor**; components **Day Aspect** (Rotation A, 22.56%) and **Night Aspect** (Rotation B, 22.56%) both `Uranus/Titania (Assassination)`; Blueprint = Market.
  - Mesa → `Mutalist Alad V Assassinate` (key mission, Eris, Infested), boss **Mutalist Alad V**; Chassis/Neuroptics 38.72%, Systems 22.56%.
  - Atlas → `Jordas Golem Assassinate` (key mission, Eris, Infested), boss **Jordas Golem**; Chassis/Neuroptics 38.72%, Systems 22.56%; Blueprint = Cephalon Simaris (treat as Market/quest — bp slot, no node).
  - New resources (name → `@wfcd/items` imageName): **Somatic Fibers** → `MemoryCryptoFragment.png`; **Kuva** → `Kuva.png`; **Voidgel Orb** → `ZarimanMiscItemA.png`; **Entrati Lanthorn** → `ZarimanMiscItemB.png`.
  - `PLANET_RESOURCES` additions (region slug → resource ids; existing ids reused where possible):
    - `lua: [neurodes, ferrite, rubedo, detoniteampule, somaticfibers]`
    - `kuvafortress: [salvage, circuits, neuralsensors, detoniteampule, tellurium, kuva]`
    - `zariman: [voidgelorb, entratilanthorn]`
- pnpm; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD, signed commits (`git commit -S -s`), `pnpm lint` clean, `format:check` green. Do NOT run `pnpm format` repo-wide (regenerated `dataset.json` is oxfmt-ignored; format only the files you touch).

---

### Task 1: Extend the Slot model with Day/Night Aspect

**Files:**

- Modify: `src/lib/model/types.ts` (`Slot` union)
- Modify: `scripts/data/build.ts` (`SLOT_BY_COMPONENT`)
- Modify: `src/lib/panel/RegionPanel.svelte` (`SLOT_LABEL`)
- Test: `src/lib/model/completion.test.ts` (or the nearest existing completion test)

**Interfaces:**

- Produces: `Slot = 'bp' | 'neuroptics' | 'chassis' | 'systems' | 'dayaspect' | 'nightaspect'`.
- `SLOT_BY_COMPONENT` gains `'Day Aspect': 'dayaspect'`, `'Night Aspect': 'nightaspect'`.
- `SLOT_LABEL` (RegionPanel) gains `dayaspect: 'Day Aspect'`, `nightaspect: 'Night Aspect'`.

- [ ] **Step 1: Write/extend a failing test** — assert `partId('equinox', 'dayaspect') === 'equinox:dayaspect'` and that a `WarframePart` with `slot: 'nightaspect'` type-checks. If no completion test exists, add `src/lib/model/completion.test.ts` importing `partId`.
- [ ] **Step 2: Run — expect FAIL/type error** (`pnpm vitest run src/lib/model/completion.test.ts`).
- [ ] **Step 3: Implement** — widen `Slot`; add the two `SLOT_BY_COMPONENT` entries; add the two `SLOT_LABEL` entries.
- [ ] **Step 4: Run — expect PASS**; `pnpm exec svelte-check` shows no new source errors (RegionPanel `SLOT_LABEL[part.slot]` now total over the widened union).
- [ ] **Step 5: Commit** — `feat: add Day/Night Aspect to the Slot model`.

---

### Task 2: Derive frame parts from actual components (Equinox links)

**Files:**

- Modify: `scripts/data/build.ts` (`buildFrames`)
- Test: `scripts/data/build.test.ts`

**Interfaces:**

- Consumes: `SLOT_BY_COMPONENT` (Task 1).
- Produces: `buildFrames` builds each frame's `parts` from the slots present in its components — always include `'bp'`, then every slot any component maps to — emitted in the canonical order `['bp','neuroptics','chassis','systems','dayaspect','nightaspect']` filtered to those present. Standard frames are unchanged (still `bp/neuroptics/chassis/systems`); Equinox yields `bp/dayaspect/nightaspect`. Node link + `chanceBySlot` still come only from non-bp component Assassination drops (unchanged).

- [ ] **Step 1: Extend fixtures** — add an Equinox entry to `scripts/data/fixtures/warframes.sample.json` (Blueprint no drops; `Day Aspect` and `Night Aspect` each dropping `Uranus/Titania (Assassination)` at 22.56) and a `Titania (Uranus)` Assassination node to the inline solNodes of a NEW `build.test.ts` describe block (do NOT touch `solNodes.sample.json` — its exact-equality assertions must hold). Add `[slugify('Titania')]: 'Tyl Regor'` to `curated.ts` `BOSS_BY_NODE`.
- [ ] **Step 2: Write the failing test** — in the new block, assert `buildFrames(equinoxWarframes, buildNodes(uranusNodes))` links `equinox` with `nodeId` = the Titania node and `parts` slugs exactly `['equinox:bp','equinox:dayaspect','equinox:nightaspect']` (bp `dropSourceNodeId` undefined; aspects' set); and that a standard frame in the same run still yields 4 parts (guard the generalization).
- [ ] **Step 3: Run — expect FAIL**.
- [ ] **Step 4: Implement** — in `buildFrames`, replace the hardcoded `['bp','neuroptics','chassis','systems']` with: collect `present = new Set<Slot>(['bp'])`; for each component whose `SLOT_BY_COMPONENT[c.name]` is defined, add that slot; then `const ORDER: Slot[] = ['bp','neuroptics','chassis','systems','dayaspect','nightaspect']; const parts = ORDER.filter((s) => present.has(s)).map((slot) => ({...}))`. Keep the existing node-link/`chanceBySlot` logic and the "no node → skip frame" guard.
- [ ] **Step 5: Run — expect PASS** (`pnpm test:unit --run`; existing Rhino/Mesa 4-part assertions must stay green).
- [ ] **Step 6: Commit** — `feat(pipeline): derive frame parts from components; link Equinox`.

---

### Task 3: Curated Eris key-boss nodes (Mesa, Atlas link)

**Files:**

- Modify: `scripts/data/curated.ts` (key-boss pseudo-nodes + drop-loc map + bosses)
- Modify: `scripts/data/build.ts` (merge pseudo-nodes; resolve non-standard drop locations)
- Test: `scripts/data/build.test.ts`

**Interfaces:**

- Produces:
  - `curated.ts`: `KEY_BOSS_SOLNODES: SolNodes` — `{ CuratedMutalistAladV: { value: 'Mutalist Alad V (Eris)', enemy: 'Infested', type: 'Assassination' }, CuratedJordasGolem: { value: 'Jordas Golem (Eris)', enemy: 'Infested', type: 'Assassination' } }`. `KEY_BOSS_DROP_LOCATIONS: Record<string, { planet: string; node: string; type: string }>` mapping the raw WFCD strings `'Mutalist Alad V Assassinate'` → `{ planet: 'Eris', node: 'Mutalist Alad V', type: 'Assassination' }` and `'Jordas Golem Assassinate'` → `{ planet: 'Eris', node: 'Jordas Golem', type: 'Assassination' }`. `BOSS_BY_NODE` gains `[slugify('Mutalist Alad V')]: 'Mutalist Alad V'`, `[slugify('Jordas Golem')]: 'Jordas Golem'`.
  - `build.ts`: `buildNodes` merges `KEY_BOSS_SOLNODES` into the input (so Eris gets the two Assassination nodes). A `resolveDropLocation(loc)` helper tries `parseDropLocation(loc)` first, then `KEY_BOSS_DROP_LOCATIONS[loc.split(',')[0].trim()]` (the WFCD strings carry a trailing `, Rotation C`); `buildFrames` uses it in place of the bare `parseDropLocation`.

- [ ] **Step 1: Write the failing test** — new `build.test.ts` block: inline warframes for Mesa (`Chassis/Neuroptics @38.72`, `Systems @22.56`, each `location: 'Mutalist Alad V Assassinate, Rotation C'`) + Atlas (`'Jordas Golem Assassinate, Rotation C'`). Assert `buildRegions(erisSolNodes)` (with `KEY_BOSS_SOLNODES` merged) includes an `eris` region whose `nodeIds` contain the two curated nodes, and `buildFrames(...)` links `mesa`→Mutalist Alad V node and `atlas`→Jordas Golem node, each with 4 parts and a boss (`Mutalist Alad V` / `Jordas Golem`).
- [ ] **Step 2: Run — expect FAIL**.
- [ ] **Step 3: Implement** the curated data + `resolveDropLocation` + node merge. (`buildNodes` should merge `KEY_BOSS_SOLNODES` unconditionally, since Eris is always built.)
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`; existing frame tests stay green — the extra fallback only triggers for unparseable strings).
- [ ] **Step 5: Commit** — `feat(pipeline): curate Eris key-boss nodes; link Mesa & Atlas`.

---

### Task 4: Regenerate dataset with the three frames

**Files:**

- Modify: `static/data/dataset.json` (regenerated)
- Modify: `scripts/build-data.ts` (frame-floor + sanity)

**Interfaces:** none (generation).

- [ ] **Step 1: Sanity** — in `build-data.ts` bump the node-linked-frame floor from 13 to **16** and reword the comment (Equinox now links via Day/Night Aspect at Uranus/Titania; Mesa/Atlas via curated Eris key-boss nodes; Nekros already in). Add `for (const id of ['equinox','mesa','atlas']) if (!data.warframes.some((f) => f.id === id)) { console.error(\`missing frame ${id}\`); process.exit(1); }`.
- [ ] **Step 2: Regenerate** — `pnpm data:build`. Verify: `node -e "const d=require('./static/data/dataset.json').data; const g=(id)=>{const f=d.warframes.find(x=>x.id===id); return f? f.parts.map(p=>p.slot).join('/')+' @'+d.nodes.find(n=>n.id===f.nodeId)?.name : 'MISSING'}; console.log('equinox',g('equinox')); console.log('mesa',g('mesa')); console.log('atlas',g('atlas')); console.log('frames',d.warframes.length)"` → equinox `bp/dayaspect/nightaspect @Titania`, mesa `bp/neuroptics/chassis/systems @Mutalist Alad V`, atlas `@Jordas Golem`, frames = 16.
- [ ] **Step 3: Run tests + commit** — `pnpm test:unit --run` green. Commit `static/data/dataset.json` + `scripts/build-data.ts`: `feat(data): regenerate with Equinox, Mesa, Atlas`.

---

### Task 5: Panel polish — aspect rows + key-boss hint

**Files:**

- Modify: `src/lib/panel/RegionPanel.svelte`
- Test: `src/lib/panel/RegionPanel.svelte.test.ts`

**Interfaces:**

- Consumes: the regenerated dataset shape (Equinox 3 parts; Mesa/Atlas nodes on Eris).
- Produces: RegionPanel renders any frame's parts generically (already does — confirm the widened `SLOT_LABEL` covers aspects, no fixed 4-row assumption). Add a subtle "· key" tag next to the Assassination tag when the boss is a key mission — derive from a small `KEY_BOSSES = new Set(['Mutalist Alad V','Jordas Golem'])` in the component (presentational only).

- [ ] **Step 1: Test** — extend `RegionPanel.svelte.test.ts` with an Equinox-shaped inline dataset (a Uranus region + Titania node + Equinox with `dayaspect/nightaspect` parts); assert `Day Aspect` and `Night Aspect` labels render and `[data-part="equinox:dayaspect"]` exists. Add a Mesa-shaped Eris fixture and assert the "key" hint renders for its node.
- [ ] **Step 2: Run — expect FAIL**; implement the `KEY_BOSSES` hint (validate with the Svelte MCP autofixer); **Run — expect PASS**.
- [ ] **Step 3: Commit** — `feat: render aspect parts and a key-mission hint in RegionPanel`.

---

### Task 6: Curated data for the 4 new resources

**Files:**

- Modify: `scripts/data/farming.ts` (`RESOURCES`, `PLANET_RESOURCES`, `RECOMMENDATIONS`)
- Test: `scripts/data/farming.test.ts`

**Interfaces:**

- Produces:
  - `RESOURCES` gains `{ id: slugify('Somatic Fibers'), name: 'Somatic Fibers' }`, `Kuva`, `Voidgel Orb`, `Entrati Lanthorn`.
  - `PLANET_RESOURCES` gains the `lua`/`kuvafortress`/`zariman` entries from Global Constraints.
  - `RECOMMENDATIONS` gains early+late for each of the 4 new ids, with `source` matching `wiki.warframe.com` and `lastVerified` `2026-07-06`. Suggested (verify wording against the wiki during authoring):
    - `somaticfibers`: early `Lua — Apollo (Disruption)` (Demolisher drops, `boostersApply: true`); late `Lua — Apollo (Disruption, Steel Path)`.
    - `kuva`: early `Kuva Fortress — Taveuni (Survival, Kuva Harvester)` (`boostersApply: false` — fixed 200/harvester, not a booster-affected drop); late `Kuva Fortress — Taveuni (Survival, Steel Path)` with a note that Kuva Siphons/Floods (Requiem fissures) are the broader endgame source.
    - `voidgelorb`: early `Zariman — Tuvul Commons (Void Cascade)` (region-resource reward ~9.76%, `boostersApply: true`); late Steel Path.
    - `entratilanthorn`: early `Zariman — Halako Perimeter (Extermination)` (mission reward ~9.76%, `boostersApply: true`); late `Deimos — Cambion Drift (bounties)` note that it also drops from Deimos/Zariman bounties.

- [ ] **Step 1: Write/extend the failing test** — the existing farming.test asserts every `RECOMMENDATIONS` id is a real resource with an early+late rec, `boostersApply` boolean, wiki source, ISO `lastVerified`; and `PLANET_RESOURCES` keys are valid region slugs mapping known resource ids. Confirm these now cover the 4 new ids + 3 new region keys (they will, generically) and add an explicit assertion that `RESOURCES` contains the 4 new names.
- [ ] **Step 2: Run — expect FAIL** (new ids not yet present).
- [ ] **Step 3: Implement** the `RESOURCES` / `PLANET_RESOURCES` / `RECOMMENDATIONS` additions.
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 5: Commit** — `feat(data): curate Somatic Fibers, Kuva, Voidgel Orb, Entrati Lanthorn`.

---

### Task 7: Icons + guides for the 4 new resources

**Files:**

- Modify: `scripts/fetch-resource-images.sh` (4 new `dl` lines)
- Create: `static/resources/{somaticfibers,kuva,voidgelorb,entratilanthorn}.webp`
- Create: `src/content/guides/{somaticfibers,kuva,voidgelorb,entratilanthorn}.svx`

**Interfaces:** none (assets + content).

- [ ] **Step 1: Icons** — add flat `dl` lines (NOT a loop — `$PATH` is lost inside shell loops here) to `fetch-resource-images.sh`: `dl somaticfibers.webp MemoryCryptoFragment.png`, `dl kuva.webp Kuva.png`, `dl voidgelorb.webp ZarimanMiscItemA.png`, `dl entratilanthorn.webp ZarimanMiscItemB.png`. Run the four `curl … | convert` commands (or `bash scripts/fetch-resource-images.sh`) so the 4 webp files exist at 64px. Verify each file is non-empty.
- [ ] **Step 2: Guides** — author `.svx` for each new resource following the existing `## Early game` / `## Mid & late game` / `## Sources` structure (see `src/content/guides/mutagensample.svx`), citing `https://wiki.warframe.com/w/<Resource>`. Keep them accurate to the recs from Task 6.
- [ ] **Step 3: Commit** — `feat(content): icons + guides for the new special-region resources`.

---

### Task 8: Regenerate dataset; verify special-region resource cards

**Files:**

- Modify: `static/data/dataset.json` (regenerated)
- Modify: `scripts/build-data.ts` (resource-floor bump)

**Interfaces:** none (generation).

- [ ] **Step 1: Sanity** — bump the `data.resources.length` floor in `build-data.ts` from 10 to a value ≤ the new count (e.g. keep `< 10` if the floor is just a lower bound; if it hardcodes 23, raise to 27) and reword the comment. Regenerate: `pnpm data:build`.
- [ ] **Step 2: Verify** — `node -e "const d=require('./static/data/dataset.json').data; for (const id of ['lua','kuvafortress','zariman']){const r=d.regions.find(x=>x.id===id); console.log(id, r.resourceIds.join(','))}; for (const id of ['somaticfibers','kuva','voidgelorb','entratilanthorn']){const r=d.resources.find(x=>x.id===id); console.log(id, 'img='+(r.image||'MISSING'), 'regions='+r.regionIds.join('/'), 'recs='+r.recommendations.map(x=>x.regionId).join('/'))}"` → each region lists its resources; each new resource has an image, correct regionIds, and recs resolving `regionId` to the special region (badges will show).
- [ ] **Step 3: Test + commit** — `pnpm test:unit --run` green; commit `static/data/dataset.json` + `scripts/build-data.ts`: `feat(data): regenerate with special-region resources`.

---

### Task 9: End-to-end — new frames + region resources

**Files:**

- Modify: `e2e/tracking.test.ts` or new `e2e/completeness.test.ts`

**Interfaces:** the running app.

- [ ] **Step 1: e2e test** — (a) select Uranus, assert Equinox renders with `[data-part="equinox:dayaspect"]` and `[data-part="equinox:nightaspect"]`, toggle one, reload, assert it persists. (b) Select Eris, assert Mesa (`[data-part="mesa:chassis"]`) and Atlas render with the "key" hint. (c) Toggle the relevant quests to reveal Lua/Kuva Fortress/Zariman, select each, and assert its Resources card shows a signature resource (`Somatic Fibers` / `Kuva` / `Voidgel Orb`).
- [ ] **Step 2: Run — expect PASS** (`pnpm exec playwright test`); `pnpm build` prerenders cleanly (all new guides too).
- [ ] **Step 3: Commit** — `test: e2e for Equinox/Mesa/Atlas and special-region resources`.

---

## Self-Review

**Spec coverage:**

- Equinox trackable (model extension + derived parts) → Tasks 1, 2, 4, 5, 9. ✅
- Mesa & Atlas trackable (curated Eris key-boss nodes) → Tasks 3, 4, 5, 9. ✅
- Lua/Kuva Fortress/Zariman resource cards (4 new resources + existing) → Tasks 6, 7, 8, 9. ✅
- Deferred (correctly out of scope): Primes/relics, weapons/Mastery, key-mission node modeling beyond Mesa/Atlas, Voidplume/Zarium/mods (currencies/mods, not crafting resources).

**Placeholder scan:** every code step carries concrete code or an exact contract; the one research-dependent spot (rec wording, Task 6) has verified nodes/values and a "verify against wiki" instruction. ✅

**Type consistency:** `Slot` union / `SLOT_BY_COMPONENT` / `SLOT_LABEL` / `partId` used consistently (Tasks 1–2, 5); `KEY_BOSS_SOLNODES` / `KEY_BOSS_DROP_LOCATIONS` / `resolveDropLocation` names stable (Task 3); resource ids (`somaticfibers`/`kuva`/`voidgelorb`/`entratilanthorn`) match between farming, icons, guides, and PLANET_RESOURCES (Tasks 6–8). ✅

**Note for executor:** confirm `slugify('Mutalist Alad V') === 'mutalistaladv'` and `slugify('Jordas Golem') === 'jordasgolem'` so `BOSS_BY_NODE` keys line up with the pseudo-node names; and that Kuva's `@wfcd/items` entry with an empty `imageName` doesn't win the image match (buildResources already prefers the first non-empty).
