#!/usr/bin/env bash
# Lighthouse runs against the production build, mobile + desktop, for the four
# representative pages. Prints a score table and exits non-zero if anything is
# below the project's floor.
#
#   pnpm build && pnpm preview &   # must already be serving on :4173
#   ./scripts/lighthouse.sh
#
# Lighthouse is invoked via `pnpm dlx` rather than added as a devDependency:
# it pulls ~200 packages and is only ever run by hand, so paying for it in
# every `pnpm install` (and in CI) is not worth it. The replay-blob regression
# this workstream fixed is guarded far more cheaply by scripts/check-page-size.ts,
# which does run in CI.
#
# CHROME_PATH defaults to the Chromium that Playwright already installs, so
# there is no second browser download.
set -uo pipefail

FLOOR=${FLOOR:-97}
BASE=${BASE:-http://localhost:4173}
# BSD/macOS mktemp requires an explicit template; GNU's does not. Pass one so
# both work.
OUT=$(mktemp -d "${TMPDIR:-/tmp}/wforacle-lh.XXXXXX")
trap 'rm -rf "$OUT"' EXIT

# `timeout` is GNU coreutils and is absent on a stock macOS. Bound each run
# where it exists, and degrade to running unbounded rather than failing with a
# confusing "command not found" swallowed inside run().
if command -v timeout >/dev/null 2>&1; then
	TIMEOUT=(timeout 300)
else
	TIMEOUT=()
	echo "note: \`timeout\` not found — Lighthouse runs will not be time-bounded." >&2
fi

if [ -z "${CHROME_PATH:-}" ]; then
	CHROME_PATH=$(node -e "try{console.log(require('playwright').chromium.executablePath())}catch(e){}" 2>/dev/null)
fi
export CHROME_PATH
if [ ! -x "${CHROME_PATH:-}" ]; then
	echo "No Chrome found. Set CHROME_PATH, or run: pnpm exec playwright install chromium" >&2
	exit 1
fi

if ! curl -fs -o /dev/null "$BASE/" 2>/dev/null; then
	echo "Nothing serving at $BASE — run \`pnpm build && pnpm preview\` first." >&2
	exit 1
fi

run() { # name path device [extra flags...]
	local name=$1 path=$2 dev=$3
	shift 3
	# stderr is captured rather than discarded: without it a failure here (a
	# missing binary, a Chrome crash) surfaced only as a generic "lighthouse
	# failed", with the actual cause thrown away.
	"${TIMEOUT[@]}" pnpm dlx lighthouse@12 "$BASE$path" \
		--only-categories=performance,accessibility,best-practices,seo --quiet \
		--chrome-flags="--headless --no-sandbox" \
		--output=json --output-path="$OUT/$name-$dev.json" "$@" \
		>/dev/null 2>"$OUT/$name-$dev.err"
	if [ ! -s "$OUT/$name-$dev.json" ]; then
		echo "lighthouse failed for $name/$dev:" >&2
		tail -5 "$OUT/$name-$dev.err" >&2
		return 1
	fi
}

PAGES=("home:/" "guides:/guides" "resource:/guides/orokincell" "credits:/guides/credits")
for entry in "${PAGES[@]}"; do
	name="${entry%%:*}"
	path="${entry#*:}"
	printf 'running %s…\n' "$name" >&2
	run "$name" "$path" mobile || exit 1
	run "$name" "$path" desktop --preset=desktop || exit 1
done

node -e '
const fs = require("fs");
const [dir, floor] = [process.argv[1], Number(process.argv[2])];
const pages = ["home", "guides", "resource", "credits"];
const keys = ["performance", "accessibility", "best-practices", "seo"];
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("page", 10) + pad("device", 9) + keys.map((k) => pad(k.slice(0, 5), 7)).join("") + "CLS");
let worst = 100;
for (const p of pages)
  for (const d of ["mobile", "desktop"]) {
    const r = JSON.parse(fs.readFileSync(`${dir}/${p}-${d}.json`, "utf8"));
    const scores = keys.map((k) => Math.round(r.categories[k].score * 100));
    worst = Math.min(worst, ...scores);
    console.log(pad(p, 10) + pad(d, 9) + scores.map((s) => pad(s, 7)).join("") +
      r.audits["cumulative-layout-shift"].displayValue);
  }
console.log(`\nlowest score: ${worst} (floor ${floor})`);
process.exit(worst >= floor ? 0 : 1);
' "$OUT" "$FLOOR"
