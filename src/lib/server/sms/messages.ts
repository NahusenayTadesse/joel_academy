import { formatCurrency } from '$lib/format';
import { INTL_LOCALES, type Locale } from '$lib/i18n';
import { m } from '$lib/paraglide/messages';
import { siteConfig } from '$lib/site';

/*
 * The words of every text, written for a phone screen rather than stripped from the emails.
 * Variable parts are clipped so the link at the end always survives GeezSMS's 335 characters, and
 * kept to plain characters (an ellipsis or curly quote would switch the whole text to a costlier
 * encoding). Texts to students come in their language (`locale`, English by default); Amharic is
 * sent as UCS-2 anyway, so its wording is kept short. Staff texts are English.
 */

const NAME = siteConfig.name;

/** Shortens `text` to `max` characters with "...", on one line. */
export function clip(text: string, max: number): string {
	const line = text.replace(/\s+/g, ' ').trim();
	return line.length <= max ? line : `${line.slice(0, max - 3).trimEnd()}...`;
}

/** Intl puts a no-break space after "ETB", which is not a plain SMS character. */
const money = (amount: number | string, currency: string, locale: Locale = 'en') =>
	formatCurrency(amount, currency, INTL_LOCALES[locale]).replace(/[  ]/g, ' ');

/** A clipped sentence without its closing punctuation, so the text can add its own. */
const sentence = (text: string, max: number) => clip(text, max).replace(/[\s.!?።]+$/, '');

export const OTP_MINUTES = 5;

export const otpSms = (code: string, locale: Locale = 'en') =>
	m.mail_sms_otp({ brand: NAME, code, minutes: OTP_MINUTES }, { locale });

export function enrollmentConfirmedSms(details: {
	courseTitle: string;
	amount: number | string;
	currency: string;
	provider: 'FREE' | 'MANUAL' | 'CHAPA';
	url: string;
	locale?: Locale;
}) {
	const locale = details.locale ?? 'en';
	const paid = details.provider !== 'FREE' && Number(details.amount) > 0;
	const payment = paid
		? ` ${m.mail_sms_enrolled_payment({ amount: money(details.amount, details.currency, locale) }, { locale })}`
		: '';
	return m.mail_sms_enrolled({ brand: NAME, course: clip(details.courseTitle, 80), payment, url: details.url }, { locale });
}

export function paymentRejectedSms(details: { courseTitle: string; reason: string; url: string; locale?: Locale }) {
	return m.mail_sms_rejected(
		{ brand: NAME, course: clip(details.courseTitle, 60), reason: sentence(details.reason, 120), url: details.url },
		{ locale: details.locale ?? 'en' }
	);
}

export function certificateIssuedSms(details: { courseTitle: string; code: string; url: string; locale?: Locale }) {
	return m.mail_sms_cert(
		{ brand: NAME, course: clip(details.courseTitle, 80), code: details.code, url: details.url },
		{ locale: details.locale ?? 'en' }
	);
}

export function passwordResetSms(url: string, locale: Locale = 'en') {
	return m.mail_sms_reset({ brand: NAME, url }, { locale });
}

/** To staff: English. */
export function receiptSubmittedSms(details: {
	studentName: string;
	courseTitle: string;
	amount: number | string;
	currency: string;
	url: string;
}) {
	return `${NAME}: New receipt to review. ${clip(details.studentName, 40)} paid ${money(details.amount, details.currency)} for "${clip(details.courseTitle, 60)}". ${details.url}`;
}

/** To staff: English. */
export function contactMessageSms(details: { name: string; email: string; message: string; url: string }) {
	return `${NAME}: New message from ${clip(details.name, 40)} (${clip(details.email, 60)}): "${clip(details.message, 100)}" ${details.url}`;
}

export function receiptReceivedSms(details: {
	courseTitle: string;
	amount: number | string;
	currency: string;
	url: string;
	locale?: Locale;
}) {
	const locale = details.locale ?? 'en';
	return m.mail_sms_receipt(
		{
			brand: NAME,
			amount: money(details.amount, details.currency, locale),
			course: clip(details.courseTitle, 70),
			url: details.url
		},
		{ locale }
	);
}

export function passwordChangedSms(url: string, locale: Locale = 'en') {
	return m.mail_sms_pwchanged({ brand: NAME, url }, { locale });
}

/** Sent to the number being replaced, so a hijacked account cannot move its texts silently. */
export function phoneChangedSms(details: { newPhone: string | null; url: string; locale?: Locale }) {
	const locale = details.locale ?? 'en';
	return details.newPhone
		? m.mail_sms_phone_changed({ brand: NAME, digits: details.newPhone.slice(-3), url: details.url }, { locale })
		: m.mail_sms_phone_removed({ brand: NAME, url: details.url }, { locale });
}

export function certificateRevokedSms(details: { courseTitle: string; code: string; reason: string; locale?: Locale }) {
	return m.mail_sms_revoked(
		{
			brand: NAME,
			code: details.code,
			course: clip(details.courseTitle, 60),
			reason: sentence(details.reason, 120)
		},
		{ locale: details.locale ?? 'en' }
	);
}
