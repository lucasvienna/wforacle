import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import FrameCard from './FrameCard.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe, WarframePart } from '$lib/model/types';

const frame: Warframe = {
	id: 'rhino',
	name: 'Rhino',
	parts: [
		{ id: 'rhino:bp', frameId: 'rhino', slot: 'bp' },
		{ id: 'rhino:neuroptics', frameId: 'rhino', slot: 'neuroptics' },
		{ id: 'rhino:chassis', frameId: 'rhino', slot: 'chassis' },
		{ id: 'rhino:systems', frameId: 'rhino', slot: 'systems' },
	],
};

const sourceText = (p: WarframePart) => (p.slot === 'bp' ? 'Market' : 'Jackal');

function props(tracker = createTracker([frame]), overrides = {}) {
	return {
		frame,
		tracker,
		subLine: 'Fossa · Boss: Jackal',
		faction: 'Corpus',
		kindLabel: 'Assassination',
		sourceText,
		...overrides,
	};
}

describe('FrameCard', () => {
	it('starts expanded when defaultExpanded is true and shows the checklist + N/M', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute('data-expanded', 'true');
		expect(document.querySelector('[data-part="rhino:chassis"]')).toBeInTheDocument();
		expect(screen.getByText('0/4')).toBeInTheDocument();
		expect(screen.getByText(/Corpus · Assassination/)).toBeInTheDocument();
	});

	it('starts collapsed and shows ✓ done when the frame is complete', () => {
		const tracker = createTracker([frame]);
		tracker.toggleFrame('rhino'); // own everything
		render(FrameCard, props(tracker, { defaultExpanded: false }));
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute(
			'data-expanded',
			'false',
		);
		expect(screen.getByText('✓ done')).toBeInTheDocument();
		expect(document.querySelector('[data-part="rhino:chassis"]')).toBeNull();
	});

	it('does not auto-collapse when the last part is checked while open', async () => {
		const tracker = createTracker([frame]);
		for (const id of ['rhino:bp', 'rhino:neuroptics', 'rhino:chassis']) tracker.togglePart(id);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		tracker.togglePart('rhino:systems'); // now complete
		await Promise.resolve();
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute('data-expanded', 'true');
	});

	it('toggles a part via row click', () => {
		const tracker = createTracker([frame]);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		(document.querySelector('[data-part="rhino:chassis"]') as HTMLElement).click();
		expect(tracker.isOwned('rhino:chassis')).toBe(true);
	});

	it('toggles the whole frame via the toggle button', () => {
		const tracker = createTracker([frame]);
		render(FrameCard, props(tracker, { defaultExpanded: true }));
		screen.getByRole('button', { name: /toggle whole frame/i }).click();
		expect(tracker.isOwned('rhino:systems')).toBe(true);
	});

	it('collapses when the header is clicked', async () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		const header = document.querySelector('[data-frame="rhino"] button') as HTMLElement;
		header.click();
		await tick();
		expect(document.querySelector('[data-frame="rhino"]')).toHaveAttribute(
			'data-expanded',
			'false',
		);
	});

	it('shows the collapsed farm-cue summary only when collapsed', () => {
		render(
			FrameCard,
			props(undefined, {
				defaultExpanded: false,
				summary: { cls: 'text-emerald-300', text: '● up now' },
			}),
		);
		expect(screen.getByText('● up now')).toBeInTheDocument();
	});

	it('renders a · key hint when isKey is set', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true, isKey: true }));
		expect(document.querySelector('[data-key]')).toBeInTheDocument();
	});

	it('exposes part rows as checkboxes whose name carries the slot and source', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		const row = screen.getByRole('checkbox', { name: /Chassis/ });
		expect(row).toHaveAccessibleName(/Chassis.*Jackal/);
		expect(row).toHaveAttribute('aria-checked', 'false');
	});

	it('groups the part checkboxes under the frame name for screen-reader context', () => {
		render(FrameCard, props(undefined, { defaultExpanded: true }));
		const group = screen.getByRole('group', { name: 'Rhino' });
		expect(group).toContainElement(screen.getByRole('checkbox', { name: /Chassis/ }));
	});
});

const equinox: Warframe = {
	id: 'equinox',
	name: 'Equinox',
	nodeId: 'titania',
	parts: [
		{ id: 'equinox:bp', frameId: 'equinox', slot: 'bp', marketCost: 25000 },
		{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
		{ id: 'equinox:day:neuroptics', frameId: 'equinox', slot: 'neuroptics', aspect: 'day', chance: 25.81 },
		{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'day', chance: 25.81 },
		{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems', aspect: 'day', chance: 25.81 },
		{ id: 'equinox:night:bp', frameId: 'equinox', slot: 'bp', aspect: 'night', chance: 22.56 },
		{ id: 'equinox:night:neuroptics', frameId: 'equinox', slot: 'neuroptics', aspect: 'night', chance: 25.81 },
		{ id: 'equinox:night:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'night', chance: 25.81 },
		{ id: 'equinox:night:systems', frameId: 'equinox', slot: 'systems', aspect: 'night', chance: 25.81 },
	],
};

function equinoxProps(tracker = createTracker([equinox]), overrides = {}) {
	return {
		frame: equinox,
		tracker,
		subLine: 'Titania · Boss: Tyl Regor',
		faction: 'Grineer',
		kindLabel: 'Assassination',
		sourceText: () => 'Market (25,000cr)',
		aspectNote: 'Each Tyl Regor kill drops one Day and one Night component.',
		...overrides,
	};
}

describe('FrameCard (Equinox aspect groups)', () => {
	it('renders a Day and Night aspect group plus the market blueprint', () => {
		render(FrameCard, equinoxProps());
		expect(screen.getByText('Day Aspect')).toBeInTheDocument();
		expect(screen.getByText('Night Aspect')).toBeInTheDocument();
		// Day/Night BP leaves are labelled "Aspect Blueprint", not "Blueprint".
		expect(screen.getAllByText('Aspect Blueprint').length).toBe(2);
		expect(document.querySelector('[data-part="equinox:day:systems"]')).toBeInTheDocument();
	});

	it('shows the per-kill bottom note when the frame has aspects', () => {
		render(FrameCard, equinoxProps());
		expect(
			screen.getByText('Each Tyl Regor kill drops one Day and one Night component.'),
		).toBeInTheDocument();
	});
});
