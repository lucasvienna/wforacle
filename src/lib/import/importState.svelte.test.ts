import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { createImportStore } from './importState.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';
import { createTracker } from '$lib/tracker/tracker.svelte';

const ID = '517d823a1a4d804218000052';
const PROFILE_URL = 'https://api.warframestat.us/profile/:id';

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

function useProfile(profile: RawProfile) {
	server.use(http.get(PROFILE_URL, () => HttpResponse.json(profile)));
}

describe('createImportStore', () => {
	it('runs a fetch and produces a preview', async () => {
		useProfile(PROFILE);
		const store = createImportStore(dataset);
		await store.run(ID);
		expect(store.phase).toBe('preview');
		expect(store.result?.frameIds).toEqual(['rhino']);
		expect(store.result?.questIds).toEqual(['thewarwithin']);
	});

	it('rejects a malformed account id without fetching', async () => {
		let requests = 0;
		server.events.on('request:start', () => {
			requests += 1;
		});
		const store = createImportStore(dataset);
		await store.run('not-an-id');
		expect(store.phase).toBe('error');
		expect(requests).toBe(0);
	});

	it('surfaces a ProfileError message', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));
		const store = createImportStore(dataset);
		await store.run(ID);
		expect(store.phase).toBe('error');
		expect(store.error).toBe(
			'No profile found. Use your account ID from warframe.com/api/user-data, not your display name.',
		);
	});

	it('apply merges add-only into the tracker', async () => {
		useProfile(PROFILE);
		const tracker = createTracker(frames);
		tracker.togglePart('rhino:neuroptics'); // pre-existing manual check not in the profile
		const store = createImportStore(dataset);
		await store.run(ID);
		store.apply(tracker, ID, false);
		expect(tracker.isOwned('rhino:bp')).toBe(true); // from import
		expect(tracker.isOwned('rhino:chassis')).toBe(true); // from import
		expect(tracker.isOwned('rhino:neuroptics')).toBe(true); // preserved
		expect(tracker.isQuestDone('thewarwithin')).toBe(true);
		expect(store.phase).toBe('idle');
	});
});
