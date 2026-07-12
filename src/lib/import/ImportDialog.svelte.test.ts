import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ImportDialog from './ImportDialog.svelte';
import { createImportStore } from './importState.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

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
const dataset = { warframes: frames, quests: [] } as unknown as Dataset;
const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
};

function setup() {
	const tracker = createTracker(frames);
	const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
	render(ImportDialog, { store, tracker, open: true, onclose: vi.fn() });
	return { tracker };
}

describe('ImportDialog', () => {
	it('renders nothing when closed', () => {
		const store = createImportStore(dataset, { fetchProfile: async () => PROFILE });
		render(ImportDialog, { store, tracker: createTracker(frames), open: false, onclose: vi.fn() });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('fetches, previews, and applies to the tracker', async () => {
		const { tracker } = setup();
		await fireEvent.input(document.querySelector('[data-account-input]') as HTMLElement, {
			target: { value: '517d823a1a4d804218000052' },
		});
		await fireEvent.click(document.querySelector('[data-import-run]') as HTMLElement);
		await waitFor(() => expect(document.querySelector('[data-import-preview]')).toBeTruthy());
		await fireEvent.click(document.querySelector('[data-import-apply]') as HTMLElement);
		expect(tracker.isOwned('rhino:bp')).toBe(true);
	});

	it('shows an error for a malformed id', async () => {
		setup();
		await fireEvent.input(document.querySelector('[data-account-input]') as HTMLElement, {
			target: { value: 'nope' },
		});
		await fireEvent.click(document.querySelector('[data-import-run]') as HTMLElement);
		await waitFor(() => expect(document.querySelector('[data-import-error]')).toBeTruthy());
	});
});
