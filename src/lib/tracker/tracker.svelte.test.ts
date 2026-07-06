import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createTracker } from './tracker.svelte';
import { seed } from '$lib/data/seed';

describe('tracker', () => {
	it('toggles a single part', () => {
		const t = createTracker(seed.warframes);
		expect(t.isOwned('rhino:bp')).toBe(false);
		t.togglePart('rhino:bp');
		expect(t.isOwned('rhino:bp')).toBe(true);
		t.togglePart('rhino:bp');
		expect(t.isOwned('rhino:bp')).toBe(false);
	});
	it('toggleFrame owns all then clears all', () => {
		const t = createTracker(seed.warframes);
		t.toggleFrame('rhino');
		expect(t.frameCount('rhino')).toEqual({ owned: 4, total: 4 });
		t.toggleFrame('rhino');
		expect(t.frameCount('rhino')).toEqual({ owned: 0, total: 4 });
	});
	it('aggregates a reactive total', () => {
		const t = createTracker(seed.warframes);
		t.togglePart('rhino:bp');
		t.togglePart('hydroid:chassis');
		expect(t.total).toEqual({ owned: 2, total: 12 });
	});
	it('round-trips a snapshot', () => {
		const t = createTracker(seed.warframes);
		t.load(['rhino:bp', 'excalibur:systems']);
		expect(t.snapshot().sort()).toEqual(['excalibur:systems', 'rhino:bp']);
	});
	it('wires persist to fire on ownership changes', () => {
		const calls: string[][] = [];
		const t = createTracker(seed.warframes, (ids) => calls.push([...ids]));
		flushSync();
		t.togglePart('rhino:bp');
		flushSync();
		expect(calls[calls.length - 1]).toContain('rhino:bp');
		t.dispose();
	});
	it('toggles a completed quest', () => {
		const t = createTracker(seed.warframes);
		expect(t.isQuestDone('heartofdeimos')).toBe(false);
		t.toggleQuest('heartofdeimos');
		expect(t.isQuestDone('heartofdeimos')).toBe(true);
		expect(t.completedQuests.has('heartofdeimos')).toBe(true);
		t.toggleQuest('heartofdeimos');
		expect(t.isQuestDone('heartofdeimos')).toBe(false);
		expect(t.completedQuests.has('heartofdeimos')).toBe(false);
	});
	it('round-trips a quest snapshot', () => {
		const t = createTracker(seed.warframes);
		t.loadQuestState(['heartofdeimos', 'thewarwithin']);
		expect(t.questSnapshot().sort()).toEqual(['heartofdeimos', 'thewarwithin']);
	});
	it('wires persistQuests to fire on quest changes', () => {
		const calls: string[][] = [];
		const t = createTracker(seed.warframes, undefined, (ids) => calls.push([...ids]));
		flushSync();
		t.toggleQuest('heartofdeimos');
		flushSync();
		expect(calls[calls.length - 1]).toContain('heartofdeimos');
		t.dispose();
	});
});
