# 05 — Lighthouse Baseline & Results

Task 2.5. Owner goal (decision #5): **Lighthouse ≥ 97, mobile and desktop.**

Measured against the production build (`pnpm build && pnpm preview`, Wrangler on
:4173) with Lighthouse 12 driving Playwright's Chromium. Reproduce with:

```sh
pnpm build && pnpm preview &
./scripts/lighthouse.sh          # FLOOR=97 by default; exits 1 if any score is under
```

## Results

Four representative pages × two form factors × four categories.

| page                 | device  | perf         | a11y         | best-practices | SEO |
| -------------------- | ------- | ------------ | ------------ | -------------- | --- |
| `/`                  | mobile  | 79 → **100** | 100          | 100            | 100 |
| `/`                  | desktop | 80 → **100** | 100          | 100            | 100 |
| `/guides`            | mobile  | 100          | 100          | 96 → **100**   | 100 |
| `/guides`            | desktop | 100          | 100          | 96 → **100**   | 100 |
| `/guides/orokincell` | mobile  | 100          | 100          | 96 → **100**   | 100 |
| `/guides/orokincell` | desktop | 100          | 100          | 100            | 100 |
| `/guides/credits`    | mobile  | 100          | 95 → **100** | 96 → **100**   | 100 |
| `/guides/credits`    | desktop | 100          | 95 → **100** | 100            | 100 |

Core Web Vitals after: CLS 0.014 (home mobile) / 0.003 (credits mobile) / 0
elsewhere; LCP 1.4–1.5 s mobile, 0.3–0.4 s desktop; TBT 0 ms except home mobile
(40 ms).

**On run-to-run variance:** Lighthouse scores move by a point or two between
runs, especially on a loaded machine — home/mobile has been observed at both
100 and 99 with no code change between. Treat the table as "clears the 97 floor
with room to spare", not as an exact number to defend. `scripts/lighthouse.sh`
asserts the floor, not equality with 100, for this reason.

**Both halves of task 2.5's acceptance criteria are met: a documented baseline
table, and ≥ 97 on all four pages, mobile and desktop.**

## Before/after context

The baseline was taken _after_ task 2.1 (H3), which had already removed ~6 MB of
`data-sveltekit-fetched` replay blobs from the prerendered HTML. That fix is why
the three guide pages started at performance 100 — pre-2.1 they were serving
~218 KB of HTML each. The remaining work below is everything 2.1 did **not**
cover.

## What was actually wrong

### 1. Home page CLS 0.473 → 0.014 (performance 79 → 100)

The entire deficit was layout shift; LCP and TBT were already fine. `0.473` is
deep in Google's "poor" band (> 0.25).

Three causes, found with a `PerformanceObserver` on `layout-shift` reporting the
nodes that moved rather than by guessing:

- **The main slot** was a 384 px placeholder replaced by ~3,100 px of chart +
  panel, which shoved the prerendered "Browse the Star Chart" directory — and
  that directory starts _inside_ the viewport. Worth 0.45 on its own.
- **The world-state ticker** was gated on `{#if ws}`, so it inserted ~50 px
  mid-load and pushed everything below it down.
- **The header widgets** (parts readout, settings button) appear only after
  boot, growing the header row and nudging the page down another 4 px.

The fix for the first is the non-obvious one. Reserving the full loaded height
is not an option — 3,100 px of blank page — but it isn't necessary either:
**layout shift only counts elements visible in the viewport**, and newly
_inserted_ nodes don't count, only ones that _move_. One viewport of reserve
(`min-h-screen`) puts the directory below the fold before the swap, so its later
2,700 px journey is free.

The other two are dimension-matched placeholders: the ticker wrapper renders
unconditionally with a placeholder mirroring the component's own loading branch,
and the header reserves its widgets' space with a fixed-width, tabular-numerals
count slot so `0/48` and `12/48` cannot re-wrap the row.

### 2. `target-size` on the guide source lists (a11y 95 → 100)

Wiki source links were 16 px tall and 16.2 px apart, against a 24 px minimum —
genuinely fiddly to hit on a phone, not just an audit number. `space-y-1` plus
`inline-block py-1` fixes both size and spacing.

### 3. Resource icons (best-practices 96 → 100)

Two separate image audits:

- **`image-aspect-ratio`** — `affinity.webp` was 60×64 but always rendered
  square, so it was being subtly squashed.
- **`image-size-responsive`** — icons render at up to 48 CSS px (the guide page
  header) from a 64 px asset; Lighthouse wants ~1.5× that for high-DPI screens.

Both fixed by regenerating at **128 px square** via
`scripts/fetch-resource-images.sh`. This is a genuine downscale, not an upscale
that would only fool the audit — every upstream source is ≥ 310 px (most are
512×512). Total asset weight: 36 KB → 86 KB across 30 files.

Two incidental wins from doing it properly:

- `credits.webp` now comes from the wiki's 512 px `Credits.png` rather than the
  64 px `Credits64.png` derivative.
- `affinity.webp` was previously hand-made and **unreproducible by the script**,
  so a re-run silently dropped it — audit finding **D2**. It is now built like
  everything else, padded from its 310×333 source to a square canvas. The script
  can now reproduce every asset it ships.

## Why Lighthouse isn't in CI

`scripts/lighthouse.sh` runs Lighthouse through `pnpm dlx` rather than adding a
devDependency: it pulls ~200 packages and is only run by hand, so it shouldn't
be paid for on every `pnpm install`. LH runs are also slow (~90 s) and noisy on
shared CI runners, which makes them a poor gate.

The regression class that actually matters here — a route reverting to a
universal load and re-embedding the dataset — is caught far more cheaply by
`scripts/check-page-size.ts`, which _does_ run in CI on every build (task 2.6).
