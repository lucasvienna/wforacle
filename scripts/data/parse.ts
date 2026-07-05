export function slugify(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseNodeValue(value: string): { node: string; planet: string } | null {
	const m = value.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
	if (!m) return null;
	return { node: m[1].trim(), planet: m[2].trim() };
}

export function parseDropLocation(
	loc: string,
): { planet: string; node: string; type: string } | null {
	// Real WFCD drop locations sometimes append rotation info after the
	// mission type, e.g. "Uranus/Titania (Assassination), Rotation A" — allow
	// (and ignore) any trailing text after the closing paren.
	const m = loc.match(/^([^/]+)\/(.+?)\s*\(([^)]+)\)/);
	if (!m) return null;
	return { planet: m[1].trim(), node: m[2].trim(), type: m[3].trim() };
}
