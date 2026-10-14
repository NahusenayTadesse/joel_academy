import { fail, redirect } from '@sveltejs/kit';
import { safeRedirectPath } from '$lib/safe-redirect';
import {
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	type ReadFilter
} from '$lib/server/notifications';
import { requireActionUser, requireUser } from '$lib/server/student';
import { ROUTES } from '$lib/site';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 30;
const FILTERS: ReadFilter[] = ['ALL', 'UNREAD', 'READ'];

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	event.depends('app:notifications');
	const params = event.url.searchParams;
	const read = FILTERS.find((value) => value === params.get('read')) ?? 'ALL';
	const search = (params.get('search') ?? '').trim().slice(0, 100);
	const shown = Math.min(Math.max(Number(params.get('shown')) || PAGE_SIZE, PAGE_SIZE), 300);

	const { items, hasMore } = await listNotifications(user.id, { read, search, limit: shown });
	return { items, hasMore, shown, pageSize: PAGE_SIZE, filters: { read, search } };
};

export const actions: Actions = {
	/** Opening a notification marks it read and follows its link (or comes back here). */
	open: async (event) => {
		const user = requireActionUser(event);
		const id = Number((await event.request.formData()).get('id'));
		if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { error: 'Unknown notification.' });
		const row = await markNotificationRead(user.id, id);
		if (!row) return fail(404, { error: 'That notification no longer exists.' });
		redirect(303, safeRedirectPath(row.link, event.url.origin) ?? ROUTES.student.notifications);
	},
	readAll: async (event) => {
		const user = requireActionUser(event);
		await markAllNotificationsRead(user.id);
		return { readAll: true };
	}
};
