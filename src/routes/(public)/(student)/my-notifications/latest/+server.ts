import { error, json } from '@sveltejs/kit';
import { latestNotifications } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

/** The header bell's dropdown, fetched when it opens. */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Sign in to see your notifications.');
	return json({ items: await latestNotifications(locals.user.id, 6) }, { headers: { 'cache-control': 'no-store' } });
};
