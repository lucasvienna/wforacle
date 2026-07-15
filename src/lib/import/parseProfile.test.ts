import { describe, it, expect } from 'vitest';
import { frameFolder, matchOwnedFrames, matchCompletedQuests, parseProfile } from './parseProfile';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

function frame(id: string, uniqueName: string, slots: string[]): Warframe {
	return {
		id,
		name: id,
		uniqueName,
		parts: slots.map((slot) => ({ id: `${id}:${slot}`, frameId: id, slot: slot as never })),
	};
}

const equinoxParts = [
	{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp' as never },
	{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp' as never, aspect: 'day' },
	{ id: 'equinox:day:neuroptics', frameId: 'equinox', slot: 'neuroptics' as never, aspect: 'day' },
	{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis' as never, aspect: 'day' },
	{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems' as never, aspect: 'day' },
	{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp' as never, aspect: 'night' },
	{ id: 'equinox:night:neuroptics', frameId: 'equinox', slot: 'neuroptics' as never, aspect: 'night' },
	{ id: 'equinox:night:chassis', frameId: 'equinox', slot: 'chassis' as never, aspect: 'night' },
	{ id: 'equinox:night:systems', frameId: 'equinox', slot: 'systems' as never, aspect: 'night' },
];

const frames: Warframe[] = [
	frame('rhino', '/Lotus/Powersuits/Rhino/Rhino', ['bp', 'neuroptics', 'chassis', 'systems']),
	frame('mesa', '/Lotus/Powersuits/Cowgirl/Cowgirl', ['bp', 'neuroptics', 'chassis', 'systems']),
	{
		id: 'equinox',
		name: 'equinox',
		uniqueName: '/Lotus/Powersuits/YinYang/YinYang',
		parts: equinoxParts,
	} as unknown as Warframe,
];

const dataset = {
	warframes: frames,
	quests: [{ id: 'thewarwithin' }, { id: 'theseconddream' }],
} as unknown as Dataset;

describe('frameFolder', () => {
	it('returns the parent folder segment', () => {
		expect(frameFolder('/Lotus/Powersuits/Rhino/Rhino')).toBe('Rhino');
	});
	it('collapses Prime/Umbra variants onto the base folder', () => {
		expect(frameFolder('/Lotus/Powersuits/Cowgirl/CowgirlPrime')).toBe('Cowgirl');
	});
	it('ignores non-powersuit paths', () => {
		expect(frameFolder('/Lotus/Types/Sentinels/SentinelPowersuits/ShadePowerSuit')).toBeNull();
	});
	it('ignores archwings', () => {
		expect(frameFolder('/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack')).toBeNull();
	});
});

describe('matchOwnedFrames', () => {
	const profile: RawProfile = {
		loadout: {
			xpInfo: [
				{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' },
				{ uniqueName: '/Lotus/Powersuits/Cowgirl/CowgirlPrime' }, // Mesa Prime → Mesa
				{ uniqueName: '/Lotus/Powersuits/Volt/Volt' }, // owned but untracked
				{ uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton' }, // not a frame
			],
		},
	};
	const res = matchOwnedFrames(profile, frames);
	it('matches base and variant frames by folder', () => {
		expect(res.frameIds.sort()).toEqual(['mesa', 'rhino']);
	});
	it('expands each owned frame to all its part ids', () => {
		expect(res.partIds).toContain('rhino:bp');
		expect(res.partIds).toContain('mesa:systems');
		expect(res.partIds).toHaveLength(8);
	});
	it('counts owned powersuits that are not tracked frames', () => {
		expect(res.ownedUntrackedCount).toBe(1); // Volt only; the weapon is ignored
	});
});

describe('matchCompletedQuests', () => {
	it('detects a quest when any marker challenge is present', () => {
		const profile: RawProfile = { challengeProgress: [{ name: 'TheWarWithin', progress: 1 }] };
		expect(matchCompletedQuests(profile, dataset.quests)).toEqual(['thewarwithin']);
	});
	it('returns nothing when no markers match', () => {
		const profile: RawProfile = { challengeProgress: [{ name: 'ApplyMod' }] };
		expect(matchCompletedQuests(profile, dataset.quests)).toEqual([]);
	});
});

describe('parseProfile', () => {
	it('combines frame and quest detection', () => {
		const profile: RawProfile = {
			loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/YinYang/YinYang' }] },
			challengeProgress: [{ name: 'SecondDreamTitleChallenge' }],
		};
		const res = parseProfile(profile, dataset);
		expect(res.frameIds).toEqual(['equinox']);
		expect(res.partIds.sort()).toEqual([
			'equinox:bp',
			'equinox:day:bp',
			'equinox:day:chassis',
			'equinox:day:neuroptics',
			'equinox:day:systems',
			'equinox:night:bp',
			'equinox:night:chassis',
			'equinox:night:neuroptics',
			'equinox:night:systems',
		]);
		expect(res.questIds).toEqual(['theseconddream']);
	});
});
