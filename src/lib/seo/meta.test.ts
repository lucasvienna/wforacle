import { describe, it, expect } from 'vitest';
import { buildMeta, guideDescription } from './meta';
import { SITE_URL, DEFAULT_OG_IMAGE } from './config';
import type { Resource } from '$lib/model/types';

describe('buildMeta', () => {
	it('builds an absolute canonical for the root path', () => {
		const meta = buildMeta({ title: 'Home', description: 'desc', path: '/' });
		expect(meta.canonical).toBe(`${SITE_URL}/`);
	});

	it('builds an absolute canonical for a top-level path', () => {
		const meta = buildMeta({ title: 'Guides', description: 'desc', path: '/guides' });
		expect(meta.canonical).toBe(`${SITE_URL}/guides`);
	});

	it('builds an absolute canonical for a nested path', () => {
		const meta = buildMeta({
			title: 'Neurodes',
			description: 'desc',
			path: '/guides/neurodes',
		});
		expect(meta.canonical).toBe(`${SITE_URL}/guides/neurodes`);
	});

	it('normalizes a path without a leading slash', () => {
		const meta = buildMeta({ title: 'Guides', description: 'desc', path: 'guides' });
		expect(meta.canonical).toBe(`${SITE_URL}/guides`);
	});

	it('makes a relative image absolute', () => {
		const meta = buildMeta({
			title: 'Home',
			description: 'desc',
			path: '/',
			image: '/custom-og.png',
		});
		expect(meta.image).toBe(`${SITE_URL}/custom-og.png`);
	});

	it('passes an external image through unchanged', () => {
		const meta = buildMeta({
			title: 'Home',
			description: 'desc',
			path: '/',
			image: 'https://example.com/og.png',
		});
		expect(meta.image).toBe('https://example.com/og.png');
	});

	it('defaults image to DEFAULT_OG_IMAGE resolved to an absolute URL', () => {
		const meta = buildMeta({ title: 'Home', description: 'desc', path: '/' });
		expect(meta.image).toBe(`${SITE_URL}${DEFAULT_OG_IMAGE}`);
	});

	it('defaults type to website', () => {
		const meta = buildMeta({ title: 'Home', description: 'desc', path: '/' });
		expect(meta.type).toBe('website');
	});

	it('passes through an explicit type', () => {
		const meta = buildMeta({
			title: 'Neurodes',
			description: 'desc',
			path: '/guides/neurodes',
			type: 'article',
		});
		expect(meta.type).toBe('article');
	});

	it('passes through title and description unchanged', () => {
		const meta = buildMeta({ title: 'My Title', description: 'My Description', path: '/' });
		expect(meta.title).toBe('My Title');
		expect(meta.description).toBe('My Description');
	});
});

describe('guideDescription', () => {
	const resource: Resource = {
		id: 'neurodes',
		name: 'Neurodes',
		regionIds: ['earth'],
		recommendations: [
			{
				phase: 'early',
				nodeLabel: 'Earth — Eris',
				boostersApply: true,
				note: 'Farm Eris on Earth for a steady Neurodes drop.',
				source: 'https://wiki.warframe.com/neurodes',
				lastVerified: '2026-07-01',
			},
			{
				phase: 'late',
				nodeLabel: 'Void — Aphrodite',
				boostersApply: false,
				note: '',
				source: 'https://wiki.warframe.com/neurodes-late',
				lastVerified: '2026-07-01',
			},
		],
	};

	it('uses the top early recommendation as the "top pick"', () => {
		expect(guideDescription(resource)).toBe(
			'Where to farm Neurodes in Warframe — best early and late-game locations. Top pick: Earth — Eris.',
		);
	});

	it('falls back to the first recommendation when there is no early rec', () => {
		const lateOnly: Resource = {
			...resource,
			recommendations: [resource.recommendations[1]],
		};
		expect(guideDescription(lateOnly)).toBe(
			'Where to farm Neurodes in Warframe — best early and late-game locations. Top pick: Void — Aphrodite.',
		);
	});

	it('omits the "top pick" clause when there are no recommendations at all', () => {
		const none: Resource = { ...resource, recommendations: [] };
		expect(guideDescription(none)).toBe(
			'Where to farm Neurodes in Warframe — best early and late-game locations.',
		);
	});

	it('collapses internal whitespace/newlines from the node label', () => {
		const messy: Resource = {
			...resource,
			recommendations: [
				{
					...resource.recommendations[0],
					nodeLabel: '  Earth —\n  Eris',
				},
			],
		};
		expect(guideDescription(messy)).toBe(
			'Where to farm Neurodes in Warframe — best early and late-game locations. Top pick: Earth — Eris.',
		);
	});

	it('truncates to at most 160 characters', () => {
		const longName: Resource = {
			...resource,
			name: 'A'.repeat(50),
			recommendations: [
				{
					...resource.recommendations[0],
					nodeLabel: 'B'.repeat(150),
				},
			],
		};
		const description = guideDescription(longName);
		expect(description.length).toBeLessThanOrEqual(160);
	});
});
