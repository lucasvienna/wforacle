import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchProfile, ProfileError } from './profileClient';

function mockFetch(res: Partial<Response> & { json?: () => Promise<unknown> }) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => res as Response),
	);
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchProfile', () => {
	const ID = '517d823a1a4d804218000052';

	it('returns parsed json on success', async () => {
		const body = { loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] } };
		mockFetch({ ok: true, status: 200, json: async () => body });
		await expect(fetchProfile(ID)).resolves.toEqual(body);
	});

	it('throws a notFound ProfileError on 404', async () => {
		mockFetch({ ok: false, status: 404, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'notFound' });
	});

	it('throws a rateLimited ProfileError on 403', async () => {
		mockFetch({ ok: false, status: 403, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'rateLimited' });
	});

	it('throws a network ProfileError when fetch rejects', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('offline');
			}),
		);
		await expect(fetchProfile(ID)).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws an empty ProfileError when the body has no usable data', async () => {
		mockFetch({ ok: true, status: 200, json: async () => ({}) });
		await expect(fetchProfile(ID)).rejects.toBeInstanceOf(ProfileError);
	});
});
