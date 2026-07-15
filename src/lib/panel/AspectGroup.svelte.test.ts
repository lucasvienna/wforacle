import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import AspectGroup from './AspectGroup.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe, WarframePart } from '$lib/model/types';

const dayParts: WarframePart[] = [
	{ id: 'equinox:day:bp', frameId: 'equinox', slot: 'bp', aspect: 'day', chance: 22.56 },
	{
		id: 'equinox:day:neuroptics',
		frameId: 'equinox',
		slot: 'neuroptics',
		aspect: 'day',
		chance: 25.81,
	},
	{ id: 'equinox:day:chassis', frameId: 'equinox', slot: 'chassis', aspect: 'day', chance: 25.81 },
	{ id: 'equinox:day:systems', frameId: 'equinox', slot: 'systems', aspect: 'day', chance: 25.81 },
];
const frame = { id: 'equinox', name: 'Equinox', nodeId: 'titania', parts: dayParts } as Warframe;

describe('AspectGroup', () => {
	it('renders the four leaves with labels and chances when expanded', () => {
		const tracker = createTracker([frame]);
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		const text = document.body.textContent ?? '';
		expect(text).toContain('Day Aspect');
		expect(text).toContain('Aspect Blueprint');
		expect(text).toContain('22.56%');
		expect(text).toContain('Neuroptics');
		expect(text).toContain('25.81%');
		expect(document.querySelector('[data-part="equinox:day:systems"]')).toBeInTheDocument();
	});

	it('shows an owned/total rollup that reflects the tracker', () => {
		const tracker = createTracker([frame]);
		tracker.togglePart('equinox:day:bp');
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		expect(document.body.textContent).toContain('1/4');
	});

	it('toggles a leaf via its checkbox without collapsing the group', () => {
		const tracker = createTracker([frame]);
		const { container } = render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		(container.querySelector('[data-part="equinox:day:chassis"]') as HTMLElement).click();
		expect(tracker.isOwned('equinox:day:chassis')).toBe(true);
	});

	it('collapses/expands on caret click without toggling any part', async () => {
		const tracker = createTracker([frame]);
		const { container } = render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		const caret = container.querySelector('button')!;
		caret.click();
		await tick();
		expect(document.body.textContent).not.toContain('Neuroptics');
		expect(tracker.isOwned('equinox:day:bp')).toBe(false);
	});

	it('seeds collapsed when every leaf is already owned', () => {
		const tracker = createTracker([frame]);
		for (const p of dayParts) tracker.togglePart(p.id);
		render(AspectGroup, { aspect: 'day', parts: dayParts, tracker });
		expect(document.body.textContent).not.toContain('Neuroptics');
	});
});
