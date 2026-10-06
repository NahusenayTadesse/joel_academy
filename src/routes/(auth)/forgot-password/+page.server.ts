import { APIError } from 'better-auth/api';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import { requestedEmailAllowed } from '$lib/server/email';
import { forgotSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

/* The same answer whether or not an account uses the address, so the form cannot be used to find out. */
const SENT = "If an account uses that email, we've sent it a link to reset your password. The link expires in one hour.";

export const load: PageServerLoad = async () => ({ form: await superValidate(zod4(forgotSchema)) });

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(forgotSchema));
		if (!form.valid) return fail(400, { form });
		const email = form.data.email.trim().toLowerCase();

		// A repeat within the limit gets the same answer and no email: the last link still works.
		const limit = await requestedEmailAllowed(email, 'password-reset');
		if (limit.allowed) {
			try {
				await auth.api.requestPasswordReset({ body: { email }, headers: request.headers });
			} catch (err) {
				if (!(err instanceof APIError)) throw err;
				console.error('Password reset request failed:', err.body?.message ?? err.message);
				return message(form, { type: 'error', text: 'Something went wrong. Try again in a moment.' }, { status: 500 });
			}
		}
		return message(form, { type: 'success', text: SENT });
	}
};
