import type { RawProfile } from './parseProfile';

export type ProfileErrorKind = 'notFound' | 'network' | 'rateLimited' | 'empty';

export class ProfileError extends Error {
	constructor(
		message: string,
		readonly kind: ProfileErrorKind,
	) {
		super(message);
		this.name = 'ProfileError';
	}
}

const BASE = 'https://api.warframestat.us/profile';

/** Fetch a player's public profile by account id, directly from warframestat.us
 * (CORS is open, no proxy needed). Throws ProfileError with a user-facing
 * message on any failure. */
export async function fetchProfile(accountId: string): Promise<RawProfile> {
	let res: Response;
	try {
		res = await fetch(`${BASE}/${encodeURIComponent(accountId)}`, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(15000),
		});
	} catch {
		throw new ProfileError(
			"Couldn't reach the profile service. Check your connection and try again.",
			'network',
		);
	}
	if (res.status === 404)
		throw new ProfileError(
			'No profile found. Use your account ID from warframe.com/api/user-data, not your display name.',
			'notFound',
		);
	if (res.status === 403 || res.status === 429)
		throw new ProfileError(
			'The profile service is rate-limiting requests right now. Please try again in a moment.',
			'rateLimited',
		);
	if (!res.ok) throw new ProfileError("Couldn't load that profile. Please try again.", 'network');

	const data = (await res.json()) as RawProfile;
	if (!data || (!data.loadout?.xpInfo && !data.challengeProgress))
		throw new ProfileError('That profile returned no usable data.', 'empty');
	return data;
}
