import { and, desc, eq, gt, isNull, ne, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { smsLog } from '$lib/server/db/schema';
import { throttle, type ThrottleRule } from '$lib/server/email/throttle';

/*
 * Every text costs GeezSMS balance, so sends are capped per number and kind, per number per day,
 * and in total per day. Counted from the SMS log, so the caps hold across restarts. A text refused
 * by a cap is logged too, but does not count, or each refusal would push the wait further out.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Per number, per kind. Kinds not listed use `DEFAULT_SMS_RULE`. */
export const SMS_RULES: Record<string, ThrottleRule> = {
	otp: { gapMs: MINUTE, max: 5, windowMs: HOUR },
	test: { gapMs: 30_000, max: 5, windowMs: HOUR }
};
export const DEFAULT_SMS_RULE: ThrottleRule = { gapMs: 0, max: 10, windowMs: HOUR };

/** Any kind, to one number. */
export const NUMBER_DAILY_RULE: ThrottleRule = { gapMs: 0, max: 20, windowMs: DAY };
/** Every number together: the most the academy spends in a day, whatever happens. */
export const TOTAL_DAILY_RULE: ThrottleRule = { gapMs: 0, max: 300, windowMs: DAY };

export type SmsVerdict = { allowed: true } | { allowed: false; retryAfter: number; reason: string };

/** The decision itself, from what was already sent: `toNumber` to this number, `toAll` to anyone. */
export function smsLimit({
	kind,
	now,
	toNumber,
	toAll
}: {
	kind: string;
	now: Date;
	toNumber: readonly { kind: string; createdAt: Date }[];
	toAll: readonly Date[];
}): SmsVerdict {
	const checks: [ReturnType<typeof throttle>, string][] = [
		[
			throttle(
				toNumber.filter((row) => row.kind === kind).map((row) => row.createdAt),
				now,
				SMS_RULES[kind] ?? DEFAULT_SMS_RULE
			),
			`too many "${kind}" texts to this number`
		],
		[
			throttle(
				toNumber.map((row) => row.createdAt),
				now,
				NUMBER_DAILY_RULE
			),
			'daily limit for this number'
		],
		[throttle(toAll, now, TOTAL_DAILY_RULE), 'daily limit for all texts']
	];
	for (const [verdict, reason] of checks) {
		if (!verdict.allowed) return { allowed: false, retryAfter: verdict.retryAfter, reason };
	}
	return { allowed: true };
}

/** Rows that count: sent, failed, or skipped only because no SMS_KEY is set (development). */
const counted = or(ne(smsLog.status, 'SKIPPED'), isNull(smsLog.error));

/** Whether `to` (normalised) may be sent a `kind` text now. */
export async function smsAllowed(to: string, kind: string, now = new Date()): Promise<SmsVerdict> {
	const since = new Date(now.getTime() - DAY);
	const [toNumber, toAll] = await Promise.all([
		db
			.select({ kind: smsLog.kind, createdAt: smsLog.createdAt })
			.from(smsLog)
			.where(and(eq(smsLog.to, to), gt(smsLog.createdAt, since), counted)),
		db
			.select({ createdAt: smsLog.createdAt })
			.from(smsLog)
			.where(and(gt(smsLog.createdAt, since), counted))
			.orderBy(desc(smsLog.createdAt))
			.limit(TOTAL_DAILY_RULE.max)
	]);
	return smsLimit({ kind, now, toNumber, toAll: toAll.map((row) => row.createdAt) });
}

/*
 * One signed-in account asking for codes to many different numbers would slip past the per-number
 * caps. This one is per account and kept in memory: a restart forgets it, the log-based caps don't.
 */
export const ACCOUNT_CODE_RULE: ThrottleRule = { gapMs: 0, max: 6, windowMs: HOUR };
const codeRequests = new Map<string, number[]>();

/** Whether `userId` may ask for another verification code now; a yes is counted. */
export function accountCodeAllowed(userId: string, now = new Date()) {
	const recent = (codeRequests.get(userId) ?? []).filter((time) => time > now.getTime() - ACCOUNT_CODE_RULE.windowMs);
	const verdict = throttle(
		recent.map((time) => new Date(time)),
		now,
		ACCOUNT_CODE_RULE
	);
	if (verdict.allowed) recent.push(now.getTime());
	if (recent.length) codeRequests.set(userId, recent);
	else codeRequests.delete(userId);
	return verdict;
}
