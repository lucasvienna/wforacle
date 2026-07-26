/**
 * Keydown handler that treats Enter and Space as activation, the way a real
 * `<button>` does. For elements given a button/checkbox role by hand, which
 * get no such behaviour for free.
 *
 * The same six lines were inlined in PartRow, QuestsPanel and StarChart
 * (audit A4c). The `preventDefault` on Space is the part worth not
 * re-deriving: without it the page scrolls as well as activating.
 */
export function activateOnKey(activate: () => void) {
	return (e: KeyboardEvent) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		if (e.key === ' ') e.preventDefault();
		activate();
	};
}
