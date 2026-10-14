import { describe, expect, it } from 'vitest';
import { canonicalUrl, withSeoTags } from './seo';

const page = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;
const origin = 'https://academy.example';

describe('canonicalUrl', () => {
	it('drops filters and tracking but keeps a page number past the first', () => {
		expect(canonicalUrl(origin, new URL('http://x/courses?search=ai&sort=new'))).toBe(`${origin}/courses`);
		expect(canonicalUrl(origin, new URL('http://x/categories/ai?page=2'))).toBe(`${origin}/categories/ai?page=2`);
		expect(canonicalUrl(origin, new URL('http://x/courses/?page=1'))).toBe(`${origin}/courses`);
		expect(canonicalUrl(origin, new URL('http://x/?source=pwa'))).toBe(`${origin}/`);
	});
});

describe('withSeoTags', () => {
	it('adds canonical, Open Graph and Twitter tags from the page title and description', () => {
		const html = withSeoTags(
			page('<title>Pricing &amp; plans · Academy</title><meta name="description" content="Pay once, &quot;own&quot; it.">'),
			new URL('http://x/pricing'),
			origin
		);
		expect(html).toContain(`<link rel="canonical" href="${origin}/pricing">`);
		expect(html).toContain('<meta property="og:title" content="Pricing &amp; plans · Academy">');
		expect(html).toContain('<meta property="og:description" content="Pay once, &quot;own&quot; it.">');
		expect(html).toContain(`<meta property="og:image" content="${origin}/og-image.jpg">`);
		expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
		expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
	});

	it('keeps whatever the page set itself', () => {
		const html = withSeoTags(
			page('<title>Course</title><meta property="og:title" content="Own"><meta property="og:image" content="https://cdn/x.jpg">'),
			new URL('http://x/courses/a'),
			origin
		);
		expect(html.match(/og:title/g)).toHaveLength(1);
		expect(html).not.toContain('og-image.jpg');
	});

	it('leaves noindex pages alone', () => {
		const input = page('<title>Sign in</title><meta name="robots" content="noindex">');
		expect(withSeoTags(input, new URL('http://x/login'), origin)).toBe(input);
	});
});
