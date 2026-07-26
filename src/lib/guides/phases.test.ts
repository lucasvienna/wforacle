import { describe, it, expect } from 'vitest';
import type { Recommendation } from '$lib/model/types';
import { PHASES, PHASE_LABEL, PHASE_TAG, byPhase, boosterNote } from './phases';

const rec = (over: Partial<Recommendation> = {}): Recommendation => ({
	phase: 'early',
	nodeLabel: 'Ceres — Gabii',
	boostersApply: true,
	note: '',
	source: 'https://wiki.warframe.com/x',
	lastVerified: '2026-07-01',
	...over,
});

describe('phase vocabulary', () => {
	it('covers every phase in every map', () => {
		// Guards the maps drifting apart as the vocabulary is edited — a
		// missing key renders `undefined` in a chip rather than failing.
		for (const phase of PHASES) {
			expect(PHASE_LABEL[phase]).toBeTruthy();
			expect(PHASE_TAG[phase]).toBeTruthy();
		}
	});
});

describe('byPhase', () => {
	it('orders early → mid → late whatever the input order', () => {
		const sorted = byPhase([
			rec({ phase: 'late' }),
			rec({ phase: 'early' }),
			rec({ phase: 'mid' }),
		]);
		expect(sorted.map((r) => r.phase)).toEqual(['early', 'mid', 'late']);
	});

	it('does not mutate its input', () => {
		const input = [rec({ phase: 'late' }), rec({ phase: 'early' })];
		byPhase(input);
		expect(input.map((r) => r.phase)).toEqual(['late', 'early']);
	});
});

describe('boosterNote', () => {
	it('prefers the curated note when present', () => {
		expect(boosterNote(rec({ boosterNote: 'Credit Booster applies.' }))).toBe(
			'Credit Booster applies.',
		);
	});

	// A2: the fallback existed only on the [resource] page. The bespoke credits
	// and affinity pages rendered a bare `{rec.boosterNote}`, so a rec without
	// one would have printed "undefined" — latent only because every curated
	// entry happens to set it. Now one implementation serves all three.
	it('falls back to the enemy-drop wording when boosters apply', () => {
		expect(boosterNote(rec({ boostersApply: true }))).toMatch(/Boosters help/);
	});

	it('falls back to the container wording when they do not', () => {
		expect(boosterNote(rec({ boostersApply: false }))).toMatch(/don't apply/);
	});

	it('never returns undefined for a rec with no boosterNote', () => {
		for (const boostersApply of [true, false])
			expect(typeof boosterNote(rec({ boostersApply }))).toBe('string');
	});
});
