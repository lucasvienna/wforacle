import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import PartRow from './PartRow.svelte';
import { createTracker } from '$lib/tracker/tracker.svelte';
import type { Warframe } from '$lib/model/types';

const frame: Warframe = {
	id: 'rhino',
	name: 'Rhino',
	nodeId: 'fossa',
	parts: [{ id: 'rhino:bp', frameId: 'rhino', slot: 'bp' }],
};
const label = createRawSnippet(() => ({ render: () => `<span>Blueprint</span>` }));

describe('PartRow', () => {
	it('renders an accessible checkbox row bound to the part', () => {
		const tracker = createTracker([frame]);
		const { container } = render(PartRow, {
			part: frame.parts[0],
			tracker,
			children: label,
		});
		const row = container.querySelector('[data-part="rhino:bp"]')!;
		expect(row).toBeInTheDocument();
		expect(row.getAttribute('role')).toBe('checkbox');
		expect(row.getAttribute('aria-checked')).toBe('false');
	});

	it('toggles ownership on click', async () => {
		const tracker = createTracker([frame]);
		const { container } = render(PartRow, {
			part: frame.parts[0],
			tracker,
			children: label,
		});
		(container.querySelector('[data-part="rhino:bp"]') as HTMLElement).click();
		expect(tracker.isOwned('rhino:bp')).toBe(true);
	});
});
