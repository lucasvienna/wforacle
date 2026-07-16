import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

// Minimal stand-in for navigator.serviceWorker (jsdom has none): tracks
// controllerchange listeners and lets tests fire the event on demand.
function stubServiceWorker({
	controller = {} as object | null,
	registration = undefined as { update: () => Promise<void> } | undefined,
} = {}) {
	const listeners = new Set<Listener>();
	const container = {
		controller,
		addEventListener: vi.fn((_type: string, fn: Listener) => listeners.add(fn)),
		removeEventListener: vi.fn((_type: string, fn: Listener) => listeners.delete(fn)),
		getRegistration: vi.fn(async () => registration),
		fireControllerChange: () => [...listeners].forEach((fn) => fn()),
	};
	Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
	return container;
}

// The module keeps `reloaded`/`lastCheck` at module level, so every test
// re-imports a fresh copy. Fake timers must be installed first: `lastCheck`
// captures Date.now() at import time.
async function importUpdate() {
	return await import('./update');
}

beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('reloadOnUpdate', () => {
	it('is a no-op when the browser has no service worker support', async () => {
		const { reloadOnUpdate } = await importUpdate();
		expect(reloadOnUpdate(vi.fn())).toBeUndefined();
	});

	it('does not listen on a first-ever visit (no controller yet)', async () => {
		const container = stubServiceWorker({ controller: null });
		const { reloadOnUpdate } = await importUpdate();
		const doReload = vi.fn();
		expect(reloadOnUpdate(doReload)).toBeUndefined();
		expect(container.addEventListener).not.toHaveBeenCalled();
	});

	it('reloads when a new worker takes control of an already-controlled page', async () => {
		const container = stubServiceWorker();
		const { reloadOnUpdate } = await importUpdate();
		const doReload = vi.fn();
		reloadOnUpdate(doReload);
		container.fireControllerChange();
		expect(doReload).toHaveBeenCalledOnce();
	});

	it('reloads at most once even if control changes again', async () => {
		const container = stubServiceWorker();
		const { reloadOnUpdate } = await importUpdate();
		const doReload = vi.fn();
		reloadOnUpdate(doReload);
		container.fireControllerChange();
		container.fireControllerChange();
		expect(doReload).toHaveBeenCalledOnce();
	});

	it('stops listening after its cleanup runs', async () => {
		const container = stubServiceWorker();
		const { reloadOnUpdate } = await importUpdate();
		const doReload = vi.fn();
		const cleanup = reloadOnUpdate(doReload);
		cleanup?.();
		container.fireControllerChange();
		expect(doReload).not.toHaveBeenCalled();
	});
});

describe('checkForUpdate', () => {
	it('is a no-op when the browser has no service worker support', async () => {
		const { checkForUpdate } = await importUpdate();
		await expect(checkForUpdate()).resolves.toBeUndefined();
	});

	it('skips the check inside the throttle window after load', async () => {
		const container = stubServiceWorker();
		const { checkForUpdate } = await importUpdate();
		vi.advanceTimersByTime(4 * 60 * 1000);
		await checkForUpdate();
		expect(container.getRegistration).not.toHaveBeenCalled();
	});

	it('asks the registration for an update once the throttle window has passed', async () => {
		const registration = { update: vi.fn(async () => {}) };
		stubServiceWorker({ registration });
		const { checkForUpdate } = await importUpdate();
		vi.advanceTimersByTime(6 * 60 * 1000);
		await checkForUpdate();
		expect(registration.update).toHaveBeenCalledOnce();
	});

	it('resolves quietly when no registration exists (e.g. dev mode)', async () => {
		stubServiceWorker({ registration: undefined });
		const { checkForUpdate } = await importUpdate();
		vi.advanceTimersByTime(6 * 60 * 1000);
		await expect(checkForUpdate()).resolves.toBeUndefined();
	});

	it('contains update() rejections so fire-and-forget callers never see them', async () => {
		// checkForUpdate is used directly as an event listener / interval
		// callback; update() rejects while offline, and that must not become
		// an unhandled promise rejection.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const registration = { update: vi.fn(async () => Promise.reject(new Error('offline'))) };
		stubServiceWorker({ registration });
		const { checkForUpdate } = await importUpdate();
		vi.advanceTimersByTime(6 * 60 * 1000);
		await expect(checkForUpdate()).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalledOnce();
	});

	it('re-arms the throttle after a successful check', async () => {
		const registration = { update: vi.fn(async () => {}) };
		stubServiceWorker({ registration });
		const { checkForUpdate } = await importUpdate();
		vi.advanceTimersByTime(6 * 60 * 1000);
		await checkForUpdate();
		// A burst of visibility flips right after a check must not spam
		// registration.update() — the previous check re-set the clock.
		await checkForUpdate();
		expect(registration.update).toHaveBeenCalledOnce();
	});
});
