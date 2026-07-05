import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { loadSources } from './data/sources';
import { assembleDataset, validateDataset } from './data/assemble';

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
	const { solNodes, warframes } = await loadSources();
	const data = assembleDataset(solNodes, warframes);
	const problems = validateDataset(data);
	if (problems.length) {
		console.error('Dataset invalid:\n' + problems.join('\n'));
		process.exit(1);
	}
	const nodeFrames = data.warframes.length;
	console.log(
		`Regions: ${data.regions.length}, nodes: ${data.nodes.length}, node-linked frames: ${nodeFrames}`,
	);
	// Verified ceiling against the installed warframe-worldstate-data@3.16.2 +
	// @wfcd/items@1.1274.72: of the 17 real Assassination-type SolNodes across
	// our 15 curated regions, 14 have a Warframe blueprint drop tied to them
	// (Tolstoj, Phorid, and the Eris "Assassinate"-key bosses Jordas Golem /
	// Mutalist Alad V don't — they aren't modeled as normal SolNodes in this
	// data source). Of those 14, Equinox's components are named "Day Aspect"
	// / "Night Aspect" rather than the standard Chassis/Neuroptics/Systems
	// buildFrames (build.ts, Task 6, out of scope here) matches on, so it
	// isn't picked up either, leaving 13. See
	// .superpowers/sdd/task-7-report.md for the full breakdown.
	if (data.regions.length < 14 || nodeFrames < 13) {
		console.error(`Sanity check failed (expected >=14 planets + >=13 node-linked frames)`);
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
