import { redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth, googleEnabled } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { staffRole } from '$lib/server/db/schema';
import { afterSignIn } from '$lib/safe-redirect';
import { clientAddress, forgive, hit, waitText } from '$lib/server/spam';
import { loginNotice } from './notice';
import { loginSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, afterSignIn(url, locals.isSuperAdmin || locals.permList.includes('dashboard.view')));
	return {
		form: await superValidate(zod4(loginSchema)),
		googleEnabled,
		notice: loginNotice(url.searchParams)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { request, url } = event;
		const form = await superValidate(request, zod4(loginSchema));
		// The password never goes back to the browser, whatever happens.
		const password = form.data.password;
		form.data.password = '';
		if (!form.valid) return fail(400, { form });

		// Password guessing: a cap per connection and per account. Server-side calls skip
		// better-auth's own HTTP rate limiter, so this is the limit that applies here.
		const email = form.data.email.trim().toLowerCase();
		const wait = Math.max(hit('signInAddress', clientAddress(event)), hit('signInEmail', email));
		if (wait) {
			return message(
				form,
				{ type: 'error', text: `Too many sign-in attempts. Try again in ${waitText(wait)}, or reset your password.` },
				{ status: 429 }
			);
		}

		let userId: string;
		try {
			// The sveltekitCookies plugin sets the session cookie on this response.
			const result = await auth.api.signInEmail({
				body: { email: form.data.email, password, rememberMe: form.data.rememberMe },
				headers: request.headers
			});
			userId = result.user.id;
			forgive('signInEmail', email);
		} catch (err) {
			if (err instanceof APIError) {
				return message(form, { type: 'error', text: 'Wrong email or password.' }, { status: 400 });
			}
			throw err;
		}

		// The hook ran before sign-in, so staff standing is read here rather than from locals.
		const [staff] = await db.select({ role: staffRole.role }).from(staffRole).where(eq(staffRole.userId, userId));
		redirect(303, afterSignIn(url, Boolean(staff)));
	}
};
