import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { tick } from 'svelte';
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
		const input = screen.getByRole('combobox');
		await fireEvent.input(input, { target: { value: 'rhi' } });
		expect(screen.getByText('Rhino')).toBeInTheDocument();
		expect(screen.queryByText('Venus')).toBeNull();
		expect(screen.queryByText('Ferrite')).toBeNull();
	});

	it('selects the highlighted result on Enter and closes', async () => {
		const onselect = vi.fn();
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect });
		const input = screen.getByRole('combobox');
		await fireEvent.input(input, { target: { value: 'rhi' } });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(onselect).toHaveBeenCalledWith(items[1]);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('closes on Escape', async () => {
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect: vi.fn() });
		const input = screen.getByRole('combobox');
		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('moves the highlight with ArrowDown and selects the 2nd result on Enter', async () => {
		const onselect = vi.fn();
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect });
		const input = screen.getByRole('combobox');
		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(onselect).toHaveBeenCalledWith(items[1]);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('resets the highlight to the top result when the query changes after arrowing', async () => {
		const onselect = vi.fn();
		const onclose = vi.fn();
		render(CommandPalette, { items, open: true, onclose, onselect });
		const input = screen.getByRole('combobox');

		// Arrow down onto the 2nd unfiltered result (Rhino).
		await fireEvent.keyDown(input, { key: 'ArrowDown' });

		// Narrow the query to a set of items where the stale highlight index
		// would land on a different item ("e" matches Venus, Ferrite, Rhino
		// in that ranked order).
		await fireEvent.input(input, { target: { value: 'e' } });

		await fireEvent.keyDown(input, { key: 'Enter' });

		// Should select the top-ranked match (Venus), not whatever now sits
		// at the stale highlight index.
		expect(onselect).toHaveBeenCalledWith(items[0]);
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('exposes combobox semantics on the input', () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		const input = screen.getByRole('combobox');
		expect(input).toHaveAttribute('aria-controls', 'palette-listbox');
		expect(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('tracks the highlighted option via aria-activedescendant', async () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		const input = screen.getByRole('combobox');
		const options = screen.getAllByRole('option');

		expect(input).toHaveAttribute('aria-activedescendant', 'palette-opt-0');
		expect(options[0]).toHaveAttribute('id', 'palette-opt-0');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(input).toHaveAttribute('aria-activedescendant', 'palette-opt-1');
		expect(options[1]).toHaveAttribute('id', 'palette-opt-1');
	});

	it('traps focus, wrapping Tab from the last option back to the input', async () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		await tick(); // let the open-effect's deferred autofocus settle first
		const input = screen.getByRole('combobox');
		const options = screen.getAllByRole('option');
		const lastOption = options[options.length - 1] as HTMLElement;

		lastOption.focus();
		expect(document.activeElement).toBe(lastOption);

		await fireEvent.keyDown(lastOption, { key: 'Tab', bubbles: true });
		expect(document.activeElement).toBe(input);
	});

	it('traps focus, wrapping Shift+Tab from the input back to the last option', async () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		await tick(); // let the open-effect's deferred autofocus settle first
		const input = screen.getByRole('combobox');
		const options = screen.getAllByRole('option');
		const lastOption = options[options.length - 1] as HTMLElement;

		input.focus();
		expect(document.activeElement).toBe(input);

		await fireEvent.keyDown(input, { key: 'Tab', shiftKey: true, bubbles: true });
		expect(document.activeElement).toBe(lastOption);
	});

	it('exposes combobox autocomplete semantics on the input', () => {
		render(CommandPalette, { items, open: true, onclose: vi.fn(), onselect: vi.fn() });
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-autocomplete', 'list');
	});
});
