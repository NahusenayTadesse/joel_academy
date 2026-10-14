import { beforeEach, describe, expect, it, vi } from 'vitest';

// Only the pure parts are under test; the module's database imports are stubbed.
vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/public-catalog', () => ({ invalidateCatalog: vi.fn() }));

const { parseReview, plainTextComment, resetReviewLimits, reviewWriteWait } = await import('./reviews');
const { REVIEW_COMMENT_MAX } = await import('$lib/components/reviews/rules');

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
};

describe('parseReview', () => {
	it('accepts a whole rating from 1 to 5 with an optional comment', () => {
		expect(parseReview(form({ rating: '5', comment: 'Great course.' }))).toEqual({
			ok: true,
			rating: 5,
			comment: 'Great course.'
		});
		expect(parseReview(form({ rating: '1' }))).toEqual({ ok: true, rating: 1, comment: null });
		expect(parseReview(form({ rating: '3', comment: '   \n  ' }))).toEqual({ ok: true, rating: 3, comment: null });
	});

	it.each(['', '0', '6', '4.5', '-1', '55', 'five', '05', '1e0'])('refuses rating %j', (rating) => {
		expect(parseReview(form({ rating })).ok).toBe(false);
	});

	it('refuses a missing rating', () => {
		expect(parseReview(form({ comment: 'hi' })).ok).toBe(false);
	});

	it('enforces the length limit on the cleaned text', () => {
		const exact = 'a'.repeat(REVIEW_COMMENT_MAX);
		expect(parseReview(form({ rating: '4', comment: exact }))).toMatchObject({ ok: true, comment: exact });
		expect(parseReview(form({ rating: '4', comment: exact + 'a' })).ok).toBe(false);
		// Markup does not count towards the limit once removed…
		expect(parseReview(form({ rating: '4', comment: `<b>${exact}</b>` })).ok).toBe(true);
		// …but a huge payload is refused before it is parsed.
		expect(parseReview(form({ rating: '4', comment: '<i></i>'.repeat(REVIEW_COMMENT_MAX) })).ok).toBe(false);
	});

	it('counts characters, not UTF-16 units', () => {
		const emoji = '😀'.repeat(REVIEW_COMMENT_MAX);
		expect(parseReview(form({ rating: '5', comment: emoji })).ok).toBe(true);
	});

	it('refuses a file in place of the comment', () => {
		const data = form({ rating: '5' });
		data.set('comment', new Blob(['x']), 'x.txt');
		expect(parseReview(data).ok).toBe(false);
	});
});

describe('plainTextComment', () => {
	it('removes markup but keeps its text, and drops scripts entirely', () => {
		expect(plainTextComment('<b>Loved</b> it <script>alert(1)</script><img src=x onerror=alert(1)>')).toBe('Loved it');
	});

	it('keeps characters that only look like markup', () => {
		expect(plainTextComment('I <3 it & 2 > 1 "really" it\'s')).toBe('I <3 it & 2 > 1 "really" it\'s');
	});

	it('normalises whitespace and strips control and bidi-override characters', () => {
		expect(plainTextComment('  one\r\n\r\n\r\n\r\ntwo  \n\u0007three‮evil\u0000 ')).toBe('one\n\ntwo\nthreeevil');
	});

	it('gives null for nothing', () => {
		expect(plainTextComment('')).toBeNull();
		expect(plainTextComment('<p> </p>')).toBeNull();
	});
});

describe('reviewWriteWait', () => {
	beforeEach(() => resetReviewLimits());

	it('allows a burst of five a minute, then asks the writer to wait', () => {
		const now = 1_000_000;
		for (let i = 0; i < 5; i++) expect(reviewWriteWait('u1', now + i)).toBe(0);
		const wait = reviewWriteWait('u1', now + 10);
		expect(wait).toBeGreaterThan(0);
		expect(wait).toBeLessThanOrEqual(60_000);
		// Another student is unaffected; the first may write again once the minute has passed.
		expect(reviewWriteWait('u2', now + 10)).toBe(0);
		expect(reviewWriteWait('u1', now + 60_001)).toBe(0);
	});

	it('caps the hour at twenty', () => {
		let now = 0;
		for (let i = 0; i < 20; i++) {
			expect(reviewWriteWait('u1', now)).toBe(0);
			now += 61_000;
		}
		expect(reviewWriteWait('u1', now)).toBeGreaterThan(0);
	});
});
