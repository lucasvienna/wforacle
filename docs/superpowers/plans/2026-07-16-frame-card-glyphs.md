# Frame Card Glyphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the initial-letter placeholder in frame drop cards with the frame's Dark glyph from the wiki, with the letter kept as load-failure fallback.

**Architecture:** Mirror the existing resource-icon pattern: a one-shot shell script downloads all 23 Dark glyphs from `wiki.warframe.com`, converts them to 96×96 webp committed under `static/frames/<id>.webp`; `FrameCard.svelte` renders them via `asset('/frames/${frame.id}.webp')` with an `onerror` fallback to today's gradient + initial letter.

**Tech Stack:** SvelteKit (Svelte 5 runes), Tailwind, vitest + @testing-library/svelte, bash + curl + ImageMagick `convert` (script only).

**Spec:** `docs/superpowers/specs/2026-07-16-frame-card-glyphs-design.md`

## Global Constraints

- No new runtime dependencies. The fetch script needs `curl` and ImageMagick `convert` locally, same as `scripts/fetch-resource-images.sh`.
- Glyph source URLs: `https://wiki.warframe.com/images/<Frame>Glyph-Dark.png`, `<Frame>` = capitalized frame id (verified for all 23 on 2026-07-16).
- Output icons: 96×96 webp in `static/frames/`, filename `<frameId>.webp`.
- No dataset or model changes.
- Before opening a PR: run `pnpm format` and `pnpm lint` and commit the result.
- The header tile stays `aria-hidden="true"`; the img gets `alt=""`.

---

### Task 1: Fetch script + committed glyph assets

**Files:**

- Create: `scripts/fetch-frame-glyphs.sh`
- Create (generated): `static/frames/*.webp` (23 files)

**Interfaces:**

- Produces: `static/frames/<frameId>.webp` for every frame id in `static/data/dataset.json` (`atlas`, `ember`, `equinox`, `excalibur`, `frost`, `hydroid`, `loki`, `mag`, `mesa`, `nekros`, `nova`, `rhino`, `saryn`, `trinity`, `valkyr`, `wisp`, `gara`, `revenant`, `caliban`, `garuda`, `hildryn`, `xaku`, `qorvex`). Task 2's component resolves `asset('/frames/${frame.id}.webp')` against these.

No unit test — this is an asset-generation task; verification is the file count + format check below.

- [ ] **Step 1: Write the script**

Create `scripts/fetch-frame-glyphs.sh`:

```bash
#!/usr/bin/env bash
# Downloads + optimizes the Dark frame glyphs from the wiki into
# static/frames/<frameId>.webp, which FrameCard references at runtime
# (`asset('/frames/${frame.id}.webp')`).
#
# Wiki filename is the capitalized frame id for every tracked frame —
# including hildryn/xaku, whose dataset `image` fields differ.
#
# Deliberately NOT a for/while loop: this shell loses $PATH resolution for
# curl/convert inside loop constructs (see fetch-resource-images.sh), so each
# frame gets its own flat `dl` call instead.
set -e
mkdir -p static/frames
U="wforacle"
B="https://wiki.warframe.com/images"
dl() { curl -sL -A "$U" -o "/tmp/glyph-$1" "$B/$2" && convert "/tmp/glyph-$1" -resize 96x96 -strip "static/frames/$1" && echo "ok $1"; }

dl atlas.webp AtlasGlyph-Dark.png
dl ember.webp EmberGlyph-Dark.png
dl equinox.webp EquinoxGlyph-Dark.png
dl excalibur.webp ExcaliburGlyph-Dark.png
dl frost.webp FrostGlyph-Dark.png
dl hydroid.webp HydroidGlyph-Dark.png
dl loki.webp LokiGlyph-Dark.png
dl mag.webp MagGlyph-Dark.png
dl mesa.webp MesaGlyph-Dark.png
dl nekros.webp NekrosGlyph-Dark.png
dl nova.webp NovaGlyph-Dark.png
dl rhino.webp RhinoGlyph-Dark.png
dl saryn.webp SarynGlyph-Dark.png
dl trinity.webp TrinityGlyph-Dark.png
dl valkyr.webp ValkyrGlyph-Dark.png
dl wisp.webp WispGlyph-Dark.png
dl gara.webp GaraGlyph-Dark.png
dl revenant.webp RevenantGlyph-Dark.png
dl caliban.webp CalibanGlyph-Dark.png
dl garuda.webp GarudaGlyph-Dark.png
dl hildryn.webp HildrynGlyph-Dark.png
dl xaku.webp XakuGlyph-Dark.png
dl qorvex.webp QorvexGlyph-Dark.png
```

