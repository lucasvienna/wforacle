# 03 — Improvement Strategy

_Four themes explain nearly all findings. Owner decisions (see README decisions log)
are already folded in._

## Theme 1 — Close the ungated path to production (H1, O1, T1-amplifier)

The repo has an excellent gate (`ci.yml`) and a daily bypass around it
(`refresh-data.yml` → direct push to auto-deploying `main`).

**Target state:** every commit landing on `main` has passed the full CI matrix. Data
refreshes run **weekly** (decision #2) and arrive as auto-created PRs with auto-merge
on green — a red refresh blocks itself instead of deploying. Cron failures produce a
visible notification.

**Principle:** one gate, no side doors.

**Done means:** `refresh-data.yml` cannot push to `main`; a deliberately-broken
dataset refresh results in a red PR, not a deploy; a failed cron run
opens/updates an issue.

## Theme 2 — Define the failure paths of the three runtime dependencies (H2, Q2, Q3, T4, O2)

The app has exactly three external dependencies at runtime — `dataset.json`,
IndexedDB, and the worldstate proxy — and all three have happy-path-only handling and
happy-path-only tests.

**Target state:** each has a defined, rendered failure state (error + retry UI for the
dataset; surfaced-or-logged rejection for IDB writes; validated, logged, and
timed-out upstream calls in the proxy), and a test for the failure path.

**Principle:** fail fast with descriptive messages; never silently swallow
(the project's own stated standard).

**Done means:** blocking the dataset request in DevTools shows an error UI with a
working retry; unit tests cover fetch-reject / malformed payload / IDB-unavailable;
`wrangler tail` shows a log line when the upstream API breaks.

## Theme 3 — Stop the duplication compounding in the newest code (A2, A4c)

The oldest code (model, pipeline, tracker) is DRY; the newest (bespoke guides,
dialogs, phase vocabulary) is copy-paste-diverging — the `boosterNote` fallback
divergence shows the cost is already real. **Endo and Focus guides are planned
(decision #3), which makes the guide extraction a prerequisite, not polish.**

**Target state:** one `GuideLongform` component + one phase-vocabulary module + one
drawer/dialog wrapper. A new bespoke guide is a data/prose file, not a 350-line page.

**Principle:** extract on the third copy — all of these are at 3+.

**Done means:** a layout change to guide pages touches one file;
`grep -rn "PHASE_LABEL" src` returns one definition; the Endo guide PR contains no
copied section shells.

## Theme 4 — Curated data needs the same canary rigor as generated data (D1, D2)

The pipeline validates what comes from `@wfcd` but not what the maintainer
hand-writes — inverted risk, since hand-written node labels and recommendations rot
fastest with game updates. One shipped bug already exists (Zariman slug,
`farming.ts:246`).

**Target state:** every recommendation `nodeLabel` resolves against real node names at
build time (allowlist for intentional non-node labels like "Anywhere"); the Zariman
bug fixed and regression-tested; stale `lastVerified` (> 6 months) warns at build.

**Principle:** the data you wrote yourself deserves more suspicion than the data you
imported — you have no upstream to notice for you.

**Done means:** renaming a node in fixtures makes `pnpm data:build` exit 1; the dead
`rec.nodeId` check is either revived or removed.

## Performance workstream (upgraded per decision #5)

Owner goal: **Lighthouse ≥ 97 mobile + desktop minimum, instant loads.** This turns
the single perf finding (H3) into a workstream:

1. Fix H3 (server load for `guides/[resource]`) — the dominant known cost.
2. Establish a measured baseline (LH runs against the built output for `/`, `/guides`,
   one `[resource]` page, `/guides/credits`) _before and after_ H3.
3. Add a CI perf check (Lighthouse CI or size-budget assertion on built HTML) so
   regressions of the replay-blob class can never silently return.
4. Then chase the tail only if the baseline demands it: font loading, preloading the
   dataset fetch on `/`, image `fetchpriority`, dropping dead dataset fields
   (task 3.4 shrinks the payload for free).

**Done means:** LH ≥ 97 (mobile + desktop) on the four representative pages measured
against production; CI fails if any prerendered HTML exceeds its size budget.

## Explicitly NOT doing now (trade-offs)

- **Cross-browser/mobile e2e matrix, axe CI gate** — real value, ~3× CI time for a
  solo project; revisit on user-reported WebKit/mobile issues. (The deferred
  small-screen star chart item remains a separate, known UX task.)
- **Runtime schema validation (zod et al.) for dataset.json** — conflicts with the
  minimal-deps preference; build-time gate + `res.ok`/shape sanity check gets ~90%
  of the value at zero deps.
- **Coverage thresholds** — measure (cheap, informative), don't enforce; enforcement
  would fight the pragmatic test culture that is working.
- **Splitting `+page.svelte` (335 lines) / relocating worldstate parse.ts** —
  cosmetic at current scale; do opportunistically when touching those files anyway.
- **Error-reporting SaaS** — overkill; `console.error` + Workers `invocation_logs`
  suffice at this traffic.
