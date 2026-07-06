import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { loadSources } from './data/sources';
import { assembleDataset, validateDataset } from './data/assemble';
import { PLANETS } from './data/curated';

const OUT = 'static/data/dataset.json';

const require = createRequire(import.meta.url);

// Neither package exposes ./package.json in its "exports" map, so resolve
// the nearest node_modules directory containing the package (via the
// resolver's own lookup paths) and read package.json from there directly,
// rather than requiring the subpath (which "exports" would reject) or the
// main entry point (whose directory may not be the package root, e.g.
// warframe-worldstate-data's main resolves into its dist/ subfolder).
function packageVersion(name: string): string {
	const searchPaths = require.resolve.paths(name) ?? [];
	for (const base of searchPaths) {
		const candidate = join(base, name, 'package.json');
		try {
			const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { version: string };
			return pkg.version;
		} catch {
			continue;
		}
	}
	throw new Error(`Could not locate package.json for ${name}`);
}

function sourceVersion(): string {
	return `items@${packageVersion('@wfcd/items')}+worldstate-data@${packageVersion('warframe-worldstate-data')}`;
}

async function main() {
	const { solNodes, warframes, rawResources } = await loadSources();
	const data = assembleDataset(solNodes, warframes, rawResources);
	const problems = validateDataset(data);
	if (problems.length) {
		console.error('Dataset invalid:\n' + problems.join('\n'));
		process.exit(1);
	}
	const nodeFrames = data.warframes.length;
	console.log(
		`Regions: ${data.regions.length}, nodes: ${data.nodes.length}, node-linked frames: ${nodeFrames}`,
	);
	// Every main planet must be present as a region.
	const regionNames = new Set(data.regions.map((r) => r.name));
	const missingPlanets = PLANETS.filter((p) => !regionNames.has(p.name)).map((p) => p.name);
	if (missingPlanets.length) {
		console.error(`Sanity check failed: missing main planets: ${missingPlanets.join(', ')}`);
		process.exit(1);
	}
	// Node-linked-frame floor. Verified against the installed
	// warframe-worldstate-data@3.16.2 + @wfcd/items@1.1274.72: 16
	// node-linked frames. Nekros links at Deimos/Magnacidium; Equinox now
	// links via its Day Aspect / Night Aspect components at Uranus/Titania
	// (buildFrames generalized to handle non-standard slot names, Task 3);
	// Mesa and Atlas link via the curated Eris key-boss nodes "Mutalist Alad
	// V Assassinate" and "Jordas Golem Assassinate" (Task 3 curation).
	if (nodeFrames < 16) {
		console.error(`Sanity check failed (expected >=16 node-linked frames, got ${nodeFrames})`);
		process.exit(1);
	}
	// Equinox, Mesa, and Atlas must all be linked now that Uranus/Titania and
	// the curated Eris key-boss nodes are wired into the pipeline.
	for (const id of ['equinox', 'mesa', 'atlas']) {
		if (!data.warframes.some((f) => f.id === id)) {
			console.error(`Sanity check failed: frame ${id} not linked`);
			process.exit(1);
		}
	}
	// Special regions (Deimos, Void, Lua, Kuva Fortress, Zariman) must all be
	// present alongside the 14 main planets.
	const specialCount = data.regions.filter((r) => r.kind === 'special').length;
	if (specialCount < 5) {
		console.error(`Sanity check failed (expected >=5 special regions, got ${specialCount})`);
		process.exit(1);
	}
	// Nekros (Deimos/Magnacidium) must be linked now that the special-region
	// pipeline is in place.
	if (!data.warframes.some((f) => f.id === 'nekros')) {
		console.error('Sanity check failed: Nekros (Deimos/Magnacidium) not linked');
		process.exit(1);
	}
	// Floor matching the curated RESOURCES list size (scripts/data/farming.ts,
	// Task 2): all 12 curated resources are built regardless of @wfcd/items
	// match success, so this guards against buildResources silently returning
	// far fewer entries (e.g. an empty/malformed rawResources source).
	if (data.resources.length < 10) {
		console.error(`Sanity check failed (expected >=10 resources, got ${data.resources.length})`);
		process.exit(1);
	}
	mkdirSync('static/data', { recursive: true });
	writeFileSync(
		OUT,
		JSON.stringify(
			{ version: sourceVersion(), generatedAt: new Date().toISOString(), data },
			null,
			'\t',
		),
	);
	console.log(`Wrote ${OUT}`);
}

main();
