import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { auth, SmsCodeNotSent } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { describeWait, phoneChangedEmail } from '$lib/server/email';
import { accountCodeAllowed, smsAllowed } from '$lib/server/sms';
import { normalizeEthPhone } from '$lib/phone';

/*
 * Adding a phone number to a signed-in account: a code is texted to the number, and the number is
 * saved (verified) only when the code comes back. Until then nothing is stored on the account, so
 * nobody can hold a number they have not proved is theirs. The number waiting for its code lives in
 * a short cookie tied to the account.
 */

const PENDING_COOKIE = 'pending_phone';

/** The number this account is waiting to verify, if any. */
export function pendingPhone(cookies: Cookies, userId: string): string | null {
	const [owner, phone] = (cookies.get(PENDING_COOKIE) ?? '').split(':');
	return owner === userId && phone && normalizeEthPhone(phone) === phone ? phone : null;
}

export function clearPendingPhone(cookies: Cookies) {
	cookies.delete(PENDING_COOKIE, { path: '/' });
}

function setPendingPhone({ cookies, url }: Pick<RequestEvent, 'cookies' | 'url'>, userId: string, phone: string) {
	cookies.set(PENDING_COOKIE, `${userId}:${phone}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		// A little longer than the code lives, so the form can still say "expired, send a new one".
		maxAge: 15 * 60
	});
}

export type PhoneOutcome = { ok: true; phone: string } | { ok: false; error: string };

/** Why `phone` (normalised) cannot be added to `userId`'s account, or null when it can. */
export async function phoneUnavailable(phone: string, userId: string | null): Promise<string | null> {
	const [holder] = await db
		.select({ id: user.id, verified: user.phoneNumberVerified })
		.from(user)
		.where(eq(user.phoneNumber, phone))
		.limit(1);
	if (!holder) return null;
	if (holder.id === userId) return holder.verified ? 'This is already your verified number.' : null;
	return 'This number is already linked to another account.';
}

/** Texts a verification code to `raw` for the signed-in `userId`. */
export async function requestPhoneCode(
	event: Pick<RequestEvent, 'cookies' | 'url' | 'request'>,
	userId: string,
	raw: string
): Promise<PhoneOutcome> {
	const phone = normalizeEthPhone(raw);
	if (!phone) return { ok: false, error: 'Enter an Ethiopian mobile number, like 0912 345 678.' };

	const unavailable = await phoneUnavailable(phone, userId);
	if (unavailable) return { ok: false, error: unavailable };

	const toNumber = await smsAllowed(phone, 'otp');
	if (!toNumber.allowed) {
		const wait = describeWait(toNumber.retryAfter);
		return {
			ok: false,
			error:
				toNumber.retryAfter <= 60
					? `We just sent a code to this number. You can ask again in ${wait}.`
					: `This number has had several codes already. You can ask again in ${wait}.`
		};
	}
	const forAccount = accountCodeAllowed(userId);
	if (!forAccount.allowed) {
		return { ok: false, error: `You have asked for several codes. Try again in ${describeWait(forAccount.retryAfter)}.` };
	}

	try {
		await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone }, headers: event.request.headers });
	} catch (err) {
		if (err instanceof SmsCodeNotSent) {
			return {
				ok: false,
				error: err.retryAfter
					? `We can't text this number again yet. Try again in ${describeWait(err.retryAfter)}.`
					: "We couldn't send the code just now. Please try again in a few minutes."
			};
		}
		if (err instanceof APIError) return { ok: false, error: 'Enter an Ethiopian mobile number, like 0912 345 678.' };
		throw err;
	}

	setPendingPhone(event, userId, phone);
	return { ok: true, phone };
}

const CODE_ERRORS: Record<string, string> = {
	INVALID_OTP: "That code isn't right. Check the text message and try again.",
	OTP_EXPIRED: 'This code has expired. Send a new one.',
	OTP_NOT_FOUND: 'This code has expired. Send a new one.',
	TOO_MANY_ATTEMPTS: 'Too many wrong codes. Send a new one.',
	PHONE_NUMBER_EXIST: 'This number is already linked to another account.'
};

/** Checks the code for the pending number and, when right, saves the number as verified. */
export async function confirmPhoneCode(
	event: Pick<RequestEvent, 'cookies' | 'request'>,
	userId: string,
	code: string
): Promise<PhoneOutcome> {
	const phone = pendingPhone(event.cookies, userId);
	if (!phone) return { ok: false, error: 'No code is waiting. Enter your number and send a code first.' };
	const before = await phoneOwner(userId);
	if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6-digit code from the text message.' };

	try {
		await auth.api.verifyPhoneNumber({
			body: { phoneNumber: phone, code, updatePhoneNumber: true, disableSession: true },
			headers: event.request.headers
		});
	} catch (err) {
		if (!(err instanceof APIError)) throw err;
		const reason = String(err.body?.code ?? '');
		return { ok: false, error: CODE_ERRORS[reason] ?? 'Could not verify this number. Send a new code and try again.' };
	}

	clearPendingPhone(event.cookies);
	// Only a change is news; adding a first number is what the student just did themselves.
	if (before?.phone && before.phone !== phone) {
		void phoneChangedEmail({ to: before.email, name: before.name, oldPhone: before.phone, newPhone: phone });
	}
	return { ok: true, phone };
}

/** The account's current verified number, with what is needed to tell its owner about a change. */
async function phoneOwner(userId: string) {
	const [row] = await db
		.select({ email: user.email, name: user.name, phone: user.phoneNumber, verified: user.phoneNumberVerified })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return row ? { ...row, phone: row.verified ? row.phone : null } : null;
}

/** Takes the number off the account; it stops getting texts straight away. */
export async function removePhone(userId: string) {
	const before = await phoneOwner(userId);
	await db.update(user).set({ phoneNumber: null, phoneNumberVerified: false }).where(eq(user.id, userId));
	if (before?.phone) {
		void phoneChangedEmail({ to: before.email, name: before.name, oldPhone: before.phone, newPhone: null });
	}
}
