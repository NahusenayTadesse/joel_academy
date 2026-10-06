import { redirect } from '@sveltejs/kit';
import { loadFlash } from 'sveltekit-flash-message/server';

/**
 * `kitHandle` already refuses signed-out requests under /dashboard; this is the page-view side of
 * the same rule. `loadFlash` carries the kit's flash messages (a lookup row deleted) to the page.
 */
export const load = loadFlash(({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	return { permList: locals.permList, isSuperAdmin: locals.isSuperAdmin, user: locals.user };
});
