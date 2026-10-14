import { and, count, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notification, user } from '$lib/server/db/schema';

/*
 * In-app notifications: the header bell and the notifications page. They sit beside the email and
 * text for the same event (see `$lib/server/email/notify.ts`) and, like those, never fail the
 * request that caused them. Every read and write here is scoped to one user id from the session.
 */

export type NotificationRow = typeof notification.$inferSelect;

export interface NotificationItem {
	id: number;
	kind: string;
	title: string;
	body: string | null;
	link: string | null;
	read: boolean;
	createdAt: string;
}

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** Only a path inside the site is stored: the link is followed after a click. */
const localPath = (link: string | null | undefined) =>
	link && link.length <= 500 && link.startsWith('/') && !link.startsWith('//') && !link.includes('\\') ? link : null;

/**
 * Adds a notification for one account, found by id or (as `textUser` does) by email. Resolves
 * whether or not it was stored — an unknown address or a database fault is logged, never thrown.
 */
export async function createNotification(input: {
	userId?: string;
	email?: string;
	kind: string;
	title: string;
	body?: string | null;
	link?: string | null;
}): Promise<void> {
	try {
		let userId = input.userId;
		if (!userId && input.email) {
			const [found] = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email)).limit(1);
			userId = found?.id;
		}
		if (!userId) return;
		await db.insert(notification).values({
			userId,
			kind: clip(input.kind, 60),
			title: clip(input.title, 200),
			body: input.body ? clip(input.body, 500) : null,
			link: localPath(input.link)
		});
	} catch (cause) {
		console.error(`Could not store the in-app notification "${input.kind}":`, cause);
	}
}

const toItem = (row: NotificationRow): NotificationItem => ({
	id: row.id,
	kind: row.kind,
	title: row.title,
	body: row.body,
	link: row.link,
	read: row.readAt !== null,
	createdAt: row.createdAt.toISOString()
});

/** For the header badge on every public page: one indexed count. */
export async function unreadNotificationCount(userId: string): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(notification)
		.where(and(eq(notification.userId, userId), isNull(notification.readAt)));
	return Number(row?.total ?? 0);
}

/** The newest few, for the bell's dropdown and the student home. */
export async function latestNotifications(userId: string, limit = 6): Promise<NotificationItem[]> {
	const rows = await db
		.select()
		.from(notification)
		.where(eq(notification.userId, userId))
		.orderBy(desc(notification.createdAt), desc(notification.id))
		.limit(limit);
	return rows.map(toItem);
}

export type ReadFilter = 'ALL' | 'UNREAD' | 'READ';

/** The notifications page: newest first, filtered by read state and an optional search. */
export async function listNotifications(
	userId: string,
	options: { read: ReadFilter; search?: string; limit: number }
): Promise<{ items: NotificationItem[]; hasMore: boolean }> {
	const needle = options.search?.trim();
	const pattern = needle ? `%${needle.replace(/[\\%_]/g, (char) => `\\${char}`)}%` : null;
	const rows = await db
		.select()
		.from(notification)
		.where(
			and(
				eq(notification.userId, userId),
				options.read === 'UNREAD' ? isNull(notification.readAt) : undefined,
				options.read === 'READ' ? isNotNull(notification.readAt) : undefined,
				pattern ? or(like(notification.title, pattern), like(notification.body, pattern)) : undefined
			)
		)
		.orderBy(desc(notification.createdAt), desc(notification.id))
		.limit(options.limit + 1);
	return { items: rows.slice(0, options.limit).map(toItem), hasMore: rows.length > options.limit };
}

/** Marks one of the user's own notifications read; returns it (for its link) or null. */
export async function markNotificationRead(userId: string, id: number): Promise<NotificationRow | null> {
	const [row] = await db
		.select()
		.from(notification)
		.where(and(eq(notification.id, id), eq(notification.userId, userId)))
		.limit(1);
	if (!row) return null;
	if (!row.readAt) {
		await db
			.update(notification)
			.set({ readAt: new Date() })
			.where(and(eq(notification.id, id), eq(notification.userId, userId)));
	}
	return row;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
	await db
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}
