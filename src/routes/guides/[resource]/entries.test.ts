import { describe, it, expect } from 'vitest';
import { entries } from './+page';

describe('guide prerender entries', () => {
	it('lists curated resources but not credits (bespoke static route)', async () => {
		const list = await entries();
		expect(list).toContainEqual({ resource: 'cryotic' });
		// Argon Crystal has no panel link (regionIds: []) — entries() is what
		// keeps it prerendered.
		expect(list).toContainEqual({ resource: 'argoncrystal' });
		// credits and affinity are served by bespoke static routes — listing
		// them here would prerender the same paths twice.
		expect(list).not.toContainEqual({ resource: 'credits' });
		expect(list).not.toContainEqual({ resource: 'affinity' });
	});
});
