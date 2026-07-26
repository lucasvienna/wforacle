Automated weekly refresh of `@wfcd/items` and `warframe-worldstate-data`, with
`static/data/dataset.json` regenerated from them.

`pnpm data:build` and the unit suite already passed before this PR was opened;
`ci.yml` runs the full gate here, and this merges itself once it is green.

Worth a glance at the dataset diff even so. The pipeline validates structure,
referential integrity and that every curated `nodeLabel` still resolves to a
real star-chart node — but it cannot tell you whether a drop rate moved because
Digital Extremes rebalanced something.
