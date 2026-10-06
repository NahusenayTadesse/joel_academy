import { formatCurrency } from '$lib/format';
import { siteConfig } from '$lib/site';

/*
 * The words of every text, written for a phone screen rather than stripped from the emails.
 * Variable parts are clipped so the link at the end always survives GeezSMS's 335 characters, and
 * kept to plain characters (an ellipsis or curly quote would switch the whole text to a costlier
 * encoding).
 */

const NAME = siteConfig.name;

/** Shortens `text` to `max` characters with "...", on one line. */
export function clip(text: string, max: number): string {
	const line = text.replace(/\s+/g, ' ').trim();
	return line.length <= max ? line : `${line.slice(0, max - 3).trimEnd()}...`;
}

/** Intl puts a no-break space after "ETB", which is not a plain SMS character. */
const money = (amount: number | string, currency: string) => formatCurrency(amount, currency).replace(/[\u00a0\u202f]/g, ' ');

const sentence = (text: string, max: number) => clip(text, max).replace(/[\s.!?]+$/, '');

export const OTP_MINUTES = 5;

export const otpSms = (code: string) => `${NAME} code: ${code}. Valid ${OTP_MINUTES} minutes. Don't share it.`;

export function enrollmentConfirmedSms(details: {
	courseTitle: string;
	amount: number | string;
	currency: string;
	provider: 'FREE' | 'MANUAL' | 'CHAPA';
	url: string;
}) {
	const paid = details.provider !== 'FREE' && Number(details.amount) > 0;
	const payment = paid ? ` Your payment of ${money(details.amount, details.currency)} is confirmed.` : '';
	return `${NAME}: You're enrolled in "${clip(details.courseTitle, 80)}".${payment} Start learning: ${details.url}`;
}

export function paymentRejectedSms(details: { courseTitle: string; reason: string; url: string }) {
	return `${NAME}: We couldn't approve your payment for "${clip(details.courseTitle, 60)}". Reason: ${sentence(details.reason, 120)}. Resubmit: ${details.url}`;
}

export function certificateIssuedSms(details: { courseTitle: string; code: string; url: string }) {
	return `${NAME}: Congratulations! You earned a certificate for "${clip(details.courseTitle, 80)}" (no. ${details.code}). View it: ${details.url}`;
}

export function passwordResetSms(url: string) {
	return `${NAME}: Reset your password with this link (valid 1 hour): ${url} If you didn't ask for this, ignore it.`;
}

export function receiptSubmittedSms(details: {
	studentName: string;
	courseTitle: string;
	amount: number | string;
	currency: string;
	url: string;
}) {
	return `${NAME}: New receipt to review. ${clip(details.studentName, 40)} paid ${money(details.amount, details.currency)} for "${clip(details.courseTitle, 60)}". ${details.url}`;
}

export function contactMessageSms(details: { name: string; email: string; message: string; url: string }) {
	return `${NAME}: New message from ${clip(details.name, 40)} (${clip(details.email, 60)}): "${clip(details.message, 100)}" ${details.url}`;
}

export function receiptReceivedSms(details: { courseTitle: string; amount: number | string; currency: string; url: string }) {
	return `${NAME}: We received your payment of ${money(details.amount, details.currency)} for "${clip(details.courseTitle, 70)}". We'll text you once it's approved. Status: ${details.url}`;
}

export function passwordChangedSms(url: string) {
	return `${NAME}: Your password was just changed. If this wasn't you, reset it now: ${url}`;
}

/** Sent to the number being replaced, so a hijacked account cannot move its texts silently. */
export function phoneChangedSms(details: { newPhone: string | null; url: string }) {
	return details.newPhone
		? `${NAME}: Your account's phone number was changed to one ending ${details.newPhone.slice(-3)}. Texts now go there. Not you? Check your account: ${details.url}`
		: `${NAME}: This number was removed from your account and will get no more texts. Not you? Check your account: ${details.url}`;
}

export function certificateRevokedSms(details: { courseTitle: string; code: string; reason: string }) {
	return `${NAME}: Your certificate ${details.code} for "${clip(details.courseTitle, 60)}" has been revoked. Reason: ${sentence(details.reason, 120)}. Questions? Reply to our email.`;
}

export function paymentNeedsReviewSms(details: { studentName: string; courseTitle: string; reason: string; url: string }) {
	return `${NAME}: Online payment needs review. ${clip(details.studentName, 40)}, "${clip(details.courseTitle, 50)}": ${sentence(details.reason, 110)}. ${details.url}`;
}
