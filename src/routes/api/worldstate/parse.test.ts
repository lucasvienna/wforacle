import { describe, it, expect } from 'vitest';
import { toCycle, deriveRotation, buildWorldState } from './parse';

const syndicate = (expiry: string, ...rewards: string[]) => ({
	syndicate: 'Ostrons',
	expiry,
	jobs: [{ rewardPool: rewards }],
});

describe('deriveRotation', () => {
	it('maps the Narmer weapon to its rotation letter (Korumm → C)', () => {
		const r = deriveRotation([
			syndicate('2026-07-11T21:00:00.000Z', 'Korumm Blueprint', 'Caliban Neuroptics Blueprint'),
		]);
		expect(r).toEqual({ letter: 'C', expiry: '2026-07-11T21:00:00.000Z' });
	});
	it('maps Verdilac → A and Nepheri → B', () => {
		expect(deriveRotation([syndicate('x', 'Verdilac Blueprint')]).letter).toBe('A');
		expect(deriveRotation([syndicate('x', 'Nepheri Blueprint')]).letter).toBe('B');
	});
	it('returns null letter and expiry when no Narmer weapon is present', () => {
		expect(deriveRotation([syndicate('x', '200 Endo', 'Aya')])).toEqual({
			letter: null,
			expiry: null,
		});
	});
	it('takes expiry from the syndicate whose reward pool set the letter, not the first syndicate with any expiry', () => {
		// Mirrors production: unrelated syndicates (Arbiters, Suda, …) list first
		// with a near-hourly reset (15:59), while the bounty-bearing syndicates
		// (Ostrons/Solaris/Entrati) carry the Narmer weapon and the true ~2.5h
		// rotation expiry (17:00). The countdown must track the latter.
		const r = deriveRotation([
			{ syndicate: 'Arbiters of Hexis', expiry: '2026-07-12T15:59:00.000Z', jobs: [] },
			syndicate('2026-07-12T17:00:49.648Z', 'Korumm Blueprint'),
		]);
		expect(r).toEqual({ letter: 'C', expiry: '2026-07-12T17:00:49.648Z' });
	});
});

describe('toCycle', () => {
	it('trims to state + expiry', () => {
		expect(toCycle({ state: 'night', expiry: 'T', isDay: false } as never)).toEqual({
			state: 'night',
			expiry: 'T',
		});
	});
	it('defaults missing fields', () => {
		expect(toCycle({} as never)).toEqual({ state: 'unknown', expiry: '' });
	});
});

describe('buildWorldState', () => {
	it('composes ok payload from the four sources', () => {
		const ws = buildWorldState(
			{ state: 'day', expiry: 'c' },
			{ state: 'cold', expiry: 'v' },
			{ state: 'fass', expiry: 'm' },
			[syndicate('2026-07-11T21:00:00.000Z', 'Korumm Blueprint')],
			'2026-07-11T20:39:00.000Z',
		);
		expect(ws).toEqual({
			ok: true,
			fetchedAt: '2026-07-11T20:39:00.000Z',
			cetus: { state: 'day', expiry: 'c' },
			vallis: { state: 'cold', expiry: 'v' },
			cambion: { state: 'fass', expiry: 'm' },
			rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
		});
	});
});
