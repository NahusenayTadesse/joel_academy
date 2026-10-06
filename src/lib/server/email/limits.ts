import { and, eq, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { emailLog } from '$lib/server/db/schema';
import { REQUESTED_EMAIL_RULE, throttle } from './throttle';

/**
 * Whether `to` may be sent another `kind` email on request. Counted from the email log, so the
 * limit holds across restarts and whether or not the earlier emails were delivered.
 */
export async function requestedEmailAllowed(to: string, kind: string, now = new Date()) {
	const since = new Date(now.getTime() - REQUESTED_EMAIL_RULE.windowMs);
	const rows = await db
		.select({ createdAt: emailLog.createdAt })
		.from(emailLog)
		.where(and(eq(emailLog.to, to), eq(emailLog.kind, kind), gt(emailLog.createdAt, since)));
	return throttle(
		rows.map((row) => row.createdAt),
		now
	);
}
