import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { smsLog, type EMAIL_STATUSES } from '$lib/server/db/schema';
import { maskPhone, normalizeEthPhone } from '$lib/phone';
import { siteConfig } from '$lib/site';
import { capSms, postToGeezSms } from './geez';
import { smsAllowed } from './limits';

export type SmsStatus = (typeof EMAIL_STATUSES)[number];

export interface OutgoingSms {
	/** Any form `formatAndValidateEthPhone` accepts. */
	to: string;
	message: string;
	/** What the text is for (`otp`, `enrollment-confirmed`, …), for the SMS log and its limits. */
	kind: string;
}

export interface SmsResult {
	status: SmsStatus;
	error: string | null;
	/** Set when a limit refused the text: whole seconds until it would be allowed. */
	retryAfter?: number;
}

/** Every text says who it is from, whoever wrote it. */
function branded(message: string): string {
	const text = message.trim();
	return text.startsWith(siteConfig.name) ? text : `${siteConfig.name}: ${text}`;
}

const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

/**
 * Sends one text and records it in `sms_log`. Never throws: GeezSMS being down, out of balance or
 * slow must not fail the sign-up, payment or approval that triggered it. Without SMS_KEY nothing is
 * sent (SKIPPED) and the text is only logged.
 */
export async function sendSms(sms: OutgoingSms): Promise<SmsResult> {
	const to = normalizeEthPhone(sms.to);
	const message = capSms(branded(sms.message));
	let result: SmsResult = { status: 'SKIPPED', error: null };

	try {
		if (!to) {
			result = { status: 'FAILED', error: 'Invalid Ethiopian mobile number' };
		} else {
			const limit = await smsAllowed(to, sms.kind);
			if (!limit.allowed) {
				result = { status: 'SKIPPED', error: `Rate limited: ${limit.reason}`, retryAfter: limit.retryAfter };
			} else if (!env.SMS_KEY) {
				console.info(`[sms skipped: no SMS_KEY] ${sms.kind} → ${maskPhone(to)}`);
			} else {
				const outcome = await postToGeezSms({
					token: env.SMS_KEY,
					phone: to,
					msg: message,
					shortcodeId: env.SMS_SHORTCODE_ID
				});
				result = outcome.ok ? { status: 'SENT', error: null } : { status: 'FAILED', error: outcome.error };
			}
		}
	} catch (cause) {
		result = { status: 'FAILED', error: messageOf(cause) };
	}

	if (result.status === 'FAILED') {
		console.error(`SMS "${sms.kind}" to ${to ? maskPhone(to) : 'an invalid number'} failed: ${result.error}`);
	}

	try {
		await db.insert(smsLog).values({
			// An invalid number is kept as typed (digits and +), so the log shows what was wrong.
			to: to ?? (sms.to.replace(/[^\d+]/g, '').slice(0, 20) || '-'),
			kind: sms.kind.slice(0, 60),
			message,
			status: result.status,
			error: result.error?.slice(0, 500) ?? null
		});
	} catch (cause) {
		console.error('Could not record an SMS in sms_log:', cause);
	}
	return result;
}
