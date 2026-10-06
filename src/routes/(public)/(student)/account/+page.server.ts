import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { account, user } from '$lib/server/db/schema';
import { passwordChangedEmail } from '$lib/server/email';
import {
	clearPendingPhone,
	confirmPhoneCode,
	pendingPhone,
	removePhone,
	requestPhoneCode
} from '$lib/server/phone-verification';
import { requireActionUser, requireUser } from '$lib/server/student';
import { normalizeEthPhone } from '$lib/phone';
import { safeRedirectPath } from '$lib/safe-redirect';
import { strongPassword } from '../../../(auth)/register/schema';
import type { Actions, PageServerLoad } from './$types';

async function accountFacts(userId: string) {
	const [[row], credentials] = await Promise.all([
		db
			.select({
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				phoneNumber: user.phoneNumber,
				phoneNumberVerified: user.phoneNumberVerified
			})
			.from(user)
			.where(eq(user.id, userId)),
		db
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
			.limit(1)
	]);
	return { ...row, hasPassword: credentials.length > 0 };
}

export const load: PageServerLoad = async (event) => {
	const current = requireUser(event);
	const facts = await accountFacts(current.id);
	const { searchParams } = event.url;
	return {
		account: {
			name: facts.name,
			email: facts.email,
			emailVerified: facts.emailVerified,
			// Only a verified number is shown as the account's; there is no other kind stored.
			phone: facts.phoneNumberVerified ? facts.phoneNumber : null,
			hasPassword: facts.hasPassword
		},
		pendingPhone: pendingPhone(event.cookies, current.id),
		// Straight from sign-up: the number they typed, and whether its code could not be sent.
		suggestedPhone: normalizeEthPhone(searchParams.get('phone')),
		codeUnsent: searchParams.get('code') === 'unsent',
		continueTo: safeRedirectPath(searchParams.get('redirectTo'), event.url.origin)
	};
};

const nameSchema = z.string().trim().min(2, 'Enter your name').max(120, 'Use at most 120 characters');

const passwordSchema = z
	.object({
		currentPassword: z.string().max(128).optional(),
		newPassword: strongPassword,
		confirmPassword: z.string()
	})
	.refine((value) => value.newPassword === value.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Passwords do not match'
	});

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	profile: async (event) => {
		requireActionUser(event);
		const data = await event.request.formData();
		const name = nameSchema.safeParse(field(data, 'name'));
		if (!name.success) return fail(400, { profile: { error: name.error.issues[0].message } });
		await auth.api.updateUser({ body: { name: name.data }, headers: event.request.headers });
		return { profile: { saved: true } };
	},

	sendCode: async (event) => {
		const current = requireActionUser(event);
		const data = await event.request.formData();
		const phone = field(data, 'phone');
		const outcome = await requestPhoneCode(event, current.id, phone);
		if (!outcome.ok) return fail(400, { sendCode: { error: outcome.error, phone } });
		return { sendCode: { sent: outcome.phone } };
	},

	verifyCode: async (event) => {
		const current = requireActionUser(event);
		const data = await event.request.formData();
		const outcome = await confirmPhoneCode(event, current.id, field(data, 'code').replace(/\s/g, ''));
		if (!outcome.ok) return fail(400, { verifyCode: { error: outcome.error } });
		return { verifyCode: { verified: outcome.phone } };
	},

	cancelCode: async (event) => {
		requireActionUser(event);
		clearPendingPhone(event.cookies);
		return { cancelCode: { done: true } };
	},

	removePhone: async (event) => {
		const current = requireActionUser(event);
		await removePhone(current.id);
		return { removePhone: { done: true } };
	},

	password: async (event) => {
		const current = requireActionUser(event);
		const data = await event.request.formData();
		const parsed = passwordSchema.safeParse({
			currentPassword: field(data, 'currentPassword') || undefined,
			newPassword: field(data, 'newPassword'),
			confirmPassword: field(data, 'confirmPassword')
		});
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return fail(400, { password: { error: issue.message, field: String(issue.path[0] ?? '') } });
		}

		const { hasPassword } = await accountFacts(current.id);
		try {
			if (hasPassword) {
				if (!parsed.data.currentPassword) {
					return fail(400, { password: { error: 'Enter your current password', field: 'currentPassword' } });
				}
				// Other devices are signed out; this one gets a fresh session cookie.
				await auth.api.changePassword({
					body: {
						currentPassword: parsed.data.currentPassword,
						newPassword: parsed.data.newPassword,
						revokeOtherSessions: true
					},
					headers: event.request.headers
				});
			} else {
				// A Google-only account: adding a password lets them sign in with their email too.
				await auth.api.setPassword({ body: { newPassword: parsed.data.newPassword }, headers: event.request.headers });
			}
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			if (err.body?.code === 'INVALID_PASSWORD') {
				return fail(400, { password: { error: 'Your current password is not right', field: 'currentPassword' } });
			}
			return fail(400, { password: { error: err.body?.message ?? 'Could not change your password.', field: '' } });
		}
		void passwordChangedEmail({ email: current.email, name: current.name });
		return { password: { saved: hasPassword ? ('changed' as const) : ('set' as const) } };
	}
};
