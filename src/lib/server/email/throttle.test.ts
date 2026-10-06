import { describe, expect, it } from 'vitest';
import { describeWait, throttle, type ThrottleRule } from './throttle';

const rule: ThrottleRule = { gapMs: 60_000, max: 3, windowMs: 60 * 60_000 };
const now = new Date('2026-10-06T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('throttle', () => {
	it('allows the first email', () => {
		expect(throttle([], now, rule)).toEqual({ allowed: true });
	});

	it('refuses a second email within the gap and says how long to wait', () => {
		expect(throttle([ago(20_000)], now, rule)).toEqual({ allowed: false, retryAfter: 40 });
	});

	it('allows another once the gap has passed', () => {
		expect(throttle([ago(61_000)], now, rule)).toEqual({ allowed: true });
	});

	it('refuses once the window holds the maximum, until the oldest leaves it', () => {
		const sent = [ago(5 * 60_000), ago(30 * 60_000), ago(50 * 60_000)];
		// The send 50 minutes ago leaves the hour in 10 minutes.
		expect(throttle(sent, now, rule)).toEqual({ allowed: false, retryAfter: 600 });
	});

	it('ignores emails older than the window', () => {
		const sent = [ago(5 * 60_000), ago(2 * 60 * 60_000), ago(3 * 60 * 60_000)];
		expect(throttle(sent, now, rule)).toEqual({ allowed: true });
	});

	it('does not depend on the order it is given', () => {
		const sent = [ago(50 * 60_000), ago(10_000), ago(30 * 60_000)];
		expect(throttle(sent, now, rule)).toEqual({ allowed: false, retryAfter: 600 });
	});
});

describe('describeWait', () => {
	it('reads seconds and minutes', () => {
		expect(describeWait(1)).toBe('1 second');
		expect(describeWait(45)).toBe('45 seconds');
		expect(describeWait(60)).toBe('1 minute');
		expect(describeWait(61)).toBe('2 minutes');
	});
});
