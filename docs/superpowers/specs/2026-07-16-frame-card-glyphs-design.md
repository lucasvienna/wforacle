# Frame Card Glyphs

**Date:** 2026-07-16
**Status:** Approved

## Problem

Frame drop cards (`FrameCard.svelte`) show only the frame's initial letter in a
44×44 gradient tile. The wiki ships square avatar-style glyph art for every
frame that would make cards recognizable at a glance.

## Decision

Replace the initial-letter tile with the frame's **Dark glyph** from the wiki,
served as a locally committed webp — mirroring the existing resource/planet
icon pattern. The initial letter remains as the load-failure fallback.

## Artwork

- Source: `https://wiki.warframe.com/images/<Frame>Glyph-Dark.png`
- All 23 tracked frames resolve with `<Frame>` = capitalized frame `id`
  (verified 2026-07-16, including `Hildryn` and `Xaku`, whose dataset `image`
  fields differ: `IronFrame.png` / `BrokenFrame.png`).
- Glyphs are 256×256 **opaque** squares (dark navy background + frame bust),
  which blend with the app's dark theme — so the image fills the tile
  edge-to-edge rather than floating on the gradient.

## Design

### Asset pipeline

New `scripts/fetch-frame-glyphs.sh`, same shape as
`scripts/fetch-resource-images.sh` (flat `dl` calls, no loop — see that
script's PATH-resolution note):

- Downloads each glyph with the `wforacle` user agent.
- Converts to **96×96** webp (`convert ... -resize 96x96 -strip`) — displayed
  at 44px, crisp at 2× DPR.
- Output: `static/frames/<frameId>.webp`, committed to the repo.

The id → wiki-filename mapping lives only in the script (like resources).
**No dataset or model changes.**

### Component (`FrameCard.svelte`)

The header tile keeps its `h-11 w-11 shrink-0 rounded-lg border border-wf-edge`
shell and stays `aria-hidden` (the frame name sits beside it).

- Default: `<img src={asset('/frames/${frame.id}.webp')} alt="" loading="lazy"
class="h-full w-full rounded-[inherit] object-cover">`.
- `let iconFailed = $state(false)`; the img's `onerror` sets it.
- When `iconFailed`: render today's gradient + `{frame.name[0]}` letter
  (`bg-gradient-to-br from-slate-600 to-slate-900 text-lg font-bold
text-slate-300`).

Offline works for free: static assets are precached by the service worker,
same as resource icons.

### Testing

Extend `FrameCard.svelte.test.ts`:

1. Tile renders an `img` with src ending `/frames/<id>.webp`.
2. Dispatching `error` on the img swaps in the initial-letter fallback.

### Verification

- Run the fetch script; confirm 23 webp files in `static/frames/`.
- `pnpm test`, `pnpm lint`, `pnpm format`.
- Browser check of a region panel (unregister the dev service worker / clear
  caches if the shell looks stale — known dev quirk).

## Out of scope

- Bright glyph variants, alternate-helmet glyphs.
- Glyphs anywhere other than `FrameCard` (e.g. command palette, import view).
- Automated drift detection for newly added frames (script is re-run manually,
  same as resources).
