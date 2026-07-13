import { describe, it, expect } from 'vitest';
import { buildMeta } from './meta';
import { SITE_URL, DEFAULT_OG_IMAGE } from './config';

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
