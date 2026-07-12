import { describe, it, expect, vi } from 'vitest';
import { createImportStore } from './importState.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';
import { createTracker } from '$lib/tracker/tracker.svelte';

function frame(id: string, uniqueName: string): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: ['bp', 'chassis'].map((slot) => ({
			id: `${id}:${slot}`,
			frameId: id,
			slot: slot as never,
		})),
	};
}
const frames = [frame('rhino', '/Lotus/Powersuits/Rhino/Rhino')];
const dataset = { warframes: frames, quests: [{ id: 'thewarwithin' }] } as unknown as Dataset;

const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
	challengeProgress: [{ name: 'TheWarWithin' }],
};

describe('createImportStore', () => {
	it('runs a fetch and produces a preview', async () => {
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		await store.run('517d823a1a4d804218000052');
		expect(store.phase).toBe('preview');
		expect(store.result?.frameIds).toEqual(['rhino']);
		expect(store.result?.questIds).toEqual(['thewarwithin']);
	});

	it('rejects a malformed account id without fetching', async () => {
		const fetchProfile = vi.fn();
		const store = createImportStore(dataset, { fetchProfile });
		await store.run('not-an-id');
		expect(store.phase).toBe('error');
		expect(fetchProfile).not.toHaveBeenCalled();
	});

	it('surfaces a ProfileError message', async () => {
		const { ProfileError } = await import('./profileClient');
		const store = createImportStore(dataset, {
			fetchProfile: async () => {
				throw new ProfileError('nope', 'notFound');
			},
		});
		await store.run('517d823a1a4d804218000052');
		expect(store.phase).toBe('error');
		expect(store.error).toBe('nope');
	});

	it('apply merges add-only into the tracker', async () => {
		const tracker = createTracker(frames);
		tracker.togglePart('rhino:neuroptics'); // pre-existing manual check not in the profile
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		await store.run('517d823a1a4d804218000052');
		store.apply(tracker, '517d823a1a4d804218000052', false);
		expect(tracker.isOwned('rhino:bp')).toBe(true); // from import
		expect(tracker.isOwned('rhino:chassis')).toBe(true); // from import
		expect(tracker.isOwned('rhino:neuroptics')).toBe(true); // preserved
		expect(tracker.isQuestDone('thewarwithin')).toBe(true);
		expect(store.phase).toBe('idle');
	});
});
