import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { ROUTES } from '$lib/site';
import type { Actions, PageServerLoad } from './$types';

/** Nothing to show: signing out is a POST from the dashboard's header. */
export const load: PageServerLoad = () => redirect(303, '/dashboard');

export const actions: Actions = {
	default: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		// The sign-in page in the language the visitor was browsing (the forms post to a localized /logout).
		redirect(303, ROUTES.auth.login);
	}
};
