import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { staffRole, user } from '$lib/server/db/schema';
import { formatCurrency } from '$lib/format';
import { createNotification } from '$lib/server/notifications';
import { ROUTES, siteConfig } from '$lib/site';
import {
	certificateIssuedSms,
	certificateRevokedSms,
	passwordChangedSms,
	paymentNeedsReviewSms,
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
 */

const BRAND = '#1d6fe0';

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

/** The shared frame: a branded header, the message, one button, and a footer. Table-based for mail clients. */
function layout({
	heading,
	paragraphs,
	action,
	footnote
}: {
	heading: string;
	/** Already-escaped HTML fragments. */
	paragraphs: string[];
	action?: { label: string; url: string };
	footnote?: string;
}): string {
	const button = action
		? `<tr><td style="padding:8px 0 24px"><a href="${escape(action.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escape(action.label)}</a></td></tr>`
		: '';
	return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;color:#1a1d21">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e6ee;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND};padding:18px 28px;color:#ffffff;font-weight:700;font-size:16px">${escape(siteConfig.name)}</td></tr>
<tr><td style="padding:28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escape(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:14px;line-height:1.6;padding-bottom:12px;color:#3c4350">${p}</td></tr>`).join('')}
${button}
${action ? `<tr><td style="font-size:12px;color:#7a8291;padding-bottom:4px">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${escape(action.url)}</span></td></tr>` : ''}
${footnote ? `<tr><td style="font-size:12px;color:#7a8291;padding-top:12px">${footnote}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e1e6ee;font-size:12px;color:#7a8291">${escape(siteConfig.name)} · ${escape(siteConfig.description)}</td></tr>
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

export function passwordResetEmail(to: { email: string; name: string }, url: string) {
	const email = sendEmail({
		to: to.email,
		kind: 'password-reset',
		subject: `Reset your ${siteConfig.name} password`,
		html: layout({
			heading: 'Reset your password',
			paragraphs: [
				`Hi ${escape(firstName(to.name))},`,
				'Someone (hopefully you) asked to reset the password for your account. Choose a new one with the button below. The link expires in one hour.'
			],
			action: { label: 'Choose a new password', url },
			footnote: "If you didn't ask for this, ignore this email: your password stays the same."
		})
	});
	return withSms(email, textUser(to.email, 'password-reset', passwordResetSms(url)));
}

export function verifyEmailEmail(to: { email: string; name: string }, url: string) {
	return sendEmail({
		to: to.email,
		kind: 'verify-email',
		subject: `Confirm your email for ${siteConfig.name}`,
		html: layout({
			heading: 'Confirm your email address',
			paragraphs: [
				`Welcome, ${escape(firstName(to.name))}!`,
				'Please confirm this is your email address, so we can reach you about your courses and certificates.'
			],
			action: { label: 'Confirm email', url }
		})
	});
}

export function welcomeEmail(to: { email: string; name: string }) {
	return sendEmail({
		to: to.email,
		kind: 'welcome',
		subject: `Welcome to ${siteConfig.name}`,
		html: layout({
			heading: `Welcome, ${firstName(to.name)}!`,
			paragraphs: [
				'Your account is ready. Browse the catalog, start a free course straight away, or enroll in a paid one when you are ready.'
			],
			action: { label: 'Browse courses', url: siteUrl(ROUTES.courses.list) }
		})
	});
}

// ── Enrollment and payments ─────────────────────────────────────────────────────────────────

export function enrollmentConfirmedEmail(details: {
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
	const paid = Number(details.amount) > 0;
	const how =
		details.provider === 'CHAPA'
			? `Your payment of <strong>${escape(formatCurrency(details.amount, details.currency))}</strong> through Chapa is confirmed${details.reference ? ` (reference ${escape(details.reference)})` : ''}.`
			: details.provider === 'MANUAL'
				? `We have approved your payment of <strong>${escape(formatCurrency(details.amount, details.currency))}</strong>.`
				: '';
	const learnUrl = siteUrl(ROUTES.student.learn(details.courseSlug));
	const email = sendEmail({
		to: details.to,
		kind: 'enrollment-confirmed',
		subject: `You're enrolled: ${details.courseTitle}`,
		html: layout({
			heading: "You're enrolled!",
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				...(paid && how ? [how] : []),
				`You now have full access to <strong>${escape(details.courseTitle)}</strong>. Pick up where you like, at your own pace.`
			],
			action: { label: 'Start learning', url: learnUrl }
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
					url: learnUrl
				})
			),
			createNotification({
				email: details.to,
				kind: 'enrollment-confirmed',
				title: `You're enrolled: ${details.courseTitle}`,
				body:
					paid && details.provider !== 'FREE'
						? `Your payment of ${formatCurrency(details.amount, details.currency)} is confirmed. The course is unlocked.`
						: 'You now have full access. Start learning at your own pace.',
				link: ROUTES.student.learn(details.courseSlug)
			})
		])
	);
}

