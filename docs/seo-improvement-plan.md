# wforacle — SEO Audit & Improvement Plan

**Site:** https://wforacle.avyiel.dev — fan-made Warframe Star Chart & resource-farming tracker
**Stack:** SvelteKit + `adapter-cloudflare`, fully prerendered, Tailwind v4, mdsvex guides
**Audited:** 2026-07-13 (live site + source)

---

## Executive Summary

The site is technically healthy (HTTPS, fast static hosting on Cloudflare, mobile-responsive, clean URLs) but is **effectively invisible to search engines and AI answer-engines** because it ships **no page metadata whatsoever** and its highest-value page — the homepage — renders its content client-side only.

**Overall health: 4/10** — sound foundation, near-zero on-page SEO.

### Top 5 priorities

1. **Add `<title>` + meta description to every route** (currently none exist site-wide). — _Critical, ~1h_
2. **Fix the homepage: give it real server-rendered content + an `<h1>`** (today it's a "Loading Star Chart…" shell). — _High_
3. **Generate `sitemap.xml`** (currently 404) and reference it from `robots.txt`. — _High, ~1h_
4. **Add Open Graph / Twitter Card tags + a real OG image** (and replace the default Svelte-logo favicon). — _High_
5. **Add JSON-LD structured data** — `WebApplication` on home, `HowTo`/`Article` + `BreadcrumbList` on guides. — _Medium_

### The strategic opportunity

The 25 prerendered `/guides/[resource]` pages are the real organic play. They target high-intent long-tail queries — _"warframe neurodes farm"_, _"where to farm oxium"_, _"best rubedo farm 2026"_ — that players search constantly. The content is genuinely good (sourced from the wiki, "verified" dates, early/late-game splits), which is exactly what Google's helpful-content and AI answer-engines reward. **They just need metadata and internal linking to get discovered and ranked.**

---

## What's already good (keep it)

- **HTTPS** everywhere, valid cert, Cloudflare CDN, sub-second TTFB.
- **Clean, readable URLs:** `/guides/neurodes` — keyword-rich, lowercase, no params.
- **Guide pages are prerendered with real server-side content:** keyword-first `<h1>` ("Neurodes farming guide"), proper `<h2>` hierarchy, outbound source citations with `rel="noreferrer"`, "Verified" dates (freshness signal).
- **`robots.txt` allows crawling** (no accidental blocks).
- **Mobile viewport** configured; responsive Tailwind layout.
- **All 25 guide `.svx` files map to prerendered routes** — no orphaned content files.
- Honest attribution / non-affiliation footer (trust signal).

---

## Findings

### Technical SEO

| #   | Issue                                   | Impact          | Evidence                                                                                       | Fix                                                                                       |
| --- | --------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| T1  | **No `sitemap.xml`**                    | High            | `GET /sitemap.xml` → 404                                                                       | Add a prerendered `/sitemap.xml` route enumerating `/` + all guide URLs with `<lastmod>`. |
| T2  | **`robots.txt` has no `Sitemap:` line** | Medium          | `static/robots.txt` (3 lines, allow-all only)                                                  | Add `Sitemap: https://wforacle.avyiel.dev/sitemap.xml`.                                   |
| T3  | **Homepage content is client-rendered** | High            | Served `/` HTML shows only header + `Loading Star Chart…`; the chart/panels build in `onMount` | Server-render an intro/H1 + a static, crawlable list of guide links (see O2/O5).          |
| T4  | **No canonical tags**                   | Medium          | No `<link rel="canonical">` in any served head                                                 | Add self-referencing canonical per route.                                                 |
| T5  | **Default Svelte-logo favicon**         | Low (brand/CTR) | `src/lib/assets/favicon.svg` is the stock `svelte-logo`                                        | Ship a wforacle icon (the gold/cyan "wf" mark) as favicon + apple-touch-icon.             |

### On-Page SEO

| #   | Issue                                          | Impact   | Evidence                                                                                                                                      | Fix                                                                                                                                                     |
| --- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | **No `<title>` on any page**                   | Critical | `app.html` head = charset+viewport+text-scale only; no `<svelte:head>` sets a title                                                           | Homepage: `wforacle — Warframe Star Chart & Resource Farming Tracker`. Guides: `{Resource} Farming Guide — Best Locations                               | wforacle`. |
| O2  | **No meta description anywhere**               | Critical | No `<meta name="description">` served                                                                                                         | Unique 150–160-char description per page; guides can summarize the top early/late farm.                                                                 |
| O3  | **No Open Graph / Twitter tags + no OG image** | High     | None in served head; links unfurl as bare URLs                                                                                                | Add `og:title/description/image/type/url` + `twitter:card=summary_large_image`. Generate a 1200×630 OG image (branded default + optional per-resource). |
| O4  | **Homepage has no `<h1>`**                     | Medium   | Brand is a styled `<span>`, not a heading                                                                                                     | Add a semantic `<h1>` (can be visually compact) e.g. "Warframe Star Chart Tracker".                                                                     |
| O5  | **Guides are orphaned in static HTML**         | High     | Region→resource links render client-side only; guides reachable in prerendered HTML only via the sitemap crawler, not via on-page `<a>` links | Add a server-rendered "Farming Guides" index (e.g. `/guides`) linked from the homepage, listing all guides with descriptive anchors.                    |
| O6  | **Decorative guide image has empty alt**       | Low      | `<img alt="">` on resource icon                                                                                                               | Acceptable as decorative, but a descriptive alt (`"{Resource} icon"`) adds a minor relevance signal.                                                    |

### Content / Structured Data / AI-SEO

| #   | Issue                                       | Impact           | Evidence                                         | Fix                                                                                                             |
| --- | ------------------------------------------- | ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| C1  | **No JSON-LD structured data**              | Medium           | No `application/ld+json` served                  | `WebApplication` on home; `HowTo` or `Article` + `BreadcrumbList` on guides. Boosts rich results + AI citation. |
| C2  | **No `/guides` hub / topical clustering**   | Medium           | Guides exist only as isolated leaf pages         | A hub page (O5) creates a topic cluster and distributes internal PageRank.                                      |
| C3  | **Not optimized for AI answer-engines**     | Medium (growing) | No `llms.txt`, thin homepage, no structured data | See the `ai-seo` skill: `llms.txt`, concise answer-first guide intros, structured data (overlaps C1).           |
| C4  | **No descriptive OG/title = poor SERP CTR** | Medium           | Consequence of O1–O3                             | Resolved by O1–O3.                                                                                              |

---

## Prioritized Action Plan

### Phase 1 — Metadata foundation _(highest ROI, ~half a day)_

- **T1** Add `src/routes/sitemap.xml/+server.ts` (prerendered) enumerating `/` + guide entries with `<lastmod>` from each resource's `lastVerified`.
- **T2** Append `Sitemap:` to `static/robots.txt`.
- **O1 + O2** Add `<svelte:head>` with unique `<title>` + `<meta name="description">` to the homepage and the guide page (`data`-driven per resource).
- **T4** Add self-referencing canonical to both.
- **T5** Replace the favicon with a wforacle-branded mark.

**Success criteria:** every URL returns a unique title + description; `curl /sitemap.xml` → 200 XML; Rich Results / social debuggers show correct title & canonical.

### Phase 2 — Homepage & discoverability _(high impact)_

- **T3 + O4** Server-render a short intro paragraph + semantic `<h1>` above the interactive chart so `/` has real indexable content (the chart can still hydrate client-side).
- **O5 + C2** Build a prerendered `/guides` hub listing all 25 guides with descriptive anchor text; link it from the homepage header/footer.
- **O6** Add descriptive `alt` to guide resource icons.

**Success criteria:** `/` and `/guides` render meaningful text + internal `<a>` links in raw HTML (verify with `curl`); guides reachable by crawl without JS.

### Phase 3 — Social & structured data _(polish + rich results)_

- **O3** Open Graph + Twitter Card tags on all routes; generate a branded 1200×630 OG image (per-resource optional, Cloudflare Workers can render on the fly later).
- **C1** JSON-LD: `WebApplication` (home), `HowTo`/`Article` + `BreadcrumbList` (guides).

**Success criteria:** links unfurl with title/description/image in Slack/Discord/X; Google Rich Results Test validates the structured data.

### Phase 4 — AI-SEO & growth _(ongoing)_

- **C3** Add `llms.txt`; tighten guide intros to answer-first (lead with the single best farm, then detail) so LLMs can quote them cleanly. _(Use the `ai-seo` skill.)_
- Expand guide coverage to more searched resources; keep "Verified" dates current (freshness).
- Post-launch: submit sitemap to Google Search Console + Bing Webmaster Tools; monitor Core Web Vitals and impressions.

---

## Notes / Constraints

- Static prerendered adapter → sitemap and any OG-image endpoints must be **prerenderable** (or moved to a Worker function). Per-request OG image generation would need a small Cloudflare Worker route.
- Reuse the existing `dataset.json` (already imported in `entries()`) as the single source of truth for titles, descriptions, and sitemap URLs — no new data layer needed.
- Keep changes incremental & test-covered per the project's TDD workflow; each phase is independently shippable.

## Suggested KPIs

- Pages indexed (GSC coverage) → target: all 26 URLs.
- Organic impressions / clicks on `"warframe {resource} farm"` queries.
- Avg. SERP position for guide keywords.
- Social referral traffic (post-OG).
- AI-answer citations (manual spot-checks in ChatGPT/Perplexity for "best neurodes farm warframe").
