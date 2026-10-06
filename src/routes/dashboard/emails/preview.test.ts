import { describe, expect, it } from 'vitest';
import { emailLinks, kindLabel, previewDocument } from './preview';

describe('previewDocument', () => {
	it('adds the script ban and new-tab links to an existing head', () => {
		const out = previewDocument('<!doctype html><html><head><title>x</title></head><body>Hi</body></html>');
		expect(out).toContain("<head><meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'");
		expect(out).toContain('<base target="_blank">');
		expect(out).toContain('<title>x</title>');
	});

	it('adds a head when the email has none, as the academy templates do', () => {
		const out = previewDocument('<!doctype html><html><body style="margin:0">Hi</body></html>');
		expect(out).toMatch(/^<!doctype html><html><head><meta [^>]+><base target="_blank"><\/head><body/);
	});

	it('wraps a bare fragment', () => {
		expect(previewDocument('<p>Hi</p>')).toMatch(/<head>.*<\/head><body><p>Hi<\/p><\/body>/);
	});
});

describe('emailLinks', () => {
	it('lists each web link once, decoding entities', () => {
		const html =
			'<a href="https://x.test/reset-password?token=a&amp;b=1">Go</a> <a style="c" href="https://x.test/reset-password?token=a&amp;b=1">again</a> <a href="mailto:a@b.c">mail</a> <a href="https://x.test/courses">More</a>';
		expect(emailLinks(html)).toEqual(['https://x.test/reset-password?token=a&b=1', 'https://x.test/courses']);
	});

	it('ignores scripts dressed up as links', () => {
		expect(emailLinks('<a href="javascript:alert(1)">x</a>')).toEqual([]);
	});
});

describe('kindLabel', () => {
	it('reads a kind as words', () => {
		expect(kindLabel('password-reset')).toBe('Password reset');
		expect(kindLabel('verify-email')).toBe('Verify email');
	});
});
