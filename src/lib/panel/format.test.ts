import { describe, it, expect } from 'vitest';
import { formatChance, aspectBreakdownLines } from './format';

describe('formatChance', () => {
	it('shows exact two-decimal values without a tilde', () => {
		expect(formatChance(38.72)).toBe('38.72%');
		expect(formatChance(45)).toBe('45%');
		expect(formatChance(12.5)).toBe('12.5%');
	});
	it('rounds float noise to two decimals', () => {
		expect(formatChance(39.42999999999999)).toBe('39.43%');
	});
});

describe('aspectBreakdownLines', () => {
	it('returns the aspect chance then one line per sub-blueprint', () => {
		const part = {
			chance: 22.56,
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Chassis', chance: 25.81 },
				{ label: 'Systems', chance: 25.81 },
			],
		};
		expect(aspectBreakdownLines(part)).toEqual([
			'Aspect 22.56%',
			'Neuroptics 25.81%',
			'Chassis 25.81%',
			'Systems 25.81%',
		]);
	});
	it('formats differing chances per line', () => {
		const part = {
			chance: 22.56,
			subDrops: [
				{ label: 'Neuroptics', chance: 25.81 },
				{ label: 'Systems', chance: 10 },
			],
		};
		expect(aspectBreakdownLines(part)).toEqual([
			'Aspect 22.56%',
			'Neuroptics 25.81%',
			'Systems 10%',
		]);
	});
});
