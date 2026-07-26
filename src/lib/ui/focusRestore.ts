/**
 * Remember where focus was before an overlay opened, and put it back on close.
 *
 * The same eight lines existed in ImportDialog, SettingsDrawer and
 * CommandPalette. The drawers now get this via Drawer; CommandPalette is a
 * combobox rather than a drawer, so it uses the helper directly.
 */
export function createFocusRestore() {
	let previous: HTMLElement | null = null;

	return {
		/** Call as the overlay opens. */
		capture() {
			// Guarded for SSR, where there is no document to read focus from.
			previous =
				typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
		},
		/**
		 * Call as it closes. Optional-chained on `focus` as well as on the
		 * element: the remembered node may have been removed from the DOM while
		 * the overlay was open.
		 */
		restore() {
			previous?.focus?.();
		},
	};
}
