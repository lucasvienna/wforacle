# Inventory Import — Design

**Date:** 2026-07-12
**Status:** Approved (pending spec review)

## Summary

Let a player seed their tracked state from their live Warframe account. The
player supplies their **account ID**, the app fetches their public profile,
detects which Warframes they have mastered and which of the app's tracked
quests they have completed, previews the result, and — on confirmation —
merges it (add-only) into the existing tracker.

## Motivation

Today a returning player must manually check dozens of part checkboxes to tell
the tracker what they already own. A one-time import removes that cold-start
friction.

## Feasibility findings (why the design looks the way it does)

These were established by probing the live APIs during design; they constrain
every decision below.

1. **Username lookup is dead.** As of game update 38.0.8, DE removed the
   ability to resolve a display name to an account. `GET
   api.warframestat.us/profile/{displayName}` returns `404` for every name.
   The player **must** provide their numeric **account ID** (24 hex chars).
2. **Account ID works, and CORS is open.** `GET
   api.warframestat.us/profile/{accountId}` returns `200` with the full public
   profile and sends `access-control-allow-origin: *`. The browser can call it
   **directly** — no Worker proxy required. (A proxy stays a possible future
   optimization for caching / third-party-dependency insulation, but is out of
   scope.)
3. **The profile exposes owned _frames_, not _parts_.** There is no
   per-component inventory. Owned frames are recoverable from the mastery/XP
   list (`loadout.xpInfo` / the `/xpInfo` endpoint), which enumerates every
   Warframe the player has leveled. Because mastering a frame requires having
   built all its parts, we treat a mastered frame as "all parts owned."
   Consequence: import is **all-or-nothing per frame**; partial-part progress
   (e.g. "has chassis, needs systems") cannot be imported and stays manual.
4. **Frame identity must use `uniqueName`, not the display name.** DE's
   internal codenames diverge from display names (Mesa = `Cowgirl`, Nekros =
   `Necro`, Valkyr = `Berserker`, Limbo = `Magician`, …). Matching on display
   slug only recovered 12/23 tracked frames in testing. Matching on the
   `uniqueName` path is exact. The raw upstream data carries `uniqueName`
   (`/Lotus/Powersuits/Rhino/Rhino`) but the build pipeline currently drops it.
5. **Quest completion is heuristic.** The profile has no explicit quest-log.
   Completion is inferred from `challengeProgress` marker challenges
   (`SecondDreamTitleChallenge`, `TheWarWithin`, the Deimos "Mummy" kill
   challenges, `VMCompleteQuestVox`). This is best-effort and is the main
   reason for a preview-before-apply step. Only the app's 4 tracked quests are
   mapped.
6. **We cannot fetch the account ID for the player.** It lives behind their
   `warframe.com` login session (their cookie, a different origin). The best we
   can do is deep-link them to `warframe.com/api/user-data` and make the paste
   forgiving.

## Decisions

| Decision | Choice |
| --- | --- |
| What to import | Owned frames (→ all their parts) **and** completed quests |
| Apply behavior | Preview, then **merge (add-only)** — never un-checks existing state |
| Entry points | Command-palette action **and** a settings-drawer section |
| Account ID persistence | Remembered locally (opt-in), with a "Forget" control |
| Fetch | Direct browser fetch to `api.warframestat.us` (no proxy) |
| Frame granularity | All-or-nothing per frame (data limitation) |
| ID field | Accept the 24-hex ID; normalize common paste mistakes (quotes, whitespace, `user_id:` prefix) |

## Data flow

```
Palette action "Import from account"  ─┐
Settings-drawer "Import" button       ─┴──▶ ImportDialog opens
   → account-ID field (prefilled if a remembered ID exists)
   → fetch  https://api.warframestat.us/profile/{accountId}   (direct, CORS-open)
   → parseProfile(): match owned frames + completed quests against dataset.json
   → PREVIEW: "12 frames → 48 parts · 2 of 4 quests · N owned frames not tracked"
   → user clicks Apply
   → union with current tracker snapshot (add-only)
   → tracker.load(parts) / tracker.loadQuestState(quests)  → auto-persists to IndexedDB
   → toast "Imported ✓"; store accountId for one-click Re-sync (opt-in)
```

## Components

New files under `src/lib/import/`:

- **`profileClient.ts`** — `fetchProfile(accountId): Promise<RawProfile>`.
  Validates/normalizes the ID, fetches with a timeout, and maps `404` /
  network / `403` rate-limit into typed, human-readable errors. Returns only
  the slices used (`loadout.xpInfo`, `challengeProgress`).
