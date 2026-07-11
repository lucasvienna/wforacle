const TABBABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisible(el: HTMLElement): boolean {
	if (el.offsetParent !== null || el.getClientRects().length > 0) return true;
	// jsdom doesn't implement layout, so offsetParent/getClientRects are always
	// null/empty there regardless of actual visibility. Fall back to computed
	// style, which also more correctly handles real-browser edge cases (e.g.
	// position: fixed elements, which report offsetParent === null too).
	const style = getComputedStyle(el);
	return style.display !== 'none' && style.visibility !== 'hidden';
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
