import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import type { Resource } from '$lib/model/types';
import { SITE_URL } from '$lib/seo/config';
import GuideLongform from './GuideLongform.svelte';
import type { GuideContent } from './types';

/**
 * The section shells are tested once, here, against a synthetic guide. The
 * per-guide specs then only assert their own prose — previously those two
 * files were line-for-line clones asserting the same shell twice.
 */
const resource: Resource = {
	id: 'testium',
	name: 'Testium',
	regionIds: ['ceres'],
	recommendations: [
		{
			phase: 'late',
			nodeLabel: 'Pluto — Hieracon',
			boostersApply: true,
			boosterNote: 'Late note.',
			note: 'Late rec.',
			source: 'https://wiki.warframe.com/w/Hieracon',
			lastVerified: '2026-07-01',
		},
		{
			phase: 'early',
			nodeLabel: 'Ceres — Gabii',
			// deliberately no boosterNote: exercises the shared fallback
			boostersApply: false,
			note: 'Early rec.',
			source: 'https://wiki.warframe.com/w/Gabii',
			lastVerified: '2026-07-02',
		},
	],
};

const content: GuideContent = {
	tagline: 'A tagline.',
	seoTitle: 'Testium Farming Guide | wforacle',
	breadcrumb: 'Testium Farming Guide',
	conceptTitle: 'The testing rule',
	conceptIntro: 'An intro.',
	conceptWarning: 'A warning.',
	multipliers: [{ name: 'Test Booster', effect: 'Doubles things.' }],
	myths: [{ claim: 'A myth', truth: 'The truth.' }],
	mentions: [{ lead: 'Somewhere', text: 'is also decent.' }],
	sources: [{ label: 'Testium — Warframe Wiki', url: 'https://wiki.warframe.com/w/Testium' }],
};

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

const props = () => ({
	resource,
	content,
	conceptCards: text('concept cards'),
	workedExample: text('worked example'),
});

describe('GuideLongform', () => {
	it('sets the title, canonical and JSON-LD from the content', () => {
		render(GuideLongform, props());
		expect(document.title).toBe('Testium Farming Guide | wforacle');
		expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
			`${SITE_URL}/guides/testium`,
		);
		expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
	});

	it('renders every section shell', () => {
		render(GuideLongform, props());
		for (const name of [
			/the testing rule/i,
			/the progression path/i,
			/stacking multipliers/i,
			/outdated advice/i,
			/honorable mentions/i,
			/sources/i,
		])
			expect(screen.getByRole('heading', { name })).toBeInTheDocument();
	});

	it('orders recommendation cards early → late whatever the dataset order', () => {
		render(GuideLongform, props());
		const labels = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
		expect(labels.indexOf('Ceres — Gabii')).toBeLessThan(labels.indexOf('Pluto — Hieracon'));
	});

	it('applies the shared boosterNote fallback to a rec without one', () => {
		render(GuideLongform, props());
		expect(screen.getByText('Late note.')).toBeInTheDocument();
		expect(screen.getByText(/don't apply/)).toBeInTheDocument();
	});

	it('omits the "Applies to" column when no multiplier declares a channel', () => {
		render(GuideLongform, props());
		expect(screen.queryByRole('columnheader', { name: /applies to/i })).not.toBeInTheDocument();
	});

	it('shows the "Applies to" column when one does', () => {
		render(GuideLongform, {
			...props(),
			content: {
				...content,
				multipliers: [{ name: 'Test Booster', channel: 'Everything', effect: 'Doubles.' }],
			},
		});
		expect(screen.getByRole('columnheader', { name: /applies to/i })).toBeInTheDocument();
		expect(screen.getByRole('cell', { name: 'Everything' })).toBeInTheDocument();
	});

	it('renders the caller-supplied prose snippets', () => {
		render(GuideLongform, props());
		expect(screen.getByText('concept cards')).toBeInTheDocument();
		expect(screen.getByText('worked example')).toBeInTheDocument();
	});

	it('renders myths, mentions and sources from the content', () => {
		render(GuideLongform, props());
		expect(screen.getByText('“A myth”')).toBeInTheDocument();
		expect(screen.getByText('Somewhere')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Testium — Warframe Wiki/i })).toBeInTheDocument();
	});
});
