import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { emailLog } from '$lib/server/db/schema';

export interface OutgoingEmail {
	to: string;
	subject: string;
	html: string;
	/** What the email is for (`password-reset`, `enrollment-confirmed`, …), for the email log. */
	kind: string;
}

let transporter: Transporter | null | undefined;

/** The SMTP login, under either name a deployment uses (SMTP_USER or SMTP_EMAIL). */
const smtpUser = () => env.SMTP_USER || env.SMTP_EMAIL;

/** The SMTP transport, or null when no SMTP server is configured (development). */
function transport(): Transporter | null {
	if (transporter !== undefined) return transporter;
	if (!env.SMTP_HOST) return (transporter = null);
	const port = Number(env.SMTP_PORT || 465);
	transporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		// 465 is implicit TLS; anything else (587, a local catcher on 1025) negotiates STARTTLS.
		secure: port === 465,
		auth: smtpUser() ? { user: smtpUser(), pass: env.SMTP_PASSWORD } : undefined,
		// nodemailer waits minutes by default; an unreachable server should fail (and be logged) fast.
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000
	});
	return transporter;
}

const plainText = (html: string) =>
	html
		.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
		.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();

/**
 * Sends one email and records it in `email_log`. Never throws: a mail server being down must not
 * fail the sign-up, payment or approval that triggered the email. The outcome is in the log.
 */
export async function sendEmail(email: OutgoingEmail): Promise<'SENT' | 'FAILED' | 'SKIPPED'> {
	const mailer = transport();
	let status: 'SENT' | 'FAILED' | 'SKIPPED' = 'SKIPPED';
	let error: string | null = null;

	if (mailer) {
		try {
			await mailer.sendMail({
				from: env.MAIL_FROM || smtpUser(),
				to: email.to,
				subject: email.subject,
				html: email.html,
				text: plainText(email.html)
			});
			status = 'SENT';
		} catch (cause) {
			status = 'FAILED';
			error = (cause instanceof Error ? cause.message : String(cause)).slice(0, 500);
			console.error(`Email "${email.kind}" to ${email.to} failed:`, cause);
		}
	} else {
		console.info(`[email skipped: no SMTP_HOST] ${email.kind} → ${email.to}: ${email.subject}`);
	}

	try {
		await db.insert(emailLog).values({ ...email, status, error });
	} catch (cause) {
		console.error('Could not record an email in email_log:', cause);
	}
	return status;
}
