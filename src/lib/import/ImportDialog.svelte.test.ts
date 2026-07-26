import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import ImportDialog from './ImportDialog.svelte';
import { createImportStore } from './importState.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { RawProfile } from './parseProfile';
import type { Dataset, Warframe } from '$lib/model/types';

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
const dataset = { warframes: frames, quests: [] } as unknown as Dataset;
const PROFILE: RawProfile = {
	loadout: { xpInfo: [{ uniqueName: '/Lotus/Powersuits/Rhino/Rhino' }] },
};

function useProfile(profile: RawProfile) {
	server.use(http.get(PROFILE_URL, () => HttpResponse.json(profile)));
}

function setup() {
	const tracker = createTracker(frames);
	const store = createImportStore(dataset);
	render(ImportDialog, { store, tracker, open: true, onclose: vi.fn() });
	return { tracker };
}

describe('ImportDialog', () => {
	it('renders nothing when closed', () => {
		const store = createImportStore(dataset);
		render(ImportDialog, { store, tracker: createTracker(frames), open: false, onclose: vi.fn() });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('fetches, previews, and applies to the tracker', async () => {
		useProfile(PROFILE);
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

	// The point of consuming errorKind: a different next action per failure,
	// not different words. The messages were already per-kind.
	async function submit(id: string) {
		await fireEvent.input(document.querySelector('[data-account-input]') as HTMLElement, {
			target: { value: id },
		});
		await fireEvent.click(document.querySelector('[data-import-run]') as HTMLElement);
		await waitFor(() => expect(document.querySelector('[data-import-error]')).toBeTruthy());
	}

	it('expands the "how to find your ID" help when the ID is malformed', async () => {
		setup();
		expect(document.querySelector('[data-import-help]')).not.toHaveAttribute('open');
		await submit('nope');
		expect(document.querySelector('[data-import-help]')).toHaveAttribute('open');
	});

	it('expands the help when the profile is not found', async () => {
		// Overwhelmingly this means the user pasted a display name.
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 404 })));
		setup();
		await submit('517d823a1a4d804218000052');
		expect(document.querySelector('[data-import-help]')).toHaveAttribute('open');
	});

	it('offers a retry for a transient failure, and does not expand the help', async () => {
		server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status: 429 })));
		setup();
		await submit('517d823a1a4d804218000052');
		expect(document.querySelector('[data-import-retry]')).toBeTruthy();
		expect(document.querySelector('[data-import-help]')).not.toHaveAttribute('open');
	});

	it('offers no retry for a wrong ID — retrying the same ID cannot help', async () => {
		setup();
		await submit('nope');
		expect(document.querySelector('[data-import-retry]')).toBeNull();
	});

	it('retry re-runs the fetch and can succeed', async () => {
		let calls = 0;
		server.use(
			http.get(PROFILE_URL, () => {
				calls += 1;
				return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(PROFILE);
			}),
		);
		setup();
		await submit('517d823a1a4d804218000052');

		await fireEvent.click(document.querySelector('[data-import-retry]') as HTMLElement);

		await waitFor(() => expect(document.querySelector('[data-import-preview]')).toBeTruthy());
		expect(calls).toBe(2);
	});

	it('announces the error to assistive tech', async () => {
		setup();
		await submit('nope');
		expect(screen.getByRole('alert')).toHaveTextContent(/24-character account ID/);
	});
});
