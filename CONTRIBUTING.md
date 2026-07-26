# Contributing

This is a solo-maintained hobby project. Contributions are genuinely welcome,
but the bar for merging is "does this hold up unattended six months from now",
because that is the situation every change ends up in.

## Before you open a PR

```sh
pnpm install
pnpm format          # not just format:check — commit the result
pnpm lint
pnpm check
pnpm test:unit --run
pnpm build && pnpm test:e2e
```

CI runs all of these. `pnpm format` is the one people forget: the format job
checks, it does not fix.

## What tends to get asked in review

**Fix the data, not the symptom.** Drop rates, node names and farm
recommendations live in `scripts/data/` and are compiled into
`static/data/dataset.json`. Editing a component to work around wrong data is
the wrong layer.

**Regenerate and commit the dataset.** `pnpm build` does not rebuild it. If you
touch anything under `scripts/data/`, run `pnpm data:build` and commit
`static/data/dataset.json` in the same PR, or your change ships as a no-op.

**Cite and date curated data.** Every recommendation carries a `source` URL and
a `lastVerified` date. Use the [Warframe Wiki](https://wiki.warframe.com) or the
[official drop tables](https://www.warframe.com/droptables); patch notes are
better than either for "when did this change". The build warns when an entry
goes six months without re-verification.

**Test the behaviour, then check the test fails without the fix.** A guard that
cannot reproduce its own bug is worse than none, because it reads as coverage.
Pure logic gets direct unit tests; components get tests for wiring and
rendering, not for formatting rules that belong in a pure module.

**Keep `data-*` selectors stable.** They are the shared contract between unit
tests, e2e specs and the components. Renaming one is a deliberate act.

**Comments explain why, not what.** The existing ones record decisions — why a
load is a server load, why a fetch says `no-store`, why an allowlist entry
exists. Please keep them, and add to them when the reasoning is non-obvious.

## Conventions worth knowing

- Factory functions returning getter objects for reactive state; **no
  module-level reactive state** anywhere in `src/lib` (this is what keeps SSR
  safe — please do not introduce any).
- Dependencies injected as arguments, not imported into the module that uses
  them, where practical.
- Pure-core / thin-shell: logic in `.ts`, rendering in `.svelte`.
- Minimal dependencies. The project ships exactly one runtime dependency and
  intends to keep it that way; a new devDependency wants a reason.

## Reporting data errors

If a drop rate or farm recommendation is wrong, an issue with a source link is
just as useful as a PR — often more, since the fix is usually one line and the
hard part is knowing it changed.

## Licence

By contributing you agree your changes ship under [AGPL-3.0-only](LICENSE).
