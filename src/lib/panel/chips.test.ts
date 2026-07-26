import { describe, it, expect } from 'vitest';
import type { Warframe, WarframePart } from '$lib/model/types';
import type { WorldState } from '$lib/worldstate/types';
import { zoneCycleLine, owAvailabilityChip, owSummary } from './chips';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');
const at = (ms: number) => new Date(NOW + ms).toISOString();

const ws = (over: Partial<WorldState> = {}): WorldState => ({
	ok: true,
	fetchedAt: at(0),
	cetus: { state: 'day', expiry: at(3_600_000) },
	vallis: { state: 'warm', expiry: at(600_000) },
	cambion: { state: 'fass', expiry: at(1_800_000) },
	rotation: { letter: 'B', expiry: at(900_000) },
	...over,
});

const part = (over: Partial<WarframePart> = {}): WarframePart => ({
	id: 'gara:chassis',
	frameId: 'gara',
	slot: 'chassis',
	...over,
});

const frame = (parts: WarframePart[]): Warframe => ({ id: 'gara', name: 'Gara', parts });
const ownsNothing = () => false;

describe('zoneCycleLine', () => {
	it('renders glyph, state and countdown for a known zone', () => {
		expect(zoneCycleLine('Plains of Eidolon', ws(), NOW)).toBe('☀ day · 1h0m');
	});

	it('maps each open world to its own cycle', () => {
		expect(zoneCycleLine('Orb Vallis', ws(), NOW)).toContain('warm');
		expect(zoneCycleLine('Cambion Drift', ws(), NOW)).toContain('fass');
	});

	it('returns null for a node that is not a cycling zone', () => {
		expect(zoneCycleLine('Tyana Pass', ws(), NOW)).toBeNull();
	});

	it('returns null when there is no live data', () => {
		expect(zoneCycleLine('Plains of Eidolon', null, NOW)).toBeNull();
	});

	it.each([
		['missing', ''],
		['malformed', 'not-a-date'],
	])('returns null rather than a NaN countdown for a %s expiry', (_label, expiry) => {
		const state = ws({ cetus: { state: 'day', expiry } });
		expect(zoneCycleLine('Plains of Eidolon', state, NOW)).toBeNull();
	});
});

describe('owAvailabilityChip', () => {
	it('marks a part up now when its rotation matches the live letter', () => {
		const chip = owAvailabilityChip(part({ rotation: 'B' }), ws(), NOW);
		expect(chip).toMatchObject({ cls: 'text-emerald-300' });
		expect(chip?.text).toMatch(/^● up now · resets /);
	});

	it('marks a rotation-less component as always available', () => {
		expect(owAvailabilityChip(part(), ws(), NOW)).toEqual({
			cls: 'text-emerald-300',
			text: '● always available',
		});
	});

	it('marks an off-rotation part with its next-up countdown', () => {
		const chip = owAvailabilityChip(part({ rotation: 'C' }), ws(), NOW);
		expect(chip?.cls).toBe('text-wf-muted');
		expect(chip?.text).toMatch(/^○ Rot C · up in /);
	});

	it('renders nothing for a bare blueprint slot', () => {
		expect(owAvailabilityChip(part({ slot: 'bp' }), ws(), NOW)).toBeNull();
	});

	it('renders nothing when there is no live data', () => {
		expect(owAvailabilityChip(part({ rotation: 'B' }), null, NOW)).toBeNull();
	});

	// Regression: a malformed upstream expiry reached formatCountdown as NaN and
	// rendered "● up now · resets NaNs" to users. Pre-existing on main —
	// zoneCycleLine guarded it, these two paths did not.
	it.each([
		['available', 'B', /^● up now$/],
		['unavailable', 'C', /^○ Rot C$/],
	])('drops the countdown clause rather than showing NaN (%s)', (_label, rotation, expected) => {
		const state = ws({ rotation: { letter: 'B', expiry: 'not-a-date' } });
		expect(owAvailabilityChip(part({ rotation }), state, NOW)?.text).toMatch(expected);
	});

	it('renders nothing when the rotation letter is underivable', () => {
		const chip = owAvailabilityChip(
			part({ rotation: 'B' }),
			ws({ rotation: { letter: null, expiry: null } }),
			NOW,
		);
		expect(chip).toBeNull();
	});
});

describe('owSummary', () => {
	const needed = [part({ id: 'gara:chassis', rotation: 'B' }), part({ id: 'gara:bp', slot: 'bp' })];

	it('says "up now" when a still-needed component is on rotation', () => {
		expect(owSummary(frame(needed), ws(), ownsNothing)).toEqual({
			cls: 'text-emerald-300',
			text: '● up now',
		});
	});

	it('says "not this rotation" when nothing needed is up', () => {
		expect(owSummary(frame([part({ rotation: 'C' })]), ws(), ownsNothing)).toEqual({
			cls: 'text-wf-muted',
			text: '○ not this rotation',
		});
	});

	it('returns null once every farmable part is owned', () => {
		// A completed frame shows its ✓ instead of a farm cue.
		expect(owSummary(frame(needed), ws(), () => true)).toBeNull();
	});

	it('ignores a bare blueprint when deciding what is left to farm', () => {
		// Only the bp is unowned, and a bare bp is not farmed on rotation.
		const owns = (id: string) => id !== 'gara:bp';
		expect(owSummary(frame(needed), ws(), owns)).toBeNull();
	});

	it('counts a drop-sourced blueprint as farmable', () => {
		const f = frame([part({ id: 'citrine:bp', slot: 'bp', dropSourceNodeId: 'SolNode450' })]);
		expect(owSummary(f, ws(), ownsNothing)).not.toBeNull();
	});

	it('claims nothing when the rotation letter is underivable', () => {
		const state = ws({ rotation: { letter: null, expiry: null } });
		expect(owSummary(frame([part({ rotation: 'C' })]), state, ownsNothing)).toBeNull();
	});

	it('returns null when there is no live data', () => {
		expect(owSummary(frame(needed), null, ownsNothing)).toBeNull();
	});
});
