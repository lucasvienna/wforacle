import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import AspectBreakdown from './AspectBreakdown.svelte';
import type { WarframePart } from '$lib/model/types';

const part: WarframePart = {
	id: 'equinox:dayaspect',
	frameId: 'equinox',
	slot: 'dayaspect',
	chance: 22.56,
	subDrops: [
		{ label: 'Neuroptics', chance: 25.81 },
		{ label: 'Chassis', chance: 25.81 },
		{ label: 'Systems', chance: 25.81 },
	],
};

describe('AspectBreakdown', () => {
	it('is expanded by default when the aspect is not owned, one line per blueprint', () => {
		render(AspectBreakdown, { part, owned: false });
		const text = document.body.textContent ?? '';
		expect(text).toContain('Aspect 22.56%');
		expect(text).toContain('Neuroptics 25.81%');
		expect(text).toContain('Chassis 25.81%');
		expect(text).toContain('Systems 25.81%');
	});

	it('is collapsed by default when the aspect is already owned', () => {
		render(AspectBreakdown, { part, owned: true });
		expect(document.body.textContent).not.toContain('Neuroptics 25.81%');
	});

	it('toggles open on caret click', async () => {
		const { container } = render(AspectBreakdown, { part, owned: true });
		const btn = container.querySelector('button')!;
		btn.click();
		await tick();
		expect(document.body.textContent).toContain('Neuroptics 25.81%');
	});
});
