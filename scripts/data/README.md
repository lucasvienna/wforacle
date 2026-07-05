# Data Pipeline

Generates `static/data/dataset.json` from WFCD (`@wfcd/items`, `warframe-worldstate-data`). Run `pnpm data:build`. Pure logic in `parse.ts`/`build.ts` is unit-tested on `fixtures/`. Curated inputs (boss names, planet order) live in `curated.ts`.
