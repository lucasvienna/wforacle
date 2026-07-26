import { describe, it, expect, afterEach } from 'vitest';
import { createFocusRestore } from './focusRestore';

function button(id: string) {
	const el = document.createElement('button');
	el.id = id;
	document.body.appendChild(el);
	return el;
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('createFocusRestore', () => {
	it('puts focus back where it was', () => {
		const trigger = button('trigger');
		const other = button('other');
		trigger.focus();

		const focus = createFocusRestore();
		focus.capture();
		other.focus();
		focus.restore();

		expect(document.activeElement).toBe(trigger);
	});

	it('does nothing when nothing was captured', () => {
		const other = button('other');
		other.focus();
		expect(() => createFocusRestore().restore()).not.toThrow();
		expect(document.activeElement).toBe(other);
	});

	it('survives the captured element being removed while the overlay is open', () => {
		// The remembered node can disappear — a region switch re-renders the
		// button that opened the drawer. `previous?.focus?.()` covers both the
		// null case and a node whose focus method is gone.
		const trigger = button('trigger');
		trigger.focus();

		const focus = createFocusRestore();
		focus.capture();
		trigger.remove();

		expect(() => focus.restore()).not.toThrow();
	});

	it('keeps separate instances independent', () => {
		const a = button('a');
		const b = button('b');
		const first = createFocusRestore();
		const second = createFocusRestore();

		a.focus();
		first.capture();
		b.focus();
		second.capture();

		first.restore();
		expect(document.activeElement).toBe(a);
		second.restore();
		expect(document.activeElement).toBe(b);
	});
});
