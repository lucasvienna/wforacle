import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('home page', () => {
	it('renders brand, chart and panel', () => {
		render(Page);
		// brand text is split across nested <span>s for styling, so the default
		// getByText (which only checks direct text nodes) can't match it directly;
		// use a matcher function that checks the element's full textContent instead.
		expect(
			screen.getByText((_, element) => element?.textContent?.trim().toLowerCase() === 'wforacle'),
		).toBeInTheDocument();
		expect(screen.getByText('VENUS')).toBeInTheDocument(); // chart
		// panel (Venus selected) — boss name appears in subtitle + part-source labels
		expect(screen.getAllByText(/Jackal/).length).toBeGreaterThan(0);
	});
});
