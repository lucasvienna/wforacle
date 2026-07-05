import { describe, it, expect } from 'vitest';
import { parseNodeValue, parseDropLocation, slugify } from './parse';

describe('parse', () => {
	it('parses a solNodes value', () => {
		expect(parseNodeValue('Fossa (Venus)')).toEqual({ node: 'Fossa', planet: 'Venus' });
	});
	it('returns null for placeholder node values', () => {
		expect(parseNodeValue('SolNode0')).toBeNull();
	});
	it('parses a drop location', () => {
		expect(parseDropLocation('Venus/Fossa (Assassination)')).toEqual({
			planet: 'Venus',
			node: 'Fossa',
			type: 'Assassination',
		});
	});
	it('returns null for a non-node drop location', () => {
		expect(parseDropLocation('Cetus Bounty Rewards')).toBeNull();
	});
	it('slugifies names', () => {
		expect(slugify('Kuva Fortress')).toBe('kuvafortress');
		expect(slugify('Fossa')).toBe('fossa');
	});
});
