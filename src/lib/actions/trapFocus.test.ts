import { describe, it, expect, afterEach } from 'vitest';
import { trapFocus } from './trapFocus';

describe('trapFocus', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('wraps Tab from the last tabbable element to the first', () => {
		document.body.innerHTML =
			'<div id="d"><button id="a">a</button><button id="b">b</button><button id="c">c</button></div>';
		const d = document.getElementById('d')!;
		const trap = trapFocus(d);

		document.getElementById('c')!.focus();
		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
		d.dispatchEvent(event);

		expect(document.activeElement?.id).toBe('a');
		expect(event.defaultPrevented).toBe(true);

		trap.destroy();
	});

	it('wraps Shift+Tab from the first tabbable element to the last', () => {
		document.body.innerHTML =
			'<div id="d"><button id="a">a</button><button id="b">b</button><button id="c">c</button></div>';
		const d = document.getElementById('d')!;
		const trap = trapFocus(d);

		document.getElementById('a')!.focus();
		const event = new KeyboardEvent('keydown', {
			key: 'Tab',
			shiftKey: true,
			bubbles: true,
			cancelable: true,
		});
		d.dispatchEvent(event);

		expect(document.activeElement?.id).toBe('c');
		expect(event.defaultPrevented).toBe(true);

		trap.destroy();
	});

	it('does nothing after destroy() is called', () => {
		document.body.innerHTML =
			'<div id="d"><button id="a">a</button><button id="b">b</button><button id="c">c</button></div>';
		const d = document.getElementById('d')!;
		const trap = trapFocus(d);
		trap.destroy();

		document.getElementById('c')!.focus();
		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
		d.dispatchEvent(event);

		expect(document.activeElement?.id).toBe('c');
		expect(event.defaultPrevented).toBe(false);
	});

	it('is a no-op with 0 tabbable elements', () => {
		document.body.innerHTML = '<div id="d"><span>not focusable</span></div>';
		const d = document.getElementById('d')!;
		const trap = trapFocus(d);

		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
		expect(() => d.dispatchEvent(event)).not.toThrow();
		expect(event.defaultPrevented).toBe(false);

		trap.destroy();
	});
});
