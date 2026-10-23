import { redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import { m } from '$lib/paraglide/messages';
import { ROUTES } from '$lib/site';
import { resetSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// The emailed link carries the token; it is shown in the form so a mangled link can be fixed by hand.
	const form = await superValidate({ token: url.searchParams.get('token') ?? '' }, zod4(resetSchema), {
		errors: false
	});
	return { form };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(resetSchema));
		const password = form.data.password;
		form.data.password = '';
		form.data.confirmPassword = '';
		if (!form.valid) return fail(400, { form });

		try {
			// Consumes the token, and signs every existing session out (revokeSessionsOnPasswordReset).
			await auth.api.resetPassword({ body: { token: form.data.token, newPassword: password }, headers: request.headers });
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			return message(
				form,
				{ type: 'error', text: m.account_reset_expired(), expired: true },
				{ status: 400 }
			);
		}
		redirect(303, `${ROUTES.auth.login}?reset=1`);
	}
};
