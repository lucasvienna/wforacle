import { http, HttpResponse } from 'msw';

// Default handlers so no request is left unhandled (setupServer runs with
// onUnhandledRequest: 'error'). Individual tests override these with
// `server.use(...)` for the specific status / payload they need.
export const handlers = [
	http.get('https://api.warframestat.us/profile/:id', () =>
		HttpResponse.json({ loadout: { xpInfo: [] } }),
	),
	http.get('https://api.warframestat.us/pc/:endpoint', () => HttpResponse.json({})),
	http.get('*/api/worldstate', () => HttpResponse.json({ ok: false })),
];
