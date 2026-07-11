const TABBABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisible(el: HTMLElement): boolean {
	// Computed style is the reliable signal in both real browsers and jsdom (which
	// has no layout, so offsetParent/getClientRects are always null/empty and can't
	// be used). `visibility: hidden` occupies a layout box, so it must be checked
	// unconditionally — a fast-path on offsetParent/getClientRects would let it slip
	// through. The dialogs this traps render all their controls directly, so an
	// element hidden only via an ancestor's `display: none` doesn't arise here.
	const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
	return !style || (style.display !== 'none' && style.visibility !== 'hidden');
}

function getTabbable(node: HTMLElement): HTMLElement[] {
	return Array.from(node.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(isVisible);
}

/**
 * Svelte action that traps Tab/Shift+Tab focus cycling within `node`,
 * wrapping from the last tabbable element back to the first (and vice
 * versa) for use in modal dialogs.
 */
export function trapFocus(node: HTMLElement): { destroy(): void } {
	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		const tabbable = getTabbable(node);
		if (tabbable.length === 0) return;

		const first = tabbable[0];
		const last = tabbable[tabbable.length - 1];
		const active = document.activeElement;
		const focusWithinNode = active instanceof Node && node.contains(active);

		if (e.shiftKey) {
			if (!focusWithinNode || active === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (!focusWithinNode || active === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		},
	};
}
