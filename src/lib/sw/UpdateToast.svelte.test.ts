import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import UpdateToast from './UpdateToast.svelte';

describe('UpdateToast', () => {
	it('announces the new version as a status region', () => {
		render(UpdateToast, { onrefresh: vi.fn(), ondismiss: vi.fn() });
		expect(screen.getByRole('status')).toHaveTextContent('New version available');
	});

	it('calls onrefresh when Refresh is clicked', () => {
		const onrefresh = vi.fn();
		render(UpdateToast, { onrefresh, ondismiss: vi.fn() });
		screen.getByRole('button', { name: 'Refresh' }).click();
		expect(onrefresh).toHaveBeenCalledOnce();
	});

	it('calls ondismiss when the dismiss button is clicked', () => {
		const ondismiss = vi.fn();
		render(UpdateToast, { onrefresh: vi.fn(), ondismiss });
		screen.getByRole('button', { name: 'Dismiss' }).click();
		expect(ondismiss).toHaveBeenCalledOnce();
	});
});
