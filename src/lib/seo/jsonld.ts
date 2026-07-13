import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from './config';
import type { Resource } from '$lib/model/types';

const CONTEXT = 'https://schema.org';

export function webApplicationLd(): object {
	return {
		'@context': CONTEXT,
		'@type': 'WebApplication',
		name: SITE_NAME,
		url: SITE_URL,
		description: DEFAULT_DESCRIPTION,
		applicationCategory: 'GameApplication',
		operatingSystem: 'Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
		},
	};
}

export function breadcrumbLd(items: { name: string; url: string }[]): object {
	return {
		'@context': CONTEXT,
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

function latestLastVerified(resource: Resource): string {
	return resource.recommendations.reduce(
		(latest, rec) => (rec.lastVerified > latest ? rec.lastVerified : latest),
		resource.recommendations[0]?.lastVerified ?? '',
	);
}

export function guideLd(resource: Resource, canonical: string): object {
	return {
		'@context': CONTEXT,
		'@type': 'Article',
		headline: `${resource.name} Farming Guide`,
		about: {
			'@type': 'Thing',
			name: resource.name,
		},
		url: canonical,
		isPartOf: {
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_URL,
		},
		dateModified: latestLastVerified(resource),
	};
}
