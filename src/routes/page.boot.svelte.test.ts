import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { seed } from '$lib/data/seed';

// Hoisted so the mock is controllable per test — the sibling page.svelte.test.ts
// only ever needs the happy path, so it keeps its simpler static mock.
const data = vi.hoisted(() => ({ loadDataset: vi.fn() }));
vi.mock('$lib/data/dataset', () => data);
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import Page from './+page.svelte';

const props = { data: { directory: [] }, params: {}, form: undefined };

describe('home page boot failure', () => {
	// Block body, deliberately. A concise `() => data.loadDataset.mockReset()`
	// returns the mock function, and Vitest treats a function returned from a
	// hook as a teardown callback — so it calls the mock again after the test,
	// leaving that rejection unhandled and failing the test with the very error
	// the test had just handled correctly.
	beforeEach(() => {
		data.loadDataset.mockReset();
	});
	afterEach(() => vi.restoreAllMocks());

	it('renders a recoverable error instead of hanging on "Loading Star Chart…"', async () => {
		// H2: loadDataset had no res.ok check and its one client caller had no
		// try/catch, so any 404/500/offline response left the app on the loading
		// placeholder forever, with the failure invisible to user and maintainer.
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		data.loadDataset.mockImplementation(() =>
			Promise.reject(new Error('dataset fetch failed: HTTP 404')),
		);

		render(Page, props);

		await waitFor(() => expect(document.querySelector('[data-load-error]')).toBeInTheDocument());
		expect(screen.queryByText('Loading Star Chart…')).not.toBeInTheDocument();
		expect(document.querySelector('[data-retry-load]')).toBeInTheDocument();
		expect(logged).toHaveBeenCalled();
	});

	it('keeps the raw error out of the DOM', async () => {
		// Diagnostics belong in the console; the UI gets a fixed, user-safe
		// message. A leaked status line or stack is noise at best.
		vi.spyOn(console, 'error').mockImplementation(() => {});
		data.loadDataset.mockImplementation(() =>
			Promise.reject(new Error('dataset fetch failed: HTTP 404')),
		);

		render(Page, props);

		await waitFor(() => expect(document.querySelector('[data-load-error]')).toBeInTheDocument());
		expect(document.body.textContent).not.toContain('HTTP 404');
		expect(document.body.textContent).not.toContain('dataset fetch failed');
	});

	it('recovers when Retry succeeds', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		data.loadDataset
			.mockImplementationOnce(() => Promise.reject(new Error('dataset fetch failed: HTTP 404')))
			.mockImplementation(() => Promise.resolve(seed));

		render(Page, props);

		await waitFor(() => expect(document.querySelector('[data-load-error]')).toBeInTheDocument());
		await fireEvent.click(document.querySelector('[data-retry-load]') as HTMLElement);

		// The chart replaces the error block: proves Retry refetches rather than
		// just clearing the message.
		await waitFor(() => expect(document.querySelector('svg')).toBeInTheDocument());
		expect(document.querySelector('[data-load-error]')).not.toBeInTheDocument();
		expect(data.loadDataset).toHaveBeenCalledTimes(2);
	});
});
