/**
 * The data half of a bespoke long-form guide (credits, affinity, and the
 * planned Endo and Focus guides). Everything here is plain data and lives in
 * a `.ts` file per guide; only genuinely rich prose stays in the page as
 * snippets, because it carries inline markup.
 */

/** A row in the "Stacking multipliers" table. */
export interface Multiplier {
	name: string;
	/** Rendered as an "Applies to" column. Omitted on guides where every
	 * multiplier applies to everything — the column then disappears entirely. */
	channel?: string;
	effect: string;
}

/** A "this advice is out of date" entry. */
export interface Myth {
	claim: string;
	truth: string;
}

/** An "Honorable mentions" paragraph: a bolded lead-in, then prose. */
export interface Mention {
	lead: string;
	text: string;
}

export interface Source {
	label: string;
	url: string;
}

export interface GuideContent {
	/** Sub-heading under the page title. */
	tagline: string;
	/** `<title>`; the rest of the SEO block is derived. */
	seoTitle: string;
	/** Breadcrumb leaf, e.g. "Credits Farming Guide". */
	breadcrumb: string;
	/** Heading for the opening concept section ("The two-channel rule"). */
	conceptTitle: string;
	conceptIntro: string;
	/** The amber callout closing the concept section. */
	conceptWarning: string;
	multipliers: Multiplier[];
	myths: Myth[];
	mentions: Mention[];
	sources: Source[];
}
