let reloaded = false;
let lastCheck = Date.now();

// `doReload` is injectable because jsdom (and real browsers) make
// `location.reload` unforgeable — tests can't spy on it directly.
export function reloadOnUpdate(doReload: () => void = () => location.reload()) {
	if (!('serviceWorker' in navigator)) return;
	if (!navigator.serviceWorker.controller) return;
	const reload = () => {
		if (reloaded) return;
		reloaded = true;
		doReload();
	};
	navigator.serviceWorker.addEventListener('controllerchange', reload);
	return () => navigator.serviceWorker.removeEventListener('controllerchange', reload);
}

export async function checkForUpdate() {
	if (!('serviceWorker' in navigator)) return;
	const now = Date.now();
	if (now - lastCheck < 1000 * 60 * 5) return;
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
