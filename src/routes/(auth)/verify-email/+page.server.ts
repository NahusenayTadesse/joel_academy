import { redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { staffRole, user } from '$lib/server/db/schema';
import { verifySchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

/*
 * The emailed link opens this form rather than verifying on sight: mail scanners follow links,
 * and verifying signs the visitor in (autoSignInAfterVerification), which only the person
 * clicking should get.
 */
export const load: PageServerLoad = async ({ url }) => {
	const form = await superValidate({ token: url.searchParams.get('token') ?? '' }, zod4(verifySchema), {
		errors: false
	});
	return { form };
};

/** The address a confirmation token was issued for. Only read after better-auth has checked it. */
function tokenEmail(token: string): string | null {
	try {
		const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
		return typeof payload.email === 'string' ? payload.email : null;
	} catch {
		return null;
	}
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(verifySchema));
		if (!form.valid) return fail(400, { form });

		try {
			await auth.api.verifyEmail({ query: { token: form.data.token }, headers: request.headers });
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			return message(
				form,
				{ type: 'error', text: 'Verification token is invalid or expired. Sign in and send a new link from My Courses.' },
				{ status: 400 }
			);
		}

		// Now signed in as that account: staff go to the dashboard, students to their courses.
		const email = tokenEmail(form.data.token);
		const [staff] = email
			? await db
					.select({ role: staffRole.role })
					.from(staffRole)
					.innerJoin(user, eq(user.id, staffRole.userId))
					.where(eq(user.email, email))
			: [];
		redirect(303, staff ? '/dashboard' : '/my-courses?verified=1');
	}
};
