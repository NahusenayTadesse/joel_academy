import { fail } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { EMAIL_STATUSES, smsLog } from '$lib/server/db/schema';
import { describeWait } from '$lib/server/email';
import { adminPhones, sendSms } from '$lib/server/sms';
import { maskPhone, normalizeEthPhone } from '$lib/phone';
import type { Actions, PageServerLoad } from './$types';

/* The log only grows; the newest rows are what anyone looks for. */
const LIMIT = 500;

export const load: PageServerLoad = async ({ url }) => {
	const status = EMAIL_STATUSES.find((s) => s === url.searchParams.get('status'));
	const kind = url.searchParams.get('kind')?.trim() || null;
	const numberInput = url.searchParams.get('number')?.trim() || '';
	const number = normalizeEthPhone(numberInput);

	const where = and(
		status ? eq(smsLog.status, status) : undefined,
		kind ? eq(smsLog.kind, kind) : undefined,
		number ? eq(smsLog.to, number) : undefined
	);

	const [rows, statusCounts, kinds, [{ matching }]] = await Promise.all([
		db.select().from(smsLog).where(where).orderBy(desc(smsLog.createdAt), desc(smsLog.id)).limit(LIMIT),
		db
			.select({ status: smsLog.status, total: sql<number>`count(*)` })
			.from(smsLog)
			.where(and(kind ? eq(smsLog.kind, kind) : undefined, number ? eq(smsLog.to, number) : undefined))
			.groupBy(smsLog.status),
		db
			.select({ kind: smsLog.kind, total: sql<number>`count(*)` })
			.from(smsLog)
			.where(and(status ? eq(smsLog.status, status) : undefined, number ? eq(smsLog.to, number) : undefined))
			.groupBy(smsLog.kind)
			.orderBy(smsLog.kind),
		db.select({ matching: sql<number>`count(*)` }).from(smsLog).where(where)
	]);

	const counts = { SENT: 0, FAILED: 0, SKIPPED: 0 };
	for (const row of statusCounts) counts[row.status] = Number(row.total);

	return {
		status: status ?? null,
		kind,
		number: numberInput,
		numberInvalid: Boolean(numberInput) && !number,
		counts,
		kinds: kinds.map((row) => ({ kind: row.kind, total: Number(row.total) })),
		rows: rows.map((row) => ({
			id: row.id,
			createdAt: row.createdAt,
			// Masked: the log is for spotting problems, not a phone book.
			to: maskPhone(row.to),
			kind: row.kind,
			status: row.status,
			error: row.error,
			// A delivered code belongs to its phone alone; a skipped one is how development reads it.
			message:
				row.kind === 'otp' && row.status !== 'SKIPPED' ? row.message.replace(/\b\d{6}\b/g, '••••••') : row.message
		})),
		matching: Number(matching),
		limit: LIMIT,
		smsConfigured: Boolean(env.SMS_KEY),
		senderId: Boolean(env.SMS_SHORTCODE_ID),
		staffPhones: adminPhones().length
	};
};

export const actions: Actions = {
	/* The way to check GeezSMS credentials: one real text, limited like every other. */
	test: async ({ request }) => {
		const data = await request.formData();
		const phone = String(data.get('phone') ?? '').trim();
		const message = String(data.get('message') ?? '').trim();

		if (!normalizeEthPhone(phone)) {
			return fail(400, { phone, message, error: 'Enter an Ethiopian mobile number, like 0912 345 678.' });
		}
		if (!message) return fail(400, { phone, message, error: 'Write a message to send.' });
		if (message.length > 300) return fail(400, { phone, message, error: 'Keep the message under 300 characters.' });

		const result = await sendSms({ to: phone, message, kind: 'test' });
		if (result.retryAfter) {
			return fail(429, {
				phone,
				message,
				error: `Too many test texts to this number. Try again in ${describeWait(result.retryAfter)}.`
			});
		}
		return { phone, message, status: result.status, sendError: result.error };
	}
};
