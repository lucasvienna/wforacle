import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SettingsDrawer from './SettingsDrawer.svelte';
import { seed } from '$lib/data/seed';
import { createTracker } from '$lib/tracker/tracker.svelte';

describe('SettingsDrawer', () => {
	it('renders nothing when closed', () => {
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: false,
			onclose: vi.fn(),
		});
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('shows the dialog and the Settings heading when open', () => {
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: true,
			onclose: vi.fn(),
		});
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Settings')).toBeInTheDocument();
	});

	it('calls onclose when the close button is clicked', async () => {
		const onclose = vi.fn();
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: true,
			onclose,
		});
		const closeBtn = document.querySelector('[data-close-settings]') as HTMLElement;
		await fireEvent.click(closeBtn);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('calls onclose on Escape', async () => {
		const onclose = vi.fn();
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: true,
			onclose,
		});
		await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('resets tracked parts through the two-step confirm flow', async () => {
		const tracker = createTracker(seed.warframes);
		tracker.togglePart('rhino:bp');
		expect(tracker.isOwned('rhino:bp')).toBe(true);

		render(SettingsDrawer, {
			dataset: seed,
			tracker,
			open: true,
			onclose: vi.fn(),
		});

		const resetBtn = document.querySelector('[data-reset-tracking]') as HTMLElement;
		await fireEvent.click(resetBtn);
		const confirmBtn = document.querySelector('[data-confirm-reset]');
		expect(confirmBtn).toBeTruthy();

		await fireEvent.click(confirmBtn as HTMLElement);
		expect(tracker.isOwned('rhino:bp')).toBe(false);
	});

	it('calls onclose when the backdrop is clicked', async () => {
		const onclose = vi.fn();
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: true,
			onclose,
		});
		// The backdrop is the role="presentation" element; a click on it (target
		// === currentTarget) dismisses the drawer, but clicks inside the panel do not.
		await fireEvent.click(screen.getByRole('presentation'));
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('moves focus to the close button on open', async () => {
		render(SettingsDrawer, {
			dataset: seed,
			tracker: createTracker(seed.warframes),
			open: true,
			onclose: vi.fn(),
		});
		const closeBtn = document.querySelector('[data-close-settings]');
		await waitFor(() => expect(document.activeElement).toBe(closeBtn));
	});
});
