import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';
import 'fake-indexeddb/auto';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
	server.resetHandlers();
	server.events.removeAllListeners();
});
afterAll(() => server.close());

// jsdom implements `.click()` on HTMLElement but not SVGElement; polyfill it so
// tests can call `.click()` on SVG nodes (e.g. our Star Chart planet labels).
// The DOM lib doesn't type `.click()` on SVGElement, so reach it through a cast.
if (typeof SVGElement !== 'undefined') {
	const svgProto = SVGElement.prototype as SVGElement & { click?: () => void };
	if (!svgProto.click) {
		svgProto.click = function (this: SVGElement) {
			this.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		};
	}
}
