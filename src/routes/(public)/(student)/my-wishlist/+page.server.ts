import { fail } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { enrollment } from '$lib/server/db/schema';
import { listCourses } from '$lib/server/public-catalog';
import { requireActionUser, requireUser } from '$lib/server/student';
import { parseCourseIds, removeFromWishlist, wishlistCourseIds } from '$lib/server/wishlist';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	event.depends('app:wishlist');

	const [ids, catalog] = await Promise.all([wishlistCourseIds(user.id), listCourses({ pageSize: 10_000 })]);
	const byId = new Map(catalog.items.map((item) => [item.id, item]));
	// Courses unpublished since they were saved drop out of the list (and come back if republished).
	const courses = ids.flatMap((id) => byId.get(id) ?? []);

	const statuses = courses.length
		? await db
				.select({ courseId: enrollment.courseId, status: enrollment.status })
				.from(enrollment)
				.where(
					and(
						eq(enrollment.userId, user.id),
						inArray(
							enrollment.courseId,
							courses.map((item) => Number(item.id))
						)
					)
				)
		: [];
	const statusByCourse = new Map(statuses.map((row) => [String(row.courseId), row.status]));

	return {
		items: courses.map((item) => ({ course: item, enrollmentStatus: statusByCourse.get(item.id) ?? null }))
	};
};

export const actions: Actions = {
	remove: async (event) => {
		const user = requireActionUser(event);
		const [courseId] = parseCourseIds([(await event.request.formData()).get('courseId')]);
		if (!courseId) return fail(400, { error: 'Unknown course.' });
		await removeFromWishlist(user.id, [courseId]);
		return { removed: courseId };
	}
};
