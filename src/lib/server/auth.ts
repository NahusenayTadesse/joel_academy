import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { phoneNumber } from 'better-auth/plugins/phone-number';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { passwordChangedEmail, passwordResetEmail, siteUrl, verifyEmailEmail, welcomeEmail } from '$lib/server/email';
import { OTP_MINUTES, otpSms, sendSms } from '$lib/server/sms';
import { isNormalizedEthPhone } from '$lib/phone';
import { ROUTES } from '$lib/site';

/** Google sign-in is offered only once both OAuth credentials are set. */
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** The verification text could not go out (GeezSMS failed, or a limit refused it). */
export class SmsCodeNotSent extends Error {
	constructor(readonly retryAfter?: number) {
		super('The verification code could not be sent');
		this.name = 'SmsCodeNotSent';
	}
}

/*
 * Emails are started, not awaited: `sendEmail` never rejects, and awaiting a slow mail server
 * would make "this address has an account" measurably slower than "it does not".
 */
export const auth = betterAuth({
	baseURL: env.ORIGIN,
	/*
	 * A phone number is only added to, and verified on, an account that is already signed in — from
	 * the account page's own form actions, which call `auth.api` directly. None of the phone plugin's
	 * HTTP routes is needed, and two would sign people in by phone, so all are switched off.
	 */
	disabledPaths: [
		'/sign-in/phone-number',
		'/phone-number/send-otp',
		'/phone-number/verify',
		'/phone-number/request-password-reset',
		'/phone-number/reset-password'
	],
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	// Anyone may register as a student. Dashboard access comes only from a `staff_role` row.
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		// Verification is encouraged, not required: without SMTP nobody could ever sign in.
		requireEmailVerification: false,
		resetPasswordTokenExpiresIn: 60 * 60,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user: to, token }) => {
			void passwordResetEmail(to, siteUrl(`${ROUTES.auth.resetPassword}?token=${encodeURIComponent(token)}`));
		},
		// Following the emailed link proves the address is theirs, as a verification link would.
		onPasswordReset: async ({ user: reset }) => {
			if (!reset.emailVerified) {
				await db.update(user).set({ emailVerified: true }).where(eq(user.id, reset.id));
			}
			// A security notice: if someone else reset it, the owner hears about it on every channel.
			void passwordChangedEmail(reset);
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 60 * 60 * 24,
		sendVerificationEmail: async ({ user: to, token }) => {
			void verifyEmailEmail(to, siteUrl(`${ROUTES.auth.verifyEmail}?token=${encodeURIComponent(token)}`));
		}
	},
	socialProviders: googleEnabled
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
					prompt: 'select_account'
				}
			}
		: undefined,
	account: {
		/*
		 * Signing in with Google for an address that already has a password account adds Google to
		 * that account instead of failing. better-auth only links when the existing account's email
		 * is verified, so nobody can pre-register someone else's address and wait for them.
		 */
		accountLinking: { enabled: true, trustedProviders: ['google'] }
	},
	// OAuth failures (a cancelled consent screen, an expired state) land back on the sign-in page.
	onAPIError: { errorURL: siteUrl('/login') },
	databaseHooks: {
		user: {
			create: {
				// A number arrives only through verification, never with a sign-up body, so nobody can
				// claim someone else's number (the column is unique) without the code sent to it.
				before: async (data) => ({ data: { ...data, phoneNumber: null, phoneNumberVerified: false } }),
				// Runs after the sign-up commits, for password and Google accounts alike.
				after: async (created) => {
					void welcomeEmail(created);
				}
			}
		}
	},
	plugins: [
		phoneNumber({
			otpLength: 6,
			expiresIn: OTP_MINUTES * 60,
			allowedAttempts: 3,
			// Callers normalise first; only the stored 2519…/2517… form gets a code.
			phoneNumberValidator: (phone) => isNormalizedEthPhone(phone),
			sendOTP: async ({ phoneNumber: to, code }) => {
				const result = await sendSms({ to, kind: 'otp', message: otpSms(code) });
				// SKIPPED without SMS_KEY still counts as sent (the code is in the SMS log); a refusal does not.
				if (result.status === 'FAILED' || result.retryAfter) throw new SmsCodeNotSent(result.retryAfter);
			}
		}),
		sveltekitCookies(getRequestEvent)
	]
});