- **`parseProfile.ts`** — pure, unit-testable transforms:
  - `matchOwnedFrames(profile, frames)` → `{ frameIds, partIds, ownedUntracked }`.
    Reads powersuit entries from `xpInfo`, keys on the `uniqueName` **folder
    segment** (`/Powersuits/Cowgirl/…` → Mesa) so Prime/Umbra/variant leaves
    collapse onto the base frame, matches against the dataset, and expands each
    matched frame to its full part-ID list.
  - `matchCompletedQuests(profile, quests)` → `questIds`, via `QUEST_MARKERS`.
  - `buildImportResult(...)` → the summary object the preview renders.
- **`questMarkers.ts`** — the curated `{ questId → marker challenge name(s) }`
  constant. Isolated + tested so corrections are trivial:
  - `theseconddream` → `SecondDreamTitleChallenge`
  - `thewarwithin` → `TheWarWithin`
  - `heartofdeimos` → `MummyQuestKillBroodMother`
  - `angelsofthezariman` → `VMCompleteQuestVox`
- **`accountId.ts`** — `normalizeAccountId(raw): string | null` (strip quotes,
  whitespace, `user_id:` prefix; validate 24-hex).
- **`importState.svelte.ts`** — rune store holding dialog phase
  (`idle | loading | preview | error`), the `ImportResult`, and
  `run(accountId)`, `apply(tracker)`, `remember()`, `forget()`. `apply()`
  unions the result with `tracker.snapshot()` / `tracker.questSnapshot()`
  before calling the tracker's load methods.
- **`ImportDialog.svelte`** — account-ID field (prefilled from remembered ID),
  the forgiving paste normalization, a "How to find your account ID"
  expandable panel, loading / error / preview states, "Remember my ID"
  (default on) + "Forget", and Apply.

### "How to find your account ID" panel

1. Open **[warframe.com/api/user-data](https://www.warframe.com/api/user-data)**
   (button opens a new tab). Log in if prompted.
2. Copy the value after `"user_id":` — a 24-character code.
3. Paste it above (a valid-format check shows inline).

Reassurance copy: *"This is not your display name. Your account ID is a public
identifier and safe to share — we only send it to the profile API, and store it
(if you allow) only in your own browser."*

## Touch points on existing code (small, contained)

- **`scripts/data/build.ts` (+ `assemble.ts` as needed)** — stop dropping
  `uniqueName`; write it onto each assembled warframe.
- **`src/lib/model/types.ts`** — add `uniqueName: string` to `Warframe`.
  Regenerate `static/data/dataset.json`.
- **`src/lib/tracker/persistence.ts`** — add `saveAccountId` / `loadAccountId`
  / `clearAccountId` (existing `wforacle` DB, `tracking` store, new
  `accountId` key).
- **`src/routes/+page.svelte`** — instantiate the import store, prefill the
  remembered ID on mount, register the palette action, and add the drawer
  button/section. Reuses the existing post-mount `tracker.load` auto-persist
  path; **the tracker itself is unchanged.**

## Error handling & edge cases

- Invalid ID format → inline validation, no fetch.
- `404` → "No profile found — use your **account ID** from
  warframe.com/api/user-data, not your display name."
- Network / timeout / `403` rate-limit → retryable "Couldn't reach the profile
  service."
- Owned frames the app doesn't track (Primes, non-farm frames) → excluded from
  the write; the preview shows an "N owned frames aren't tracked farms" line so
  the count isn't mysterious.
- Equinox (`bp` + `dayaspect` + `nightaspect`) is handled by normal part-list
  expansion; its two in-game forms collapse via folder matching.
- Empty / private profile → "Profile returned no usable data."

## Testing

- **`parseProfile.test.ts`** — against a trimmed real-profile fixture: Prime
  collapse, codename divergence (`Cowgirl` → Mesa), all 4 quest markers, Equinox
  part expansion, add-only union, and the "owned-but-untracked" count.
- **`accountId.test.ts`** — normalization + validation of messy pastes.
- **`build.test.ts`** — `uniqueName` retained on assembled warframes.
- **`e2e/import.test.ts`** (mocked profile fetch) — palette opens the dialog,
  a successful import checks the expected part/quest boxes, "Forget" clears the
  stored ID. Follows existing `tracking.test.ts` / `settings.test.ts` patterns.

## Out of scope (YAGNI)

- Live / background sync.
- A Cloudflare Worker proxy (only needed for caching or third-party insulation).
- Star-chart node-completion import (present in the profile, but the app does
  not track nodes as user state).
- Partial-part detection (not present in the data).
- Full user-data JSON paste (the normalized ID field covers the common cases).
