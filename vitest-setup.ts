import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';
import 'fake-indexeddb/auto';

// jsdom implements `.click()` on HTMLElement but not SVGElement; polyfill it so
// tests can call `.click()` on SVG nodes (e.g. our Star Chart planet labels).
if (typeof SVGElement !== 'undefined' && !SVGElement.prototype.click) {
	SVGElement.prototype.click = function (this: SVGElement) {
		this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	};
}
