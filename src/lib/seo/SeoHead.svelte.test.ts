import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import SeoHead from './SeoHead.svelte';

describe('SeoHead JSON-LD escaping', () => {
	it('escapes `</script>` inside jsonLd so it cannot break out of the script tag', () => {
		const evil = '</script><script>alert(1)</script>';
		render(SeoHead, {
			props: {
				title: 'Test',
				description: 'desc',
				path: '/test',
				jsonLd: { evil },
			},
		});

		const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
		expect(scripts).toHaveLength(1);

		const raw = scripts[0].textContent ?? '';
		expect(raw).not.toContain('</script>');

		// The escaped payload must still round-trip to the original string.
		const parsed = JSON.parse(raw) as { evil: string };
		expect(parsed.evil).toBe(evil);
	});
});
