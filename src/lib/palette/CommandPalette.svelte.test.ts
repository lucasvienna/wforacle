import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CommandPalette from './CommandPalette.svelte';
import type { PaletteItem } from './search';

const items: PaletteItem[] = [
	{ type: 'region', id: 'venus', label: 'Venus', sublabel: 'Planet', targetRegionId: 'venus' },
	{
		type: 'frame',
		id: 'rhino',
		label: 'Rhino',
		sublabel: 'Frame · Venus',
		targetRegionId: 'venus',
	},
	{ type: 'resource', id: 'ferrite', label: 'Ferrite', sublabel: 'Resource' },
];

describe('CommandPalette', () => {
	it('renders nothing when closed', () => {
		render(CommandPalette, { items, open: false, onclose: vi.fn(), onselect: vi.fn() });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('shows the dialog and all items when open', () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Venus')).toBeInTheDocument();
		expect(screen.getByText('Rhino')).toBeInTheDocument();
		expect(screen.getByText('Ferrite')).toBeInTheDocument();
	});

	it('filters results as the user types', async () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'rhi' } });
		expect(screen.getByText('Rhino')).toBeInTheDocument();
		expect(screen.queryByText('Venus')).toBeNull();
		expect(screen.queryByText('Ferrite')).toBeNull();
	});

	it('selects the highlighted result on Enter and closes', async () => {
		const onselect = vi.fn();
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect });
		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'rhi' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(onselect).toHaveBeenCalledWith(items[1]);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('closes on Escape', async () => {
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect: vi.fn() });
		const input = screen.getByRole('textbox');
		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('moves the highlight with ArrowDown and selects the 2nd result on Enter', async () => {
		const onselect = vi.fn();
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect });
		const input = screen.getByRole('textbox');
		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(onselect).toHaveBeenCalledWith(items[1]);
		expect(onclose).toHaveBeenCalledOnce();
	});
});
