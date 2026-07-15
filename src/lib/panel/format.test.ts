import { describe, it, expect } from 'vitest';
import { formatChance } from './format';

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
