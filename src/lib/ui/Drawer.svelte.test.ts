import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import Drawer from './Drawer.svelte';

/**
 * The drawer shell is tested once here. ImportDialog and SettingsDrawer
 * previously hand-rolled all of this each, and only one of the two had any
 * coverage of it.
 */
const body = createRawSnippet(() => ({
	render: () => `<div><button data-inside type="button">Inside</button></div>`,
}));

const props = (over: Record<string, unknown> = {}) => ({
	open: true,
	title: 'Settings',
	onclose: () => {},
	children: body,
	...over,
});

describe('Drawer', () => {
	it('renders nothing when closed', () => {
		render(Drawer, props({ open: false }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('is a modal dialog named after its title', () => {
		render(Drawer, props());
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(dialog).toHaveAccessibleName('Settings');
		expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
	});

	it('moves focus to the close button on open', async () => {
		render(Drawer, props());
		await tick();
		expect(document.activeElement).toBe(screen.getByRole('button', { name: /close settings/i }));
	});

	it('restores focus to the trigger when it closes', async () => {
		// Not previously covered anywhere: all three overlays implemented focus
		// restore and none of them tested it.
		const trigger = document.createElement('button');
		document.body.appendChild(trigger);
		trigger.focus();
		expect(document.activeElement).toBe(trigger);

		const { rerender } = render(Drawer, props());
		await tick();
		expect(document.activeElement).not.toBe(trigger);

		await rerender(props({ open: false }));
		await tick();
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it('closes on Escape', async () => {
		const onclose = vi.fn();
		render(Drawer, props({ onclose }));
		await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('closes on a backdrop click', async () => {
		const onclose = vi.fn();
		render(Drawer, props({ onclose }));
		await fireEvent.click(document.querySelector('[role="presentation"]') as HTMLElement);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('does not close on a click inside the panel', async () => {
		// The backdrop handler checks target === currentTarget; without that a
		// click bubbling out of the panel would dismiss the drawer.
		const onclose = vi.fn();
		render(Drawer, props({ onclose }));
		await fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
		expect(onclose).not.toHaveBeenCalled();
	});

	it('closes on the ✕ button', async () => {
		const onclose = vi.fn();
		render(Drawer, props({ onclose }));
		await fireEvent.click(screen.getByRole('button', { name: /close settings/i }));
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('runs onopen when it opens, so callers can reset their own state', async () => {
		const onopen = vi.fn();
		const { rerender } = render(Drawer, props({ open: false, onopen }));
		expect(onopen).not.toHaveBeenCalled();
		await rerender(props({ open: true, onopen }));
		expect(onopen).toHaveBeenCalled();
	});

	it('spreads extra attributes onto the dialog and the close button', () => {
		// The data-* selector contract: e2e finds the import dialog by
		// data-import-dialog and the settings close button by data-close-settings.
		render(Drawer, props({ 'data-import-dialog': '', closeAttrs: { 'data-close-settings': '' } }));
		expect(document.querySelector('[data-import-dialog]')).toBe(screen.getByRole('dialog'));
		expect(document.querySelector('[data-close-settings]')).toBe(
			screen.getByRole('button', { name: /close settings/i }),
		);
	});

	it('derives a close label from the title, and lets it be overridden', () => {
		const { unmount } = render(Drawer, props({ title: 'Import from account' }));
		expect(screen.getByRole('button', { name: 'Close import from account' })).toBeInTheDocument();
		unmount();

		render(Drawer, props({ title: 'Import from account', closeLabel: 'Close import' }));
		expect(screen.getByRole('button', { name: 'Close import' })).toBeInTheDocument();
	});

	it('renders its children', () => {
		render(Drawer, props());
		expect(screen.getByRole('button', { name: 'Inside' })).toBeInTheDocument();
	});
});
