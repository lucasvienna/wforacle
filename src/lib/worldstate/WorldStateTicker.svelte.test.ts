import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WorldStateTicker from './WorldStateTicker.svelte';
import type { WorldState } from './types';

const now = Date.parse('2026-07-11T20:39:00.000Z');
const state: WorldState = {
	ok: true,
	fetchedAt: 't',
	cetus: { state: 'night', expiry: '2026-07-11T21:00:00.000Z' },
	vallis: { state: 'cold', expiry: '2026-07-11T20:57:00.000Z' },
	cambion: { state: 'fass', expiry: '2026-07-11T21:00:00.000Z' },
	rotation: { letter: 'C', expiry: '2026-07-11T21:00:00.000Z' },
};

describe('WorldStateTicker', () => {
	it('renders cycles with countdowns and the rotation letter', () => {
		render(WorldStateTicker, { store: { state, error: false, now } });
		expect(screen.getByText(/Cetus night · 21m/)).toBeInTheDocument();
		expect(screen.getByText(/Vallis cold · 18m/)).toBeInTheDocument();
		expect(screen.getByText(/Cambion fass · 21m/)).toBeInTheDocument();
		expect(screen.getByText(/Rotation C · flips 21m/)).toBeInTheDocument();
	});
	it('omits the rotation chip when the letter is unknown', () => {
		const s = { ...state, rotation: { letter: null, expiry: null } };
		render(WorldStateTicker, { store: { state: s, error: false, now } });
		expect(screen.queryByText(/Rotation/)).toBeNull();
	});
	it('shows an unavailable fallback on error with no state', () => {
		render(WorldStateTicker, { store: { state: null, error: true, now } });
		expect(screen.getByText(/live status unavailable/i)).toBeInTheDocument();
	});
	it('shows a loading fallback before the first payload', () => {
		render(WorldStateTicker, { store: { state: null, error: false, now } });
		expect(screen.getByText(/loading live status/i)).toBeInTheDocument();
	});
});
