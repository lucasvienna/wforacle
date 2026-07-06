import { describe, it, expect } from 'vitest';
import { SPECIAL_REGIONS, QUESTS } from './special';
import { slugify } from './parse';

describe('special regions + quests', () => {
	it('has 5 special regions, Deimos gated by Heart of Deimos', () => {
		expect(SPECIAL_REGIONS).toHaveLength(5);
		const deimos = SPECIAL_REGIONS.find((r) => r.name === 'Deimos')!;
		expect(deimos.spoilerGated).toBe(true);
		expect(deimos.questId).toBe('heartofdeimos');
		expect(SPECIAL_REGIONS.find((r) => r.name === 'Void')!.spoilerGated).toBe(false);
	});
	it('every gated region has a quest that reveals it', () => {
		for (const r of SPECIAL_REGIONS.filter((x) => x.spoilerGated)) {
			const q = QUESTS.find((q) => q.id === r.questId)!;
			expect(q).toBeTruthy();
			expect(q.revealsRegionIds).toContain(slugify(r.name));
		}
	});
	it('Heart of Deimos reveals nekros', () => {
		expect(QUESTS.find((q) => q.id === 'heartofdeimos')!.revealsFrameIds).toContain('nekros');
	});
});
