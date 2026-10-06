import { redirect, type RequestEvent } from '@sveltejs/kit';
import { signInHref } from '$lib/safe-redirect';

/** The signed-in user for a student-area load; anyone else is sent to sign in and brought back. */
export function requireUser({ locals, url }: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!locals.user) redirect(303, signInHref(url));
	return locals.user;
}

/**
 * The same for a form action, which SvelteKit runs without the layout's guard. The way back is the
 * page itself, not the `?/action` URL that was posted to.
 */
export function requireActionUser({ locals, url }: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!locals.user) redirect(303, signInHref({ pathname: url.pathname, search: '' }));
	return locals.user;
}
