import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { fetchProfile, ProfileError } from './profileClient';

const PROFILE_URL = 'https://api.warframestat.us/profile/:id';

describe('fetchProfile', () => {
	const ID = '517d823a1a4d804218000052';

	it('returns parsed json on success', async () => {
		const body = { loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] } };
		server.use(http.get(PROFILE_URL, () => HttpResponse.json(body)));
		await expect(fetchProfile(ID)).resolves.toEqual(body);
	});

	it('throws a notFound ProfileError on 404', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'notFound' });
	});

	it('throws a rateLimited ProfileError on 403', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 403 })));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'rateLimited' });
	});

	it('throws a network ProfileError when fetch rejects', async () => {
		server.use(http.get(PROFILE_URL, () => HttpResponse.error()));
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws an empty ProfileError when the body has no usable data', async () => {
		server.use(http.get(PROFILE_URL, () => HttpResponse.json({})));
		await expect(fetchProfile(ID)).rejects.toBeInstanceOf(ProfileError);
	});

	it('requests the correctly encoded profile URL', async () => {
		let seenUrl: string | undefined;
		let seenAccept: string | null | undefined;
		server.use(
			http.get(PROFILE_URL, ({ request }) => {
				seenUrl = request.url;
				seenAccept = request.headers.get('accept');
				return HttpResponse.json({ loadout: { xpInfo: [{ uniqueName: '/x' }] } });
			}),
		);
		await fetchProfile(ID);
		expect(seenUrl).toBe('https://api.warframestat.us/profile/517d823a1a4d804218000052');
		expect(seenAccept).toBe('application/json');
	});
});
