import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { staffRole, user } from '$lib/server/db/schema';
import { formatCurrency } from '$lib/format';
import { INTL_LOCALES, delocalizePath, localizePath, type Locale } from '$lib/i18n';
import { m } from '$lib/paraglide/messages';
import { currentLocale, recipientLocale } from '$lib/server/locale';
import { createNotification } from '$lib/server/notifications';
import { ROUTES, siteConfig } from '$lib/site';
import {
	certificateIssuedSms,
	certificateRevokedSms,
	passwordChangedSms,
	phoneChangedSms,
	receiptReceivedSms,
	sendSms,
	contactMessageSms,
	enrollmentConfirmedSms,
	passwordResetSms,
	paymentRejectedSms,
	receiptSubmittedSms,
	textAdmins,
	textUser
} from '$lib/server/sms';
import { sendEmail } from './send';

/*
 * Every email the academy sends, as one function each. Callers pass plain facts; wording and
 * layout live here. All of them resolve (never reject) — see `sendEmail` — so callers can
 * `await` them after their own write has committed without guarding.
 *
 * Some also text the account's verified phone (or the staff numbers). The text and the email go
 * out side by side, and neither can stop the other; the result is still the email's. The
 * student-facing ones also leave an in-app notification (the header bell), which never rejects.
 *
 * Everything a student receives is in the language their account last used the site in (looked up
 * by address: the request that triggers an email is often a staff member's). Staff emails and texts
 * stay English.
 */

const BRAND = '#0a5299';

const escape = (value: string | number | null | undefined) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

