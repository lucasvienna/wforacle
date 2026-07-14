import type { WarframePart } from '$lib/model/types';

/** Drop chance to 2 decimals (trailing zeros trimmed). Assassination boss
 * tables are exact 2-decimal weights that sum to 100%; open-world data carries
 * float noise (e.g. 39.4299…) that 2 decimals tidy. No approximation tilde. */
export function formatChance(chance: number): string {
	return `${Number(chance.toFixed(2))}%`;
}

/** Reference sub-blueprint line for a composite part (Equinox aspect):
 * "Aspect {chance}% · {grouped sub-components}". Consecutive sub-drops with
 * equal chances collapse to one segment, e.g. "Neuroptics/Chassis/Systems
 * 25.81%". */
export function aspectBreakdownText(part: Pick<WarframePart, 'chance' | 'subDrops'>): string {
	const segments: string[] = [];
	if (part.chance != null) segments.push(`Aspect ${formatChance(part.chance)}`);
	const subs = part.subDrops ?? [];
	let i = 0;
	while (i < subs.length) {
		let j = i;
		while (j + 1 < subs.length && subs[j + 1].chance === subs[i].chance) j++;
		const labels = subs
			.slice(i, j + 1)
			.map((d) => d.label)
			.join('/');
		segments.push(`${labels} ${formatChance(subs[i].chance)}`);
		i = j + 1;
	}
	return segments.join(' · ');
}
