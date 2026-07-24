import { describe, it, expect } from 'vitest';
import { entries } from './+page';

describe('guide prerender entries', () => {
	it('lists curated resources but not credits (bespoke static route)', async () => {
		const list = await entries();
		expect(list).toContainEqual({ resource: 'cryotic' });
		// Argon Crystal has no panel link (regionIds: []) — entries() is what
		// keeps it prerendered.
		expect(list).toContainEqual({ resource: 'argoncrystal' });
		// credits is served by src/routes/guides/credits — listing it here
		// would prerender the same path twice.
		expect(list).not.toContainEqual({ resource: 'credits' });
	});
});
