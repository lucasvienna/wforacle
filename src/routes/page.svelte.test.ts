import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('home page', () => {
	it('renders the brand', () => {
		render(Page);
		expect(screen.getByText(/wforacle/i)).toBeInTheDocument();
	});
});