export function paymentRejectedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	courseSlug: string;
	reason: string;
}) {
	const checkoutUrl = siteUrl(ROUTES.student.checkout(details.courseSlug));
	const email = sendEmail({
		to: details.to,
		kind: 'payment-rejected',
		subject: `Payment not approved: ${details.courseTitle}`,
		html: layout({
			heading: "We couldn't approve your payment",
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				`We reviewed the receipt you sent for <strong>${escape(details.courseTitle)}</strong> and could not approve it:`,
				`<em>${escape(details.reason)}</em>`,
				'You can submit a new receipt, or pay online, from the checkout page.'
			],
			action: { label: 'Resubmit payment', url: checkoutUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'payment-rejected',
				paymentRejectedSms({ courseTitle: details.courseTitle, reason: details.reason, url: checkoutUrl })
			),
			createNotification({
				email: details.to,
				kind: 'payment-rejected',
				title: `Payment not approved: ${details.courseTitle}`,
				body: `${details.reason} You can submit a new receipt or pay online from checkout.`,
				link: ROUTES.student.checkout(details.courseSlug)
			})
		])
	);
}

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

export function certificateIssuedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	code: string;
	token: string;
}) {
	const certificateUrl = siteUrl(ROUTES.student.certificate(details.code));
	const email = sendEmail({
		to: details.to,
		kind: 'certificate-issued',
		subject: `Your certificate: ${details.courseTitle}`,
		html: layout({
			heading: 'Congratulations, you earned a certificate!',
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				`You completed <strong>${escape(details.courseTitle)}</strong>. Your certificate number is <strong>${escape(details.code)}</strong>.`,
				`Anyone can check it is genuine at <a href="${escape(siteUrl(ROUTES.certificates.verify(details.token)))}">this verification link</a> — add it to your CV or LinkedIn.`
			],
			action: { label: 'View your certificate', url: certificateUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'certificate-issued',
				certificateIssuedSms({ courseTitle: details.courseTitle, code: details.code, url: certificateUrl })
			),
			createNotification({
				email: details.to,
				kind: 'certificate-issued',
				title: `Certificate earned: ${details.courseTitle}`,
				body: `Congratulations! Your certificate number is ${details.code}.`,
				link: ROUTES.student.certificate(details.code)
			})
		])
	);
}

