/** Normalize a pasted account id. Tolerates the common paste mistakes — a
 * "user_id" label, wrapping quotes, a colon, and whitespace — by dropping the
 * label word then stripping every non-hex character, and finally requires
 * exactly 24 hex chars. Returns the lowercased id, or null if it doesn't look
 * like an account id. (A full user-data JSON blob is intentionally out of
 * scope; this normalizes an id, it does not parse JSON.) */
export function normalizeAccountId(raw: string): string | null {
	const cleaned = raw
		.replace(/user_id/gi, '')
		.replace(/[^a-fA-F0-9]/g, '')
		.toLowerCase();
	return /^[a-f0-9]{24}$/.test(cleaned) ? cleaned : null;
}
