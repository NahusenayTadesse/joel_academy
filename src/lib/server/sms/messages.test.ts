import { describe, expect, it } from 'vitest';
import { SMS_LIMIT } from './geez';
import {
	certificateIssuedSms,
	clip,
	contactMessageSms,
	enrollmentConfirmedSms,
	otpSms,
	passwordResetSms,
	passwordChangedSms,
	paymentNeedsReviewSms,
	paymentRejectedSms,
	phoneChangedSms,
	receiptReceivedSms,
	receiptSubmittedSms,
	certificateRevokedSms
} from './messages';

const url = 'https://academy.example/my-courses/intro-to-design';
const long = 'A very long words '.repeat(40);

describe('SMS copy', () => {
	it('words the verification code', () => {
		expect(otpSms('123456')).toBe("Joel Talargie Academy code: 123456. Valid 5 minutes. Don't share it.");
	});

	it('mentions a payment only for paid enrollments', () => {
		const free = enrollmentConfirmedSms({ courseTitle: 'Intro', amount: 0, currency: 'ETB', provider: 'FREE', url });
		expect(free).toBe(`Joel Talargie Academy: You're enrolled in "Intro". Start learning: ${url}`);
		const paid = enrollmentConfirmedSms({ courseTitle: 'Intro', amount: '1500', currency: 'ETB', provider: 'CHAPA', url });
		expect(paid).toContain('Your payment of ETB 1,500.00 is confirmed.');
	});

	it('keeps the reason readable and the link whole', () => {
		const text = paymentRejectedSms({ courseTitle: 'Intro', reason: 'Receipt is blurry.', url });
		expect(text).toBe(
			`Joel Talargie Academy: We couldn't approve your payment for "Intro". Reason: Receipt is blurry. Resubmit: ${url}`
		);
	});

	it('always fits, with the link at the end, however long the facts are', () => {
		const texts = [
			enrollmentConfirmedSms({ courseTitle: long, amount: 99999, currency: 'ETB', provider: 'MANUAL', url }),
			paymentRejectedSms({ courseTitle: long, reason: long, url }),
			certificateIssuedSms({ courseTitle: long, code: 'JTA-2026-000123', url }),
			passwordResetSms(`${url}?token=${'x'.repeat(32)}`),
			receiptSubmittedSms({ studentName: long, courseTitle: long, amount: 1500, currency: 'ETB', url }),
			contactMessageSms({ name: long, email: `${'x'.repeat(80)}@example.com`, message: long, url })
		];
		for (const text of texts) {
			expect(text.length).toBeLessThanOrEqual(SMS_LIMIT);
			expect(text.startsWith('Joel Talargie Academy')).toBe(true);
			expect(text).toContain(url);
			// Plain characters only: no ellipsis or curly quotes forcing a costlier encoding.
			expect(text).not.toMatch(/[^\x20-\x7e]/);
		}
	});
});

describe('clip', () => {
	it('shortens with dots and folds lines', () => {
		expect(clip('one\ntwo   three', 50)).toBe('one two three');
		expect(clip('abcdefghij', 8)).toBe('abcde...');
	});
});

describe('security and status texts', () => {
	const texts = () => [
		receiptReceivedSms({ courseTitle: long, amount: '1500', currency: 'ETB', url }),
		passwordChangedSms(url),
		phoneChangedSms({ newPhone: '251911223344', url }),
		phoneChangedSms({ newPhone: null, url }),
		certificateRevokedSms({ courseTitle: long, code: 'JTA-2026-000123', reason: long }),
		paymentNeedsReviewSms({ studentName: long, courseTitle: long, reason: long, url })
	];

	it('fit one text, keep their link and use plain characters only', () => {
		for (const text of texts()) {
			expect(text.length).toBeLessThanOrEqual(SMS_LIMIT);
			expect(text.startsWith('Joel Talargie Academy')).toBe(true);
			// GSM-7 safe: no curly quotes, ellipsis character or no-break spaces.
			expect(text).not.toMatch(/[‘’“”…  ]/);
		}
		expect(texts()[0]).toContain(url);
		expect(texts()[5]).toContain(url);
	});

	it('tells the old number only the last digits of the new one', () => {
		const text = phoneChangedSms({ newPhone: '251911223344', url });
		expect(text).toContain('ending 344');
		expect(text).not.toContain('251911223344');
	});
});
