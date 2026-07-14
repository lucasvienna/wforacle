import type { WarframePart } from '$lib/model/types';

/** Drop chance to 2 decimals (trailing zeros trimmed). Assassination boss
 * tables are exact 2-decimal weights that sum to 100%; open-world data carries
 * float noise (e.g. 39.4299…) that 2 decimals tidy. No approximation tilde. */
export function formatChance(chance: number): string {
	return `${Number(chance.toFixed(2))}%`;
}

/** Reference sub-blueprint lines for a composite part (Equinox aspect), one
 * entry per line: the Aspect Blueprint (the part's own chance) followed by each
 * sub-component, e.g. ["Aspect 22.56%", "Neuroptics 25.81%", "Chassis 25.81%",
 * "Systems 25.81%"]. The caller renders each on its own line. */
export function aspectBreakdownLines(part: Pick<WarframePart, 'chance' | 'subDrops'>): string[] {
	const lines: string[] = [];
	if (part.chance != null) lines.push(`Aspect ${formatChance(part.chance)}`);
	for (const d of part.subDrops ?? []) lines.push(`${d.label} ${formatChance(d.chance)}`);
	return lines;
}
