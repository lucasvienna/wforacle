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
 * Likewise, `category: ['Resources']` includes non-Resource items (e.g.
 * Fish, Gems), so it's filtered to `type === 'Resource'` to match
 * `RawResource` (each item carries `name` and `imageName`).
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

	const resourceItems = new Items({ category: ['Resources'] });
	const rawResources = resourceItems.filter(
		(i) => i.type === 'Resource',
	) as unknown as RawResource[];

	return { solNodes, warframes, rawResources };
}