- [ ] **Step 2: Make it executable and run it**

Run: `chmod +x scripts/fetch-frame-glyphs.sh && ./scripts/fetch-frame-glyphs.sh`
Expected: 23 lines of `ok <id>.webp`, no errors.

- [ ] **Step 3: Verify the output**

Run: `ls static/frames | wc -l && identify static/frames/rhino.webp`
Expected: `23`, and identify reports `WEBP 96x96`.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-frame-glyphs.sh static/frames
git commit -m "feat(assets): fetch Dark frame glyphs from the wiki"
```

---

### Task 2: FrameCard renders the glyph with letter fallback

**Files:**

- Modify: `src/lib/panel/FrameCard.svelte` (script block + header tile, currently lines 100–105)
- Test: `src/lib/panel/FrameCard.svelte.test.ts`

**Interfaces:**

- Consumes: `static/frames/<frameId>.webp` from Task 1; `asset` from `$app/paths` (already used by `ResourceRail.svelte`, works in vitest without mocking).
- Produces: no new exports — visual change inside `FrameCard` only.

- [ ] **Step 1: Write the failing tests**

Add to the first `describe('FrameCard', ...)` block in `src/lib/panel/FrameCard.svelte.test.ts`:

```ts
it('renders the frame glyph in the header tile', () => {
	render(FrameCard, props(undefined, { defaultExpanded: true }));
	const img = document.querySelector('[data-frame="rhino"] img');
	expect(img).toBeInTheDocument();
	expect(img?.getAttribute('src')).toContain('/frames/rhino.webp');
	expect(img).toHaveAttribute('alt', '');
});

it('falls back to the initial letter when the glyph fails to load', async () => {
	render(FrameCard, props(undefined, { defaultExpanded: true }));
	const img = document.querySelector('[data-frame="rhino"] img') as HTMLImageElement;
	img.dispatchEvent(new Event('error'));
	await tick();
	expect(document.querySelector('[data-frame="rhino"] img')).toBeNull();
	expect(screen.getByText('R')).toBeInTheDocument();
});
```

(`tick` and `screen` are already imported at the top of the file.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit --run src/lib/panel/FrameCard.svelte.test.ts`
Expected: the two new tests FAIL (no `img` in the tile yet); all existing tests PASS.

- [ ] **Step 3: Implement the glyph tile**

In `src/lib/panel/FrameCard.svelte`:

Add to the imports at the top of the script block:

```ts
import { asset } from '$app/paths';
```

Add next to the other state declarations (after the `expanded` state):

```ts
// Wiki glyphs are committed to static/frames/<id>.webp; if one is missing
// or fails to load, fall back to the initial-letter tile.
let iconFailed = $state(false);
```

Replace the header tile (the `div` currently rendering `{frame.name[0]}`):

```svelte
<div
	class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-wf-edge bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold text-slate-300"
	aria-hidden="true"
>
	{#if iconFailed}
		{frame.name[0]}
	{:else}
		<img
			src={asset(`/frames/${frame.id}.webp`)}
			alt=""
			loading="lazy"
			class="h-full w-full object-cover"
			onerror={() => (iconFailed = true)}
		/>
	{/if}
</div>
```

Note: the only class change on the container is adding `overflow-hidden` (clips the square image to the rounded corners); the gradient stays as the loading backdrop and fallback surface.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/panel/FrameCard.svelte.test.ts`
Expected: all tests PASS, including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/panel/FrameCard.svelte src/lib/panel/FrameCard.svelte.test.ts
git commit -m "feat(panel): show Dark frame glyphs on drop cards, letter fallback"
```

---

### Task 3: Full verification + format/lint

**Files:**

- Modify: none expected (format/lint may touch the two files from Task 2).

**Interfaces:**

- Consumes: everything above.
- Produces: a branch ready for PR.

- [ ] **Step 1: Run the full unit suite**

Run: `pnpm test:unit --run`
Expected: all tests PASS.

- [ ] **Step 2: Run e2e**

Run: `pnpm test:e2e`
Expected: all tests PASS (glyphs exist in `static/frames`, so no 404s).

- [ ] **Step 3: Format and lint**

Run: `pnpm format && pnpm lint`
Expected: no lint errors; commit any formatting changes:

```bash
git add -A && git diff --cached --quiet || git commit -m "style: format"
```

- [ ] **Step 4: Browser check**

Start `pnpm dev`, open a region with frame cards (e.g. Fossa/Venus), confirm the glyph renders in the tile. If the shell looks stale, unregister the dev service worker and clear caches first (known dev quirk — see `docs`/memory note). Also temporarily rename one webp locally to confirm the letter fallback appears, then restore it.
