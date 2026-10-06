import { redirect } from '@sveltejs/kit';
import { signInHref } from '$lib/safe-redirect';
import type { LayoutServerLoad } from './$types';

/*
 * The student area: signed in, staff or not. This guards page loads only — SvelteKit runs form
 * actions without layout loads, so every action checks the session again itself.
 */
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) redirect(303, signInHref(url));
	return {};
};
