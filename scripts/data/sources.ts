import type { SolNodes, RawWarframe } from './build';
import type { RawResource } from './assemble';

/**
 * Loads the real WFCD data used to build the dataset.
 *
 * `warframe-worldstate-data` ships a single default export object with a
 * `solNodes` property (verified against node_modules/warframe-worldstate-data:
 * its `exports` map only exposes `.`, `./utilities`, and `./types` — there is
 * no standalone `data/solNodes.json` subpath despite older docs suggesting
 * otherwise. The default export's `solNodes` matches our `SolNodes` shape:
 * `Record<string, { value: string; enemy: string; type: string }>`).
 *
 * `@wfcd/items` exports a `default class Items extends Array<Item>` that is
 * constructed with an options object (`{ category: [...] }`), not a bare
 * array of category names as older examples show. Filtering by
 * `type === 'Warframe'` (not `category === 'Warframes'`, which also includes
 * Archwings/Pets/Sentinels) yields playable Warframes whose `components[]`
 * carry `drops[].location` / `drops[].chance`, matching `RawWarframe`.
 *
 * Likewise, resources: verified against node_modules/@wfcd/items that every
 * curated RESOURCES name (scripts/data/farming.ts) — Orokin Cell, Alloy
 * Plate, Rubedo, etc. — lives under `category: 'Misc'`, not `'Resources'`
 * (that category instead holds Gems/Fish/event items); and even within
 * Misc, `type` is inconsistent (`'Resource'` for most, but `'Misc'` for
 * Neurodes, whose top-level entry is oddly shaped like a blueprint recipe
 * yet still carries the correct `imageName`). So both categories are
 * queried with no `type` filter, and `buildResources` (assemble.ts) does
 * the real filtering by matching `raw.name` against the curated RESOURCES
 * list — any unrelated Misc/Resources items just go unmatched and unused.
 */
export async function loadSources(): Promise<{
	solNodes: SolNodes;
	warframes: RawWarframe[];
	rawResources: RawResource[];
}> {
	const worldstateData = (await import('warframe-worldstate-data')).default;
	const solNodes = worldstateData.solNodes as unknown as SolNodes;

	const { default: Items } = await import('@wfcd/items');
	const items = new Items({ category: ['Warframes'] });
	const warframes = items.filter((i) => i.type === 'Warframe') as unknown as RawWarframe[];

	const resourceItems = new Items({ category: ['Resources', 'Misc'] });
	const rawResources = resourceItems as unknown as RawResource[];

	return { solNodes, warframes, rawResources };
}
