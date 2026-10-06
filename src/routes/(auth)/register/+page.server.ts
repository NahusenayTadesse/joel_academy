import { redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { fail, message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth, googleEnabled } from '$lib/server/auth';
import { phoneUnavailable, requestPhoneCode } from '$lib/server/phone-verification';
import { normalizeEthPhone } from '$lib/phone';
import { afterSignIn, safeRedirectPath } from '$lib/safe-redirect';
import { ROUTES } from '$lib/site';
import { registerSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, afterSignIn(url, locals.isSuperAdmin || locals.permList.includes('dashboard.view')));
	return { form: await superValidate(zod4(registerSchema)), googleEnabled };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, url } = event;
		const form = await superValidate(request, zod4(registerSchema));
		const password = form.data.password;
		form.data.password = '';
		form.data.confirmPassword = '';
		if (!form.valid) return fail(400, { form });

		const phone = normalizeEthPhone(form.data.phone);
		if (phone) {
			const unavailable = await phoneUnavailable(phone, null);
			if (unavailable) return setError(form, 'phone', unavailable);
		}

		let userId: string;
		try {
			// Signs the new student in as well: better-auth's autoSignIn, with the cookie set by the
			// sveltekitCookies plugin. Every new account is a student; staff roles are granted elsewhere.
			const created = await auth.api.signUpEmail({
				body: { name: `${form.data.firstName} ${form.data.lastName}`, email: form.data.email, password },
				headers: request.headers
			});
			userId = created.user.id;
		} catch (err) {
			if (err instanceof APIError) {
				if (String(err.body?.code ?? '').startsWith('USER_ALREADY_EXISTS')) {
					return setError(form, 'email', 'An account with this email already exists. Sign in instead.');
				}
				return message(form, { type: 'error', text: err.body?.message ?? 'Could not create your account.' }, { status: 400 });
			}
			throw err;
		}

		if (!phone) redirect(303, afterSignIn(url, false));

		// The account exists either way; the number is added once its texted code is entered.
		const sent = await requestPhoneCode(event, userId, phone);
		const next = new URLSearchParams();
		const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'), url.origin);
		if (redirectTo) next.set('redirectTo', redirectTo);
		if (!sent.ok) {
			// Not the reason itself: the page shows its own words, so a link can't put text on it.
			next.set('phone', phone);
			next.set('code', 'unsent');
		}
		redirect(303, `${ROUTES.student.account}?${next}`);
	}
};