/** An absolute link into the site. */
export function siteUrl(path: string): string {
	const origin = (env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** An absolute link to a site page in `locale`, from a path in any locale (ROUTES gives the page's own). */
const pageUrl = (path: string, locale: Locale) => siteUrl(localizePath(path, locale));

/** The recipient's language; never rejects, so neither does the email. */
const localeOf = (email: string): Promise<Locale> => recipientLocale(email).catch(() => currentLocale());

const strong = (value: string | number) => `<strong>${escape(value)}</strong>`;

const price = (amount: number | string, currency: string, locale: Locale) =>
	formatCurrency(amount, currency, INTL_LOCALES[locale]);

/** The shared frame: a branded header, the message, one button, and a footer. Table-based for mail clients. */
function layout({
	locale = 'en',
	heading,
	paragraphs,
	action,
	footnote
}: {
	locale?: Locale;
	heading: string;
	/** Already-escaped HTML fragments. */
	paragraphs: string[];
	action?: { label: string; url: string };
	footnote?: string;
}): string {
	const button = action
		? `<tr><td style="padding:8px 0 24px"><a href="${escape(action.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escape(action.label)}</a></td></tr>`
		: '';
	return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f5f7fb;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;color:#1a1d21">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e6ee;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND};padding:18px 28px;color:#ffffff;font-weight:700;font-size:16px">${escape(siteConfig.name)}</td></tr>
<tr><td style="padding:28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escape(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:14px;line-height:1.6;padding-bottom:12px;color:#3c4350">${p}</td></tr>`).join('')}
${button}
${action ? `<tr><td style="font-size:12px;color:#7a8291;padding-bottom:4px">${escape(m.mail_layout_link_fallback({}, { locale }))}<br><span style="word-break:break-all">${escape(action.url)}</span></td></tr>` : ''}
${footnote ? `<tr><td style="font-size:12px;color:#7a8291;padding-top:12px">${footnote}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e1e6ee;font-size:12px;color:#7a8291">${escape(siteConfig.name)} · ${escape(m.mail_layout_tagline({}, { locale }))}</td></tr>
</table></td></tr></table></body></html>`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Administrators' addresses, or `ADMIN_NOTIFY_EMAIL` when set (comma-separated). */
async function adminRecipients(): Promise<string[]> {
	if (env.ADMIN_NOTIFY_EMAIL) {
		return env.ADMIN_NOTIFY_EMAIL.split(',')
			.map((address) => address.trim())
			.filter(Boolean);
	}
	const rows = await db
		.select({ email: user.email })
		.from(staffRole)
		.innerJoin(user, eq(user.id, staffRole.userId))
		.where(eq(staffRole.role, 'admin'));
	return rows.map((row) => row.email);
}

async function toAdmins(kind: string, subject: string, html: string, sms?: string) {
	const recipients = await adminRecipients().catch(() => []);
	await Promise.all([
		...recipients.map((to) => sendEmail({ to, subject, html, kind })),
		sms ? textAdmins(kind, sms) : undefined
	]);
}

/** The email and the text together, resolving to the email's outcome. */
async function withSms<T>(email: Promise<T>, sms: Promise<unknown>): Promise<T> {
	const [status] = await Promise.all([email, sms]);
	return status;
}

// ── Accounts ────────────────────────────────────────────────────────────────────────────────

export async function passwordResetEmail(to: { email: string; name: string }, url: string) {
	const locale = await localeOf(to.email);
	const email = sendEmail({
		to: to.email,
		kind: 'password-reset',
		subject: m.mail_reset_subject({ brand: siteConfig.name }, { locale }),
		html: layout({
			locale,
			heading: m.mail_reset_heading({}, { locale }),
			paragraphs: [m.mail_greeting({ name: escape(firstName(to.name)) }, { locale }), m.mail_reset_body({}, { locale })],
			action: { label: m.mail_reset_action({}, { locale }), url },
			footnote: m.mail_reset_footnote({}, { locale })
		})
	});
	return withSms(email, textUser(to.email, 'password-reset', passwordResetSms(url, locale)));
}

export async function verifyEmailEmail(to: { email: string; name: string }, url: string) {
	const locale = await localeOf(to.email);
	return sendEmail({
		to: to.email,
		kind: 'verify-email',
		subject: m.mail_verify_subject({ brand: siteConfig.name }, { locale }),
		html: layout({
			locale,
			heading: m.mail_verify_heading({}, { locale }),
			paragraphs: [m.mail_welcome_name({ name: escape(firstName(to.name)) }, { locale }), m.mail_verify_body({}, { locale })],
			action: { label: m.mail_verify_action({}, { locale }), url }
		})
	});
}

export async function welcomeEmail(to: { email: string; name: string }) {
	const locale = await localeOf(to.email);
	return sendEmail({
		to: to.email,
		kind: 'welcome',
		subject: m.mail_welcome_subject({ brand: siteConfig.name }, { locale }),
		html: layout({
			locale,
			heading: m.mail_welcome_name({ name: firstName(to.name) }, { locale }),
			paragraphs: [m.mail_welcome_body({}, { locale })],
			action: { label: m.mail_welcome_action({}, { locale }), url: pageUrl(ROUTES.courses.list, locale) }
		})
	});
}

// ── Enrollment and payments ─────────────────────────────────────────────────────────────────

export async function enrollmentConfirmedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	courseSlug: string;
	/** What was paid; 0 for a free course. */
	amount: number | string;
	currency: string;
	provider: 'FREE' | 'MANUAL' | 'CHAPA';
	reference?: string | null;
}) {
	const learnPath = ROUTES.student.learn(details.courseSlug);
	const locale = await localeOf(details.to);
	const paid = Number(details.amount) > 0;
	const how =
		details.provider === 'MANUAL'
			? m.mail_enrolled_payment_approved({ amount: strong(price(details.amount, details.currency, locale)) }, { locale })
			: '';
	const learnUrl = pageUrl(learnPath, locale);
	const email = sendEmail({
		to: details.to,
		kind: 'enrollment-confirmed',
		subject: m.mail_enrolled_subject({ course: details.courseTitle }, { locale }),
		html: layout({
			locale,
			heading: m.mail_enrolled_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				...(paid && how ? [how] : []),
				m.mail_enrolled_access({ course: strong(details.courseTitle) }, { locale })
			],
			action: { label: m.mail_enrolled_action({}, { locale }), url: learnUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'enrollment-confirmed',
				enrollmentConfirmedSms({
					courseTitle: details.courseTitle,
					amount: details.amount,
					currency: details.currency,
					provider: details.provider,
					url: learnUrl,
					locale
				})
			),
			createNotification({
				email: details.to,
				kind: 'enrollment-confirmed',
				title: m.mail_enrolled_subject({ course: details.courseTitle }, { locale }),
				body:
					paid && details.provider !== 'FREE'
						? m.mail_enrolled_note_paid({ amount: price(details.amount, details.currency, locale) }, { locale })
						: m.mail_enrolled_note_free({}, { locale }),
				link: delocalizePath(learnPath)
			})
		])
	);
}

export async function paymentRejectedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	courseSlug: string;
	reason: string;
}) {
	const checkoutPath = ROUTES.student.checkout(details.courseSlug);
	const locale = await localeOf(details.to);
	const checkoutUrl = pageUrl(checkoutPath, locale);
	const email = sendEmail({
		to: details.to,
		kind: 'payment-rejected',
		subject: m.mail_rejected_subject({ course: details.courseTitle }, { locale }),
		html: layout({
			locale,
			heading: m.mail_rejected_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				m.mail_rejected_reviewed({ course: strong(details.courseTitle) }, { locale }),
				`<em>${escape(details.reason)}</em>`,
				m.mail_rejected_next({}, { locale })
			],
			action: { label: m.mail_rejected_action({}, { locale }), url: checkoutUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'payment-rejected',
				paymentRejectedSms({ courseTitle: details.courseTitle, reason: details.reason, url: checkoutUrl, locale })
			),
			createNotification({
				email: details.to,
				kind: 'payment-rejected',
				title: m.mail_rejected_subject({ course: details.courseTitle }, { locale }),
				body: m.mail_rejected_note({ reason: details.reason }, { locale }),
				link: delocalizePath(checkoutPath)
			})
		])
	);
}

/** To staff: English. */
export function receiptSubmittedAdminEmail(details: {
	studentName: string;
	studentEmail: string;
	courseTitle: string;
	amount: number | string;
	currency: string;
	reference?: string | null;
}) {
	const reviewUrl = siteUrl('/dashboard/enrollments?status=PENDING');
	return toAdmins(
		'receipt-submitted',
		`Receipt to review: ${details.courseTitle}`,
		layout({
			heading: 'A payment receipt is waiting for review',
			paragraphs: [
				`<strong>${escape(details.studentName)}</strong> (${escape(details.studentEmail)}) paid <strong>${escape(formatCurrency(details.amount, details.currency))}</strong> for <strong>${escape(details.courseTitle)}</strong>${details.reference ? `, transaction ${escape(details.reference)}` : ''}.`,
				'They can start the course as soon as you approve it.'
			],
			action: { label: 'Review payments', url: reviewUrl }
		}),
		receiptSubmittedSms({
			studentName: details.studentName,
			courseTitle: details.courseTitle,
			amount: details.amount,
			currency: details.currency,
			url: reviewUrl
		})
	);
}

// ── Certificates ────────────────────────────────────────────────────────────────────────────

export async function certificateIssuedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	code: string;
	token: string;
}) {
	const certificatePath = ROUTES.student.certificate(details.code);
	const verifyPath = ROUTES.certificates.verify(details.token);
	const locale = await localeOf(details.to);
	const certificateUrl = pageUrl(certificatePath, locale);
	const verifyLink = `<a href="${escape(pageUrl(verifyPath, locale))}">${escape(m.mail_cert_verify_link({}, { locale }))}</a>`;
	const email = sendEmail({
		to: details.to,
		kind: 'certificate-issued',
		subject: m.mail_cert_subject({ course: details.courseTitle }, { locale }),
		html: layout({
			locale,
			heading: m.mail_cert_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				m.mail_cert_completed({ course: strong(details.courseTitle), code: strong(details.code) }, { locale }),
				m.mail_cert_verify({ link: verifyLink }, { locale })
			],
			action: { label: m.mail_cert_action({}, { locale }), url: certificateUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'certificate-issued',
				certificateIssuedSms({ courseTitle: details.courseTitle, code: details.code, url: certificateUrl, locale })
			),
			createNotification({
				email: details.to,
				kind: 'certificate-issued',
				title: m.mail_cert_note_title({ course: details.courseTitle }, { locale }),
				body: m.mail_cert_note_body({ code: details.code }, { locale }),
				link: delocalizePath(certificatePath)
			})
		])
	);
}

// ── Contact ─────────────────────────────────────────────────────────────────────────────────

/** To staff: English. */
export function contactMessageAdminEmail(details: { name: string; email: string; message: string }) {
	const inboxUrl = siteUrl('/dashboard/messages');
	return toAdmins(
		'contact-message',
		`New message from ${details.name}`,
		layout({
			heading: 'New contact message',
			paragraphs: [
				`<strong>${escape(details.name)}</strong> &lt;${escape(details.email)}&gt; wrote:`,
				`<span style="white-space:pre-wrap">${escape(details.message)}</span>`
			],
			action: { label: 'Open the inbox', url: inboxUrl },
			footnote: 'Reply to the sender directly from your own mail client.'
		}),
		contactMessageSms({ ...details, url: inboxUrl })
	);
}

// ── Payments (student side) ─────────────────────────────────────────────────────────────────

/** The student's receipt is in: without this they hear nothing until staff review it. */
export async function receiptReceivedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	courseSlug: string;
	amount: number | string;
	currency: string;
}) {
	const checkoutPath = ROUTES.student.checkout(details.courseSlug);
	const paymentsPath = ROUTES.student.payments;
	const locale = await localeOf(details.to);
	const statusUrl = pageUrl(checkoutPath, locale);
	const amount = price(details.amount, details.currency, locale);
	const email = sendEmail({
		to: details.to,
		kind: 'receipt-received',
		subject: m.mail_receipt_subject({ course: details.courseTitle }, { locale }),
		html: layout({
			locale,
			heading: m.mail_receipt_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				m.mail_receipt_thanks({ amount: strong(amount), course: strong(details.courseTitle) }, { locale }),
				m.mail_receipt_review({}, { locale })
			],
			action: { label: m.mail_receipt_action({}, { locale }), url: statusUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'receipt-received',
				receiptReceivedSms({
					courseTitle: details.courseTitle,
					amount: details.amount,
					currency: details.currency,
					url: statusUrl,
					locale
				})
			),
			createNotification({
				email: details.to,
				kind: 'receipt-received',
				title: m.mail_receipt_subject({ course: details.courseTitle }, { locale }),
				body: m.mail_receipt_note({ amount }, { locale }),
				link: delocalizePath(paymentsPath)
			})
		])
	);
}

// ── Account security ────────────────────────────────────────────────────────────────────────

export async function passwordChangedEmail(to: { email: string; name: string }) {
	const resetPath = ROUTES.auth.forgotPassword;
	const accountPath = ROUTES.student.account;
	const locale = await localeOf(to.email);
	const resetUrl = pageUrl(resetPath, locale);
	const email = sendEmail({
		to: to.email,
		kind: 'password-changed',
		subject: m.mail_pwchanged_subject({ brand: siteConfig.name }, { locale }),
		html: layout({
			locale,
			heading: m.mail_pwchanged_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(to.name)) }, { locale }),
				m.mail_pwchanged_body({}, { locale }),
				m.mail_pwchanged_advice({}, { locale })
			],
			action: { label: m.mail_pwchanged_action({}, { locale }), url: resetUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(to.email, 'password-changed', passwordChangedSms(resetUrl, locale)),
			createNotification({
				email: to.email,
				kind: 'password-changed',
				title: m.mail_pwchanged_heading({}, { locale }),
				body: m.mail_pwchanged_note({}, { locale }),
				link: delocalizePath(accountPath)
			})
		])
	);
}

/**
 * The phone number on the account changed or was removed. The email goes to the account, and the
 * text to the OLD number: whoever held that number is the one who needs to know.
 */
export async function phoneChangedEmail(details: {
	to: string;
	name: string;
	oldPhone: string | null;
	newPhone: string | null;
}) {
	const accountPath = ROUTES.student.account;
	const locale = await localeOf(details.to);
	const accountUrl = pageUrl(accountPath, locale);
	const ending = (phone: string) => m.mail_phone_ending({ digits: escape(phone.slice(-3)) }, { locale });
	const title = details.newPhone ? m.mail_phone_changed_title({}, { locale }) : m.mail_phone_removed_title({}, { locale });
	const email = sendEmail({
		to: details.to,
		kind: 'phone-changed',
		subject: title,
		html: layout({
			locale,
			heading: title,
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				details.newPhone
					? details.oldPhone
						? m.mail_phone_now_replacing({ number: ending(details.newPhone), old: ending(details.oldPhone) }, { locale })
						: m.mail_phone_now({ number: ending(details.newPhone) }, { locale })
					: m.mail_phone_removed_body({ number: details.oldPhone ? ending(details.oldPhone) : '' }, { locale }),
				m.mail_phone_check({}, { locale })
			],
			action: { label: m.mail_phone_action({}, { locale }), url: accountUrl }
		})
	});
	const sms = details.oldPhone
		? sendSms({
				to: details.oldPhone,
				kind: 'phone-changed',
				message: phoneChangedSms({ newPhone: details.newPhone, url: accountUrl, locale })
			})
		: Promise.resolve(null);
	const inApp = createNotification({
		email: details.to,
		kind: 'phone-changed',
		title,
		body: details.newPhone
			? m.mail_phone_note_changed({ digits: details.newPhone.slice(-3) }, { locale })
			: m.mail_phone_note_removed({}, { locale }),
		link: delocalizePath(accountPath)
	});
	return withSms(email, Promise.all([sms, inApp]));
}

// ── Certificates (revoked) ──────────────────────────────────────────────────────────────────

export async function certificateRevokedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	code: string;
	reason: string;
}) {
	const certificatesPath = ROUTES.student.certificates;
	const locale = await localeOf(details.to);
	const email = sendEmail({
		to: details.to,
		kind: 'certificate-revoked',
		subject: m.mail_revoked_subject({ course: details.courseTitle }, { locale }),
		html: layout({
			locale,
			heading: m.mail_revoked_heading({}, { locale }),
			paragraphs: [
				m.mail_greeting({ name: escape(firstName(details.name)) }, { locale }),
				m.mail_revoked_body({ code: strong(details.code), course: strong(details.courseTitle) }, { locale }),
				`<em>${escape(details.reason)}</em>`,
				m.mail_revoked_reply({}, { locale })
			]
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'certificate-revoked',
				certificateRevokedSms({ courseTitle: details.courseTitle, code: details.code, reason: details.reason, locale })
			),
			createNotification({
				email: details.to,
				kind: 'certificate-revoked',
				title: m.mail_revoked_subject({ course: details.courseTitle }, { locale }),
				body: m.mail_revoked_note({ code: details.code, reason: details.reason }, { locale }),
				link: delocalizePath(certificatesPath)
			})
		])
	);
}

// ── Staff test ──────────────────────────────────────────────────────────────────────────────

/** A real email from the dashboard, to check the SMTP settings end to end. */
export function testEmail(to: string, sentBy: string) {
	return sendEmail({
		to,
		kind: 'test',
		subject: `Test email from ${siteConfig.name}`,
		html: layout({
			heading: 'Your email settings work',
			paragraphs: [
				`This test was sent from the dashboard by ${escape(sentBy)}. If you are reading it, the academy's mail server is set up correctly.`,
				'Students will receive their account, enrollment, payment and certificate emails from this same address.'
			],
			action: { label: 'Open the email log', url: siteUrl('/dashboard/emails') }
		})
	});
}
