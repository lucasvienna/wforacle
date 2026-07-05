import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleDataset, validateDataset } from './assemble';
import type { SolNodes } from './build';
import type { RawWarframe } from './build';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const solNodes: SolNodes = JSON.parse(
	readFileSync(join(__dirname, './fixtures/solNodes.sample.json'), 'utf8'),
);
const warframes: RawWarframe[] = JSON.parse(
	readFileSync(join(__dirname, './fixtures/warframes.sample.json'), 'utf8'),
);

describe('assembleDataset', () => {
	const ds = assembleDataset(solNodes, warframes);
	it('back-fills bossId/frameId on the assassination node', () => {
		const fossa = ds.nodes.find((n) => n.id === 'SolNode104')!;
		expect(fossa.bossId).toBe('fossa');
		expect(fossa.frameId).toBe('rhino');
	});
	it('passes integrity validation', () => {
		expect(validateDataset(ds)).toEqual([]);
	});
	it('detects a dangling reference', () => {
		const broken = structuredClone(ds);
		broken.nodes.find((n) => n.id === 'SolNode104')!.frameId = 'ghost';
		expect(validateDataset(broken).join(' ')).toMatch(/ghost/);
	});
});
