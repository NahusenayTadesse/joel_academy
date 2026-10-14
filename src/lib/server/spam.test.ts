import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { BETTER_AUTH_SECRET: 'test-secret' } }));
const { forgive, hit, issueFormToken, judgeSubmission, resetLimits, waitText } = await import('./spam');

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
};

describe('judgeSubmission', () => {
	const issuedAt = 1_000_000;

	it('accepts a real person: empty honeypot, valid token, a few seconds to fill', () => {
		expect(judgeSubmission(form({ formToken: issueFormToken(issuedAt) }), issuedAt + 8_000)).toBe('ok');
	});

	it('catches a filled honeypot before anything else', () => {
		expect(judgeSubmission(form({ website: 'http://spam', formToken: issueFormToken(issuedAt) }), issuedAt + 8_000)).toBe(
			'honeypot'
		);
	});

	it('catches instant submissions', () => {
		expect(judgeSubmission(form({ formToken: issueFormToken(issuedAt) }), issuedAt + 500)).toBe('too-fast');
	});

	it('refuses missing, forged, future and stale tokens', () => {
		expect(judgeSubmission(form({}), issuedAt)).toBe('bad-token');
		expect(judgeSubmission(form({ formToken: `${issuedAt}.forged` }), issuedAt + 8_000)).toBe('bad-token');
		const [, signature] = issueFormToken(issuedAt).split('.');
		expect(judgeSubmission(form({ formToken: `${issuedAt - 60_000}.${signature}` }), issuedAt + 8_000)).toBe('bad-token');
		expect(judgeSubmission(form({ formToken: issueFormToken(issuedAt + 60_000) }), issuedAt)).toBe('bad-token');
		expect(judgeSubmission(form({ formToken: issueFormToken(issuedAt) }), issuedAt + 25 * 60 * 60_000)).toBe('bad-token');
	});
});

describe('hit', () => {
	beforeEach(() => resetLimits());

	it('allows a burst up to the limit, then says how long to wait', () => {
		const now = 5_000_000;
		expect([hit('contact', 'ip', now), hit('contact', 'ip', now + 1), hit('contact', 'ip', now + 2)]).toEqual([0, 0, 0]);
		const wait = hit('contact', 'ip', now + 3);
		expect(wait).toBeGreaterThan(9 * 60_000);
		expect(wait).toBeLessThanOrEqual(10 * 60_000);
		// The window slides: once the first attempt ages out, one more is allowed.
		expect(hit('contact', 'ip', now + 10 * 60_000)).toBe(0);
	});

	it('keeps buckets and keys apart, and forgives on request', () => {
		const now = 9_000_000;
		for (let i = 0; i < 8; i += 1) hit('signInEmail', 'a@x.et', now + i);
		expect(hit('signInEmail', 'a@x.et', now + 10)).toBeGreaterThan(0);
		expect(hit('signInEmail', 'b@x.et', now + 10)).toBe(0);
		expect(hit('contact', 'a@x.et', now + 10)).toBe(0);
		forgive('signInEmail', 'a@x.et');
		expect(hit('signInEmail', 'a@x.et', now + 11)).toBe(0);
	});
});

describe('waitText', () => {
	it('rounds up to whole minutes, then hours', () => {
		expect(waitText(1)).toBe('1 minute');
		expect(waitText(9 * 60_000 + 1)).toBe('10 minutes');
		expect(waitText(90 * 60_000)).toBe('2 hours');
	});
});
