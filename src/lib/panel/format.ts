/** Drop chance to 2 decimals (trailing zeros trimmed). Assassination boss
 * tables are exact 2-decimal weights that sum to 100%; open-world data carries
 * float noise (e.g. 39.4299…) that 2 decimals tidy. No approximation tilde. */
export function formatChance(chance: number): string {
	return `${Number(chance.toFixed(2))}%`;
}
