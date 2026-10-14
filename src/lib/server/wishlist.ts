import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { course, wishlistItem } from '$lib/server/db/schema';

/*
 * The signed-in student's saved courses. Signed out, the wishlist lives in the browser
 * (`$lib/wishlist.svelte.ts`); on sign-in that list is merged in here once, and from then on these
 * rows are the source of truth. The user id always comes from the session.
 */

/** Saved course ids, newest first, as strings (the catalog's id type). */
export async function wishlistCourseIds(userId: string): Promise<string[]> {
	const rows = await db
		.select({ courseId: wishlistItem.courseId })
		.from(wishlistItem)
		.where(eq(wishlistItem.userId, userId))
		.orderBy(desc(wishlistItem.createdAt), desc(wishlistItem.courseId));
	return rows.map((row) => String(row.courseId));
}

/** Course ids from the browser: positive integers only, at most `max` of them. */
export function parseCourseIds(value: unknown, max = 200): number[] {
	if (!Array.isArray(value)) return [];
	const ids = value
		.map((item) => (typeof item === 'string' || typeof item === 'number' ? Number(item) : NaN))
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	return [...new Set(ids)].slice(0, max);
}

/** Saves courses; ones already saved or no longer published are skipped. */
export async function addToWishlist(userId: string, courseIds: number[]): Promise<void> {
	if (courseIds.length === 0) return;
	const published = await db
		.select({ id: course.id })
		.from(course)
		.where(and(inArray(course.id, courseIds), eq(course.status, true)));
	if (published.length === 0) return;
	await db
		.insert(wishlistItem)
		.values(published.map((row) => ({ userId, courseId: row.id })))
		.onDuplicateKeyUpdate({ set: { userId } });
}

export async function removeFromWishlist(userId: string, courseIds: number[]): Promise<void> {
	if (courseIds.length === 0) return;
	await db
		.delete(wishlistItem)
		.where(and(eq(wishlistItem.userId, userId), inArray(wishlistItem.courseId, courseIds)));
}
