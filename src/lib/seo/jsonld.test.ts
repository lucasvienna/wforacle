import { describe, it, expect } from 'vitest';
import { webApplicationLd, breadcrumbLd, guideLd } from './jsonld';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from './config';
import type { Resource } from '$lib/model/types';

describe('webApplicationLd', () => {
	it('returns a WebApplication schema with the site identity', () => {
		const ld = webApplicationLd() as Record<string, unknown>;
		expect(ld['@context']).toBe('https://schema.org');
		expect(ld['@type']).toBe('WebApplication');
		expect(ld.name).toBe(SITE_NAME);
		expect(ld.url).toBe(SITE_URL);
		expect(ld.description).toBe(DEFAULT_DESCRIPTION);
		expect(ld.applicationCategory).toBe('GameApplication');
		expect(ld.operatingSystem).toBe('Web');
		expect(ld.offers).toMatchObject({ '@type': 'Offer', price: '0' });
	});
});

describe('breadcrumbLd', () => {
	it('returns a BreadcrumbList with positions incrementing from 1', () => {
		const ld = breadcrumbLd([
			{ name: 'Home', url: `${SITE_URL}/` },
			{ name: 'Guides', url: `${SITE_URL}/guides` },
			{ name: 'Neurodes Farming Guide', url: `${SITE_URL}/guides/neurodes` },
		]) as Record<string, unknown>;
		expect(ld['@context']).toBe('https://schema.org');
		expect(ld['@type']).toBe('BreadcrumbList');
		const items = ld.itemListElement as Array<Record<string, unknown>>;
		expect(items).toHaveLength(3);
		expect(items[0]).toMatchObject({ '@type': 'ListItem', position: 1, name: 'Home' });
		expect(items[1]).toMatchObject({ '@type': 'ListItem', position: 2, name: 'Guides' });
		expect(items[2]).toMatchObject({
			'@type': 'ListItem',
			position: 3,
			name: 'Neurodes Farming Guide',
		});
	});
});

describe('guideLd', () => {
	const resource: Resource = {
		id: 'neurodes',
		name: 'Neurodes',
		regionIds: ['eris'],
		recommendations: [
			{
				phase: 'early',
				nodeLabel: 'Nsu, Eris',
				note: 'Infested node with good drop chance.',
				source: 'wiki',
				lastVerified: '2026-01-15',
				boostersApply: true,
			},
			{
				phase: 'late',
				nodeLabel: 'Xini, Eris',
				note: 'Best for late-game farming.',
				source: 'wiki',
				lastVerified: '2026-03-02',
				boostersApply: true,
			},
		],
	};
	const canonical = `${SITE_URL}/guides/neurodes`;

	it('returns an Article with the correct headline and url', () => {
		const ld = guideLd(resource, canonical) as Record<string, unknown>;
		expect(ld['@context']).toBe('https://schema.org');
		expect(ld['@type']).toBe('Article');
		expect(ld.headline).toBe('Neurodes Farming Guide');
		expect(ld.url).toBe(canonical);
	});

	it('sets about to the resource name', () => {
		const ld = guideLd(resource, canonical) as Record<string, unknown>;
		expect(ld.about).toMatchObject({ '@type': 'Thing', name: 'Neurodes' });
	});

	it('sets isPartOf to the WebSite', () => {
		const ld = guideLd(resource, canonical) as Record<string, unknown>;
		expect(ld.isPartOf).toMatchObject({
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_URL,
		});
	});

	it('picks the latest lastVerified among recommendations as dateModified', () => {
		const ld = guideLd(resource, canonical) as Record<string, unknown>;
		expect(ld.dateModified).toBe('2026-03-02');
	});

	it('picks the latest lastVerified regardless of recommendation order', () => {
		const reordered: Resource = {
			...resource,
			recommendations: [...resource.recommendations].reverse(),
		};
		const ld = guideLd(reordered, canonical) as Record<string, unknown>;
		expect(ld.dateModified).toBe('2026-03-02');
	});
});
