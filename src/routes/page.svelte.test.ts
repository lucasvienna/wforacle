import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { seed } from '$lib/data/seed';

vi.mock('$lib/data/dataset', () => ({ loadDataset: () => Promise.resolve(seed) }));

import Page from './+page.svelte';

describe('home page', () => {
	it('renders brand immediately and chart+panel after data loads', async () => {
		render(Page);
		// brand text is split across nested <span>s for styling, so the default
		// getByText (which only checks direct text nodes) can't match it directly;
		// use a matcher function that checks the element's full textContent instead.
		// Restrict to the <span> itself — while data is loading the <header> has
		// no other content, so its textContent also collapses to "wforacle" and
		// would otherwise ambiguously match alongside the brand span.
		expect(
			screen.getByText(
				(_, element) =>
					element?.tagName === 'SPAN' && element?.textContent?.trim().toLowerCase() === 'wforacle',
			),
		).toBeInTheDocument();
		// dataset load is async (onMount), so chart/panel only appear once it resolves
		await waitFor(() => expect(screen.getByText('VENUS')).toBeInTheDocument());
		// panel (Venus selected) — boss name appears in subtitle + part-source labels
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);
	});
});
