# wforacle A11y Fast-Follow & Cursor Polish (Plan 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the deferred modal-a11y fast-follow from Plans 6/7 (focus trap + combobox semantics) and give every non-link interactive element a proper pointer cursor.

**Architecture:** A global base rule in `app.css` gives `button`/`[role="button"]`/`[role="option"]` a pointer cursor (covers the toolbar/palette/drawer buttons that currently lack it). A shared `trapFocus` Svelte action wraps Tab focus within a dialog and is applied to both `CommandPalette` and `SettingsDrawer`. The palette's input gains proper combobox semantics (`role="combobox"` + `aria-activedescendant` to the highlighted option).

**Tech Stack:** SvelteKit static, Svelte 5 runes, Tailwind v4, Vitest, Playwright.

## Global Constraints

- **No new runtime deps.** The focus trap is a hand-rolled Svelte action.
- **Non-breaking.** Keep all existing test hooks (`data-*`, roles, text) and existing behavior (Escape/backdrop close, highlight, selection). Existing 132 unit + 13 e2e stay green.
- **Cursor rule targets genuinely-interactive, non-disabled elements** — never links (`<a>` already shows a pointer) and never disabled buttons.
- **Theme tokens** already exist (`wf-*`); no new colors.
- pnpm; unit `pnpm test:unit --run`; e2e `pnpm exec playwright test`. TDD where practical; signed commits (`git commit -S -s`); `pnpm lint` clean; `format:check` green (format only touched files; `.svelte` via prettier). Validate every `.svelte` with the Svelte MCP autofixer.

---

### Task 1: Global pointer cursor for interactive elements

**Files:**

- Modify: `src/app.css`
- Test: `src/routes/page.svelte.test.ts` (a lightweight assertion) OR a new small test

**Interfaces:** none (CSS).

- [ ] **Step 1: Implement** — add to the `@layer base` block in `src/app.css`:

```css
/* Interactive, non-link elements should read as clickable. Tailwind's reset
	   leaves <button> at the default arrow cursor; links already show a pointer. */
button:not(:disabled),
[role='button']:not([aria-disabled='true']),
[role='option'],
summary,
label:has(> input[type='checkbox']),
label:has(> input[type='radio']) {
	cursor: pointer;
}
```

(Keep the existing `:root` vars, body gradient, and `@theme` block untouched.)

- [ ] **Step 2: Verify the rule compiles** — `pnpm build` succeeds (a CSS syntax error fails the build). Optionally spot-check the emitted CSS contains `cursor:pointer`.
- [ ] **Step 3: (Optional) tidy** — the existing per-element `cursor-pointer` utility classes in StarChart/RegionPanel/QuestsPanel are now redundant but harmless; leave them (removing is churn). Do NOT remove them in this task.
- [ ] **Step 4: Run** — `pnpm test:unit --run` green (no behavior change); `pnpm build` OK.
- [ ] **Step 5: Commit** — `feat(a11y): pointer cursor for all interactive non-link elements`.

---

### Task 2: `trapFocus` Svelte action

**Files:**

- Create: `src/lib/actions/trapFocus.ts`
- Test: `src/lib/actions/trapFocus.test.ts`

**Interfaces:**

- Produces: `export function trapFocus(node: HTMLElement): { destroy(): void }` — a Svelte action. On `keydown` of `Tab`/`Shift+Tab`, if focus is at the last (resp. first) tabbable descendant of `node` (or outside it), it wraps to the first (resp. last), calling `preventDefault()`. Tabbable set: `node.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')` filtered to visible elements (offsetParent !== null or has size). No-op if there are 0 tabbable elements. Adds the listener on the node (or document, scoped to when focus is within node) and removes it in `destroy()`.

