import { m } from '$lib/paraglide/messages';

/**
 * How often one address may be sent the same kind of email on request (a resent confirmation, a
 * reset link): at most `max` within `windowMs`, and never twice within `gapMs`.
 */
export interface ThrottleRule {
	gapMs: number;
	max: number;
	windowMs: number;
}

export const REQUESTED_EMAIL_RULE: ThrottleRule = { gapMs: 60_000, max: 5, windowMs: 60 * 60_000 };

/**
 * Whether another email may go out now, given when earlier ones went out. `retryAfter` is in whole
 * seconds, for telling the person how long to wait.
 */
export function throttle(
	sentAt: readonly Date[],
	now: Date,
	rule: ThrottleRule = REQUESTED_EMAIL_RULE
): { allowed: true } | { allowed: false; retryAfter: number } {
	const times = sentAt
		.map((date) => date.getTime())
		.filter((time) => time > now.getTime() - rule.windowMs)
		.sort((a, b) => b - a);

	const waits: number[] = [];
	if (times.length && now.getTime() - times[0] < rule.gapMs) {
		waits.push(times[0] + rule.gapMs - now.getTime());
	}
	if (times.length >= rule.max) {
		// The window frees a slot when the oldest send still counted falls out of it.
		waits.push(times[rule.max - 1] + rule.windowMs - now.getTime());
	}
	if (!waits.length) return { allowed: true };
	return { allowed: false, retryAfter: Math.max(1, Math.ceil(Math.max(...waits) / 1000)) };
}

/** "45 seconds", "3 minutes": a wait for people. */
export function describeWait(seconds: number): string {
	if (seconds < 60) return m.misc_wait_seconds({ count: seconds });
	return m.info_wait_minutes({ count: Math.ceil(seconds / 60) });
}
