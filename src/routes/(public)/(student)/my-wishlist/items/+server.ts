import { error, json } from '@sveltejs/kit';
import { addToWishlist, parseCourseIds, removeFromWishlist, wishlistCourseIds } from '$lib/server/wishlist';
import { m } from '$lib/paraglide/messages';
import type { RequestHandler } from './$types';

/*
 * The hearts' backend for a signed-in student: `{ add?: id[], remove?: id[] }` in, the saved ids
 * out. Only JSON from this site is accepted. SvelteKit's own CSRF check covers form posts only, and
 * a JSON post from another site would need a CORS preflight we never answer, but the origin is
 * checked here as well so nothing rests on that alone.
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) error(401, m.learn_wishlist_sign_in());
	if (request.headers.get('origin') !== url.origin) error(403, 'Cross-site request refused.');
	if (!request.headers.get('content-type')?.startsWith('application/json')) error(415, 'Send JSON.');

	let body: { add?: unknown; remove?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON.');
	}
	const userId = locals.user.id;
	await addToWishlist(userId, parseCourseIds(body?.add));
	await removeFromWishlist(userId, parseCourseIds(body?.remove));
	return json({ ids: await wishlistCourseIds(userId) }, { headers: { 'cache-control': 'no-store' } });
};
