import { describe, it, expect } from 'vitest';
import { normalizeAccountId } from './accountId';

describe('normalizeAccountId', () => {
	const ID = '517d823a1a4d804218000052';

	it('accepts a clean 24-hex id', () => {
		expect(normalizeAccountId(ID)).toBe(ID);
	});
	it('trims surrounding whitespace', () => {
		expect(normalizeAccountId(`  ${ID}\n`)).toBe(ID);
	});
	it('strips wrapping quotes', () => {
		expect(normalizeAccountId(`"${ID}"`)).toBe(ID);
	});
	it('extracts the id from a pasted user_id field', () => {
		expect(normalizeAccountId(`"user_id": "${ID}"`)).toBe(ID);
	});
	it('lowercases hex', () => {
		expect(normalizeAccountId(ID.toUpperCase())).toBe(ID);
	});
	it('rejects a display name', () => {
		expect(normalizeAccountId('Tobiah')).toBeNull();
	});
	it('rejects a too-short id', () => {
		expect(normalizeAccountId('517d823a')).toBeNull();
	});
});
