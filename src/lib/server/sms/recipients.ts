import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { sendSms, type SmsResult } from './send';

/** The account's phone number, only once it is verified: an unverified number could be anyone's. */
export async function verifiedPhoneFor(email: string): Promise<string | null> {
	const [row] = await db
		.select({ phone: user.phoneNumber })
		.from(user)
		.where(and(eq(user.email, email.toLowerCase()), eq(user.phoneNumberVerified, true)))
		.limit(1);
	return row?.phone ?? null;
}

/** Texts the account with this email, if it has a verified number. Never rejects. */
export async function textUser(email: string, kind: string, message: string): Promise<SmsResult | null> {
	try {
		const phone = await verifiedPhoneFor(email);
		return phone ? await sendSms({ to: phone, kind, message }) : null;
	} catch (cause) {
		console.error(`Could not text the account for "${kind}":`, cause);
		return null;
	}
}

/** Staff numbers from `ADMIN_NOTIFY_PHONE` (comma-separated); none when unset. */
export function adminPhones(): string[] {
	return (env.ADMIN_NOTIFY_PHONE ?? '')
		.split(',')
		.map((phone) => phone.trim())
		.filter(Boolean);
}

/** Texts every staff number. Never rejects. */
export async function textAdmins(kind: string, message: string): Promise<void> {
	await Promise.all(adminPhones().map((to) => sendSms({ to, kind, message })));
}
