import { and, desc, eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { EMAIL_STATUSES, emailLog } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

/* The log only grows; the newest rows are what anyone looks for. */
const LIMIT = 500;

export const load: PageServerLoad = async ({ url }) => {
	const status = EMAIL_STATUSES.find((s) => s === url.searchParams.get('status'));
	const kind = url.searchParams.get('kind')?.trim() || null;

	const where = and(status ? eq(emailLog.status, status) : undefined, kind ? eq(emailLog.kind, kind) : undefined);

	const [rows, statusCounts, kinds, [{ matching }]] = await Promise.all([
		// The HTML stays in the database until someone opens a preview.
		db
			.select({
				id: emailLog.id,
				createdAt: emailLog.createdAt,
				to: emailLog.to,
				kind: emailLog.kind,
				subject: emailLog.subject,
				status: emailLog.status,
				error: emailLog.error
			})
			.from(emailLog)
			.where(where)
			.orderBy(desc(emailLog.createdAt), desc(emailLog.id))
			.limit(LIMIT),
		db
			.select({ status: emailLog.status, total: sql<number>`count(*)` })
			.from(emailLog)
			.where(kind ? eq(emailLog.kind, kind) : undefined)
			.groupBy(emailLog.status),
		db
			.select({ kind: emailLog.kind, total: sql<number>`count(*)` })
			.from(emailLog)
			.where(status ? eq(emailLog.status, status) : undefined)
			.groupBy(emailLog.kind)
			.orderBy(emailLog.kind),
		db.select({ matching: sql<number>`count(*)` }).from(emailLog).where(where)
	]);

	const counts = { SENT: 0, FAILED: 0, SKIPPED: 0 };
	for (const row of statusCounts) counts[row.status] = Number(row.total);

	return {
		status: status ?? null,
		kind,
		counts,
		kinds: kinds.map((row) => ({ kind: row.kind, total: Number(row.total) })),
		rows,
		matching: Number(matching),
		limit: LIMIT,
		smtpConfigured: Boolean(env.SMTP_HOST)
	};
};
