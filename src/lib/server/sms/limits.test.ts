import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

const { accountCodeAllowed, smsLimit, NUMBER_DAILY_RULE, TOTAL_DAILY_RULE } = await import('./limits');

const now = new Date('2026-10-06T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;

describe('smsLimit', () => {
	it('allows the first text', () => {
		expect(smsLimit({ kind: 'otp', now, toNumber: [], toAll: [] })).toEqual({ allowed: true });
	});

	it('spaces verification codes a minute apart', () => {
		const verdict = smsLimit({ kind: 'otp', now, toNumber: [{ kind: 'otp', createdAt: ago(20_000) }], toAll: [] });
		expect(verdict).toEqual({ allowed: false, retryAfter: 40, reason: 'too many "otp" texts to this number' });
	});

	it('allows five codes an hour, then waits for the oldest to leave the hour', () => {
		const toNumber = [2, 10, 20, 30, 50].map((m) => ({ kind: 'otp', createdAt: ago(m * MIN) }));
		const verdict = smsLimit({ kind: 'otp', now, toNumber, toAll: [] });
		expect(verdict).toMatchObject({ allowed: false, retryAfter: 600 });
	});

	it('counts kinds separately for the per-kind rule', () => {
		const toNumber = [{ kind: 'enrollment-confirmed', createdAt: ago(5_000) }];
		expect(smsLimit({ kind: 'otp', now, toNumber, toAll: [] })).toEqual({ allowed: true });
	});

	it('lets notifications through back to back', () => {
		const toNumber = [{ kind: 'enrollment-confirmed', createdAt: ago(1_000) }];
		expect(smsLimit({ kind: 'enrollment-confirmed', now, toNumber, toAll: [] })).toEqual({ allowed: true });
	});

	it('caps one number per day across kinds', () => {
		const toNumber = Array.from({ length: NUMBER_DAILY_RULE.max }, (_, i) => ({
			kind: `kind-${i}`,
			createdAt: ago((i + 1) * 30 * MIN)
		}));
		expect(smsLimit({ kind: 'otp', now, toNumber, toAll: [] })).toMatchObject({
			allowed: false,
			reason: 'daily limit for this number'
		});
	});

	it('caps every number together per day', () => {
		const toAll = Array.from({ length: TOTAL_DAILY_RULE.max }, (_, i) => ago((i + 1) * 1_000));
		expect(smsLimit({ kind: 'otp', now, toNumber: [], toAll })).toMatchObject({
			allowed: false,
			reason: 'daily limit for all texts'
		});
	});
});

describe('accountCodeAllowed', () => {
	it('allows six code requests an hour per account, and only counts allowed ones', () => {
		const user = `user-${Math.random()}`;
		for (let i = 0; i < 6; i++) expect(accountCodeAllowed(user, ago((50 - i) * MIN)).allowed).toBe(true);
		expect(accountCodeAllowed(user, now)).toMatchObject({ allowed: false });
		expect(accountCodeAllowed(user, now)).toMatchObject({ allowed: false });
		// The first request (50 minutes ago) leaves the hour in 10 minutes.
		expect(accountCodeAllowed(user, new Date(now.getTime() + 10 * MIN + 1_000)).allowed).toBe(true);
		expect(accountCodeAllowed(`other-${Math.random()}`, now).allowed).toBe(true);
	});
});
