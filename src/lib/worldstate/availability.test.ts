import { describe, it, expect } from 'vitest';
import { partAvailability, nextActiveAt, formatCountdown } from './availability';

describe('partAvailability', () => {
	it('undefined rotation is always available (Exploiter Orb)', () => {
		expect(partAvailability(undefined, 'C')).toBe('always');
	});
	it('null letter is unknown (derivation failed)', () => {
		expect(partAvailability('C', null)).toBe('unknown');
	});
	it('"any" is available in every rotation', () => {
		expect(partAvailability('any', 'A')).toBe('available');
	});
	it('exact letter match is available, mismatch is unavailable', () => {
		expect(partAvailability('C', 'C')).toBe('available');
		expect(partAvailability('C', 'A')).toBe('unavailable');
	});
	it('"A/B" matches either A or B, not C', () => {
		expect(partAvailability('A/B', 'A')).toBe('available');
		expect(partAvailability('A/B', 'B')).toBe('available');
		expect(partAvailability('A/B', 'C')).toBe('unavailable');
	});
});

describe('nextActiveAt', () => {
	const expiry = '2026-07-11T21:00:00.000Z';
	it('returns null when available now, for "any", and when unknown', () => {
		expect(nextActiveAt('C', 'C', expiry)).toBeNull();
		expect(nextActiveAt('any', 'A', expiry)).toBeNull();
		expect(nextActiveAt('C', null, expiry)).toBeNull();
		expect(nextActiveAt(undefined, 'A', expiry)).toBeNull();
	});
	it('need C while A is current → next C window is one flip after expiry (150m)', () => {
		// windows after A: expiry→B, expiry+150m→C
		const at = nextActiveAt('C', 'A', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T23:30:00.000Z');
	});
	it('need B while A is current → B starts right at expiry', () => {
		const at = nextActiveAt('B', 'A', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T21:00:00.000Z');
	});
	it('"A/B" while C is current → the sooner one (A) at expiry', () => {
		const at = nextActiveAt('A/B', 'C', expiry)!;
		expect(at.toISOString()).toBe('2026-07-11T21:00:00.000Z');
	});
});

describe('formatCountdown', () => {
	it('formats h/m/s, dropping smaller units when a larger is present', () => {
		expect(formatCountdown(75 * 60 * 1000)).toBe('1h15m');
		expect(formatCountdown(90 * 1000)).toBe('1m');
		expect(formatCountdown(5 * 1000)).toBe('5s');
		expect(formatCountdown(0)).toBe('0s');
		expect(formatCountdown(-10)).toBe('0s');
	});
});
