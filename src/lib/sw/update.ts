// Deploy checks are cheap (conditional GET of service-worker.js, a 304 with
// no body after the first fetch), so a short window just narrows how long a
// tab stays unaware of a new build.
const CHECK_THROTTLE_MS = 1000 * 60 * 2;

let notified = false;
let lastCheck = Date.now();

/**
 * Calls `onUpdate` (at most once) when a new service worker takes control of
 * an already-controlled page — i.e. a fresh deploy just activated. The page
 * decides how to react (we show a toast; reloading stays the user's choice).
 *
 * No-op on pages the SW doesn't control yet: a first-ever visit fires
 * controllerchange when the initial worker claims the page, and announcing
 * "new version available" to a page that already is the newest version
 * would be wrong.
 */
export function onUpdateAvailable(onUpdate: () => void) {
	if (!('serviceWorker' in navigator)) return;
	if (!navigator.serviceWorker.controller) return;
	const notify = () => {
		if (notified) return;
		notified = true;
		onUpdate();
	};
	navigator.serviceWorker.addEventListener('controllerchange', notify);
	return () => navigator.serviceWorker.removeEventListener('controllerchange', notify);
}

export async function checkForUpdate() {
	if (!('serviceWorker' in navigator)) return;
	const now = Date.now();
	if (now - lastCheck < CHECK_THROTTLE_MS) return;
	try {
		const sw = await navigator.serviceWorker.getRegistration();
		if (sw === undefined) return;
		lastCheck = now;
		await sw.update();
	} catch (err) {
		// Ignore update errors (e.g. offline/race conditions) so callers don't get unhandled rejections.
		console.warn('SW update check failed:', (err as Error).toString());
	}
}