// ── Contact ─────────────────────────────────────────────────────────────────────────────────

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
export function receiptReceivedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	courseSlug: string;
	amount: number | string;
	currency: string;
}) {
	const statusUrl = siteUrl(ROUTES.student.checkout(details.courseSlug));
	const email = sendEmail({
		to: details.to,
		kind: 'receipt-received',
		subject: `Payment received: ${details.courseTitle}`,
		html: layout({
			heading: "We've received your payment",
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				`Thanks! Your receipt for <strong>${escape(formatCurrency(details.amount, details.currency))}</strong> for <strong>${escape(details.courseTitle)}</strong> is with our team.`,
				"We check every payment by hand, usually within a working day. You'll get an email (and a text, if your phone is verified) as soon as the course is unlocked."
			],
			action: { label: 'See payment status', url: statusUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(
				details.to,
				'receipt-received',
				receiptReceivedSms({ courseTitle: details.courseTitle, amount: details.amount, currency: details.currency, url: statusUrl })
			),
			createNotification({
				email: details.to,
				kind: 'receipt-received',
				title: `Payment received: ${details.courseTitle}`,
				body: `Your receipt for ${formatCurrency(details.amount, details.currency)} is with our team. We check every payment by hand, usually within a working day.`,
				link: ROUTES.student.payments
			})
		])
	);
}

/** A Chapa payment took money but can't be matched (wrong amount or currency, or paid twice). */
export function paymentNeedsReviewAdminEmail(details: {
	studentName: string;
	studentEmail: string;
	courseTitle: string;
	amount: number | string;
	currency: string;
	reason: string;
	reference?: string | null;
}) {
	const reviewUrl = siteUrl('/dashboard/enrollments');
	return toAdmins(
		'payment-needs-review',
		`Online payment needs review: ${details.courseTitle}`,
		layout({
			heading: 'An online payment needs your review',
			paragraphs: [
				`Chapa took a payment from <strong>${escape(details.studentName)}</strong> (${escape(details.studentEmail)}) for <strong>${escape(details.courseTitle)}</strong>${details.reference ? ` (reference ${escape(details.reference)})` : ''}, but it could not be applied automatically:`,
				`<em>${escape(details.reason)}</em>`,
				`Expected ${escape(formatCurrency(details.amount, details.currency))}. Decide whether to enroll the student or refund them in Chapa.`
			],
			action: { label: 'Open enrollments', url: reviewUrl }
		}),
		paymentNeedsReviewSms({ studentName: details.studentName, courseTitle: details.courseTitle, reason: details.reason, url: reviewUrl })
	);
}

// ── Account security ────────────────────────────────────────────────────────────────────────

export function passwordChangedEmail(to: { email: string; name: string }) {
	const resetUrl = siteUrl(ROUTES.auth.forgotPassword);
	const email = sendEmail({
		to: to.email,
		kind: 'password-changed',
		subject: `Your ${siteConfig.name} password was changed`,
		html: layout({
			heading: 'Your password was changed',
			paragraphs: [
				`Hi ${escape(firstName(to.name))},`,
				'The password for your account was just changed, and other devices were signed out.',
				"If this was you, there's nothing to do. If it wasn't, reset your password straight away."
			],
			action: { label: 'Reset my password', url: resetUrl }
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(to.email, 'password-changed', passwordChangedSms(resetUrl)),
			createNotification({
				email: to.email,
				kind: 'password-changed',
				title: 'Your password was changed',
				body: "Other devices were signed out. If this wasn't you, reset your password straight away.",
				link: ROUTES.student.account
			})
		])
	);
}

/**
 * The phone number on the account changed or was removed. The email goes to the account, and the
 * text to the OLD number: whoever held that number is the one who needs to know.
 */
export function phoneChangedEmail(details: {
	to: string;
	name: string;
	oldPhone: string | null;
	newPhone: string | null;
}) {
	const accountUrl = siteUrl(ROUTES.student.account);
	const ending = (phone: string) => `ending ${escape(phone.slice(-3))}`;
	const email = sendEmail({
		to: details.to,
		kind: 'phone-changed',
		subject: details.newPhone ? 'Your phone number was changed' : 'Your phone number was removed',
		html: layout({
			heading: details.newPhone ? 'Your phone number was changed' : 'Your phone number was removed',
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				details.newPhone
					? `Your account now uses the number ${ending(details.newPhone)}${details.oldPhone ? `, replacing the one ${ending(details.oldPhone)}` : ''}. Course and certificate texts go there from now on.`
					: `The number ${details.oldPhone ? ending(details.oldPhone) : ''} was removed from your account. You won't get texts until you add a number again.`,
				"If you didn't make this change, change your password and check your account."
			],
			action: { label: 'Review my account', url: accountUrl }
		})
	});
	const sms = details.oldPhone
		? sendSms({ to: details.oldPhone, kind: 'phone-changed', message: phoneChangedSms({ newPhone: details.newPhone, url: accountUrl }) })
		: Promise.resolve(null);
	const inApp = createNotification({
		email: details.to,
		kind: 'phone-changed',
		title: details.newPhone ? 'Your phone number was changed' : 'Your phone number was removed',
		body: details.newPhone
			? `Course and certificate texts now go to the number ending ${details.newPhone.slice(-3)}.`
			: "You won't get texts until you add a number again.",
		link: ROUTES.student.account
	});
	return withSms(email, Promise.all([sms, inApp]));
}

// ── Certificates (revoked) ──────────────────────────────────────────────────────────────────

export function certificateRevokedEmail(details: {
	to: string;
	name: string;
	courseTitle: string;
	code: string;
	reason: string;
}) {
	const email = sendEmail({
		to: details.to,
		kind: 'certificate-revoked',
		subject: `Certificate revoked: ${details.courseTitle}`,
		html: layout({
			heading: 'Your certificate has been revoked',
			paragraphs: [
				`Hi ${escape(firstName(details.name))},`,
				`Your certificate <strong>${escape(details.code)}</strong> for <strong>${escape(details.courseTitle)}</strong> has been revoked and now shows as revoked when checked:`,
				`<em>${escape(details.reason)}</em>`,
				'If you think this is a mistake, reply to this email and we will look into it.'
			]
		})
	});
	return withSms(
		email,
		Promise.all([
			textUser(details.to, 'certificate-revoked', certificateRevokedSms({ courseTitle: details.courseTitle, code: details.code, reason: details.reason })),
			createNotification({
				email: details.to,
				kind: 'certificate-revoked',
				title: `Certificate revoked: ${details.courseTitle}`,
				body: `Certificate ${details.code} was revoked: ${details.reason}`,
				link: ROUTES.student.certificates
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