- [ ] **Step 1: Write the failing test** — render a container with three buttons via a tiny harness (`document.body.innerHTML = '<div><button id="a">a</button><button id="b">b</button><button id="c">c</button></div>'`), apply `trapFocus(div)`. Focus `#c` (last), dispatch a `Tab` keydown (`new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })` on the focused element / node) → assert `document.activeElement.id === 'a'` and `preventDefault` was called. Focus `#a`, dispatch `Shift+Tab` → assert `document.activeElement.id === 'c'`. Call `destroy()` and assert the listener no longer wraps (a Tab at the boundary leaves focus as the browser would — or simply that no error occurs). (jsdom does not move focus on a bare Tab, so only the boundary-wrap branch — where the action explicitly `.focus()`es — is asserted; that's the branch under test.)
- [ ] **Step 2: Run — expect FAIL** (`pnpm vitest run src/lib/actions/trapFocus.test.ts`).
- [ ] **Step 3: Implement** the action.
- [ ] **Step 4: Run — expect PASS** (`pnpm test:unit --run`).
- [ ] **Step 5: Commit** — `feat(a11y): trapFocus action for modal dialogs`.

---

### Task 3: Apply trap + combobox semantics to the palette & drawer

**Files:**

- Modify: `src/lib/palette/CommandPalette.svelte`
- Modify: `src/lib/panel/SettingsDrawer.svelte`
- Test: `src/lib/palette/CommandPalette.svelte.test.ts`, `src/lib/panel/SettingsDrawer.svelte.test.ts`

**Interfaces:**

- Consumes: `trapFocus` (Task 2).
- Produces:
  - **CommandPalette:** apply `use:trapFocus` to the dialog panel. Input gains combobox semantics: `role="combobox"`, `aria-expanded="true"`, `aria-controls="palette-listbox"`, `aria-activedescendant={results.length ? \`palette-opt-${clampedHighlight}\` : undefined}`. The listbox gets `id="palette-listbox"`; each option button gets `id={\`palette-opt-${index}\`}`. Label the dialog via `aria-labelledby`pointing at a visually-hidden heading OR keep the existing`aria-label`(either is acceptable; do NOT break the existing`getByRole('dialog')` name). Keep all existing behavior/hooks (`data-palette-item`, `data-type`, `role="listbox"/"option"`, `aria-selected`, arrow/Enter/Esc, backdrop).
  - **SettingsDrawer:** apply `use:trapFocus` to the dialog panel. Keep existing hooks/behavior (`role="dialog"`, `[data-close-settings]`, reset flow, Escape, focus-on-open).
- [ ] **Step 1: Extend the tests (write first)** —
  - CommandPalette test: with `open:true` + items, assert the input has `role="combobox"` and `aria-controls="palette-listbox"`; after typing/arrowing, `aria-activedescendant` equals `palette-opt-<highlight>` and the option at that index has the matching `id`. Add a focus-trap assertion: focus the last option button, dispatch `Tab`, assert focus wrapped to the input (the first tabbable). Keep the existing filter/Enter/Escape tests green.
  - SettingsDrawer test: focus the last tabbable control in the dialog (e.g. `[data-reset-tracking]`), dispatch `Tab`, assert focus wraps to the first tabbable (the `[data-close-settings]` button). Keep the existing open/close/reset/backdrop/focus tests green.
- [ ] **Step 2: Run — expect FAIL**; implement (validate BOTH .svelte with the Svelte MCP autofixer).
- [ ] **Step 3: Run — expect PASS** (`pnpm test:unit --run` all green).
- [ ] **Step 4: Commit** — `feat(a11y): focus-trap the palette & drawer; combobox semantics for the palette`.

---

### Task 4: Verify (e2e + visual/keyboard)

**Files:**

- (Optional) Modify: an e2e if a stable keyboard assertion is worth adding; otherwise controller-only.

- [ ] **Step 1: Full gate** — `pnpm test:unit --run` (all green) + `pnpm exec playwright test` (all 13+ green) + `pnpm build` prerenders clean + `pnpm lint`/`format:check` green.
- [ ] **Step 2: Visual/interaction check (controller)** — build + load; confirm (a) buttons (search, cogwheel, close, reset, quest rows, palette rows) show a pointer cursor on hover; (b) opening the palette and pressing Tab keeps focus within the dialog and cycles; (c) arrowing the palette updates `aria-activedescendant`. Save a screenshot if useful. (Gate, not an automated test.)
- [ ] **Step 3: Commit** — none unless an e2e was added; fold tweaks into the relevant task.

---

## Self-Review

**Spec coverage:**

- Pointer cursor for all non-link interactive elements (global base rule) → Task 1. ✅
- Focus trap for palette + drawer (deferred fast-follow) → Tasks 2, 3. ✅
- Combobox semantics for the palette (deferred fast-follow) → Task 3. ✅
- Deferred/out of scope (correctly): content depth (open-world resources, Primes/relics, weapons); the `isWordBoundaryMatch` first-occurrence ranking nit (non-blocking, not worth the churn); `inert` background (the Tab-wrap trap is sufficient for this pass).

**Placeholder scan:** every step has concrete CSS/code or an exact contract. ✅

**Type consistency:** `trapFocus` signature stable between Tasks 2 and 3; option ids `palette-opt-<index>` and `aria-activedescendant`/`aria-controls` ids consistent within CommandPalette. ✅

**Note for executor:** jsdom doesn't move focus on a plain Tab — only assert the boundary-wrap branches (where the action explicitly calls `.focus()`). Don't remove existing `cursor-pointer` utility classes (Task 1 Step 3). Keep the dialogs' accessible names stable so `getByRole('dialog', { name: ... })` selectors in the existing tests still resolve.
