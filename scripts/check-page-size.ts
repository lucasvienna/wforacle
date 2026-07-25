import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Size budget for prerendered HTML.
 *
 * A cheap proxy for one specific regression: a route switching from a server
 * load to a universal load re-embeds the whole dataset in every page it
 * prerenders as a `data-sveltekit-fetched` replay blob. That is how
 * guides/*.html reached ~218KB each (6.4MB across the build) while the home
 * page sat at 23KB — invisible in review, since the source diff is one word.
 *
 * The budget is deliberately generous: roughly 1.5× the largest current page,
 * so ordinary prose and markup growth never trips it, but a returning replay
 * blob (which multiplies size by ~9) cannot possibly stay under it.
 */
const BUDGET_BYTES = 40_000;

const DIR = '.svelte-kit/cloudflare';

function htmlFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...htmlFiles(path));
		else if (entry.name.endsWith('.html')) out.push(path);
	}
	return out;
}

const files = htmlFiles(DIR);
if (files.length === 0) {
	console.error(`No prerendered HTML found in ${DIR} — did the build run?`);
	process.exit(1);
}

const sized = files
	.map((path) => ({ path, bytes: statSync(path).size }))
	.sort((a, b) => b.bytes - a.bytes);

// The blob check is the real assertion; the byte budget is the backstop that
// also catches non-blob bloat.
const withBlobs: string[] = [];
for (const { path } of sized) {
	const html = readFileSync(path, 'utf8');
	if (html.includes('data-sveltekit-fetched')) withBlobs.push(path);
}

const over = sized.filter((f) => f.bytes > BUDGET_BYTES);
const total = sized.reduce((sum, f) => sum + f.bytes, 0);

console.log(
	`Prerendered HTML: ${files.length} files, ${total.toLocaleString()} bytes total.\n` +
		`Largest: ${sized
			.slice(0, 3)
			.map((f) => `${f.path} (${f.bytes.toLocaleString()})`)
			.join(', ')}`,
);

if (withBlobs.length) {
	console.error(
		`\n${withBlobs.length} page(s) embed a data-sveltekit-fetched replay blob:\n` +
			withBlobs.map((p) => `  ${p}`).join('\n') +
			`\n\nA universal load (+page.ts) that fetches gets its response serialised into\n` +
			`every prerendered page. Move the fetch to a +page.server.ts and return only\n` +
			`what the page renders.`,
	);
}
if (over.length) {
	console.error(
		`\n${over.length} page(s) over the ${BUDGET_BYTES.toLocaleString()}-byte budget:\n` +
			over.map((f) => `  ${f.path}: ${f.bytes.toLocaleString()}`).join('\n'),
	);
}
if (withBlobs.length || over.length) process.exit(1);
