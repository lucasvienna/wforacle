/**
 * Glyphs for the three open-world cycle states: Plains of Eidolon runs
 * day/night, Orb Vallis warm/cold, and the Cambion Drift fass/vome.
 *
 * Shared by WorldStateTicker and the RegionPanel zone line, which each carried
 * their own identical copy (audit A4c).
 */
export const CYCLE_GLYPH: Record<string, string> = {
	day: '☀',
	night: '🌙',
	warm: '🔥',
	cold: '❄',
	fass: '🟠',
	vome: '🔵',
};
