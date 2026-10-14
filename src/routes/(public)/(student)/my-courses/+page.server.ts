import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { desc, eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { category, course, enrollment } from '$lib/server/db/schema';
import { progressByCourse } from '$lib/server/enrollment';
import { describeWait, requestedEmailAllowed } from '$lib/server/email';
import { reviewedCourseIds } from '$lib/server/reviews';
import { requireActionUser, requireUser } from '$lib/server/student';
import { RATE_PROMPT_PERCENT } from '$lib/components/reviews/rules';
import { mediaUrl } from '$lib/media';
import type { Actions, PageServerLoad } from './$types';

const STATUS_TABS = ['ALL', 'IN_PROGRESS', 'COMPLETED'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const status = (STATUS_TABS as readonly string[]).includes(event.url.searchParams.get('status') ?? '')
		? (event.url.searchParams.get('status') as StatusTab)
		: 'ALL';
	const search = (event.url.searchParams.get('search') ?? '').trim();

	// A student has a handful of enrollments, so all are read and filtered here.
	const rows = await db
		.select({
			id: enrollment.id,
			status: enrollment.status,
			completedAt: enrollment.completedAt,
			rejectionReason: enrollment.rejectionReason,
			courseId: course.id,
			slug: course.slug,
			title: course.name,
			thumbnail: course.thumbnail,
			categoryName: category.name,
			categorySlug: category.slug
		})
		.from(enrollment)
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.leftJoin(category, eq(category.id, course.categoryId))
		.where(eq(enrollment.userId, user.id))
		.orderBy(desc(enrollment.updatedAt));

	const [progress, reviewed] = await Promise.all([
		progressByCourse(
			user.id,
			rows.map((row) => row.courseId)
		),
		reviewedCourseIds(user.id)
	]);

	const items = rows
		.map((row) => {
			const courseProgress = progress.get(row.courseId);
			const progressPercent = row.completedAt ? 100 : (courseProgress?.percent ?? 0);
			return {
				id: row.id,
				slug: row.slug,
				title: row.title,
				thumbnailUrl: mediaUrl(row.thumbnail),
				categoryName: row.categoryName ?? 'Course',
				categorySlug: row.categorySlug ?? undefined,
				status: row.status,
				completed: row.status === 'ACTIVE' && row.completedAt !== null,
				rejectionReason: row.rejectionReason,
				progressPercent,
				// Far enough in to have an opinion, and not asked twice.
				askToRate:
					row.status === 'ACTIVE' &&
					(row.completedAt !== null || progressPercent >= RATE_PROMPT_PERCENT) &&
					!reviewed.has(row.courseId),
				completedLessons: courseProgress?.requiredDone ?? 0,
				totalLessons: courseProgress?.required ?? 0
			};
		})
		.filter(
			(item) =>
				(status === 'ALL' ||
					(status === 'COMPLETED' && item.completed) ||
					(status === 'IN_PROGRESS' && item.status === 'ACTIVE' && !item.completed)) &&
				(!search || item.title.toLowerCase().includes(search.toLowerCase()))
		);

	return {
		items,
		status,
		search,
		total: rows.length,
		// Unverified accounts are asked, not required, to confirm their address.
		emailVerification: user.emailVerified
			? event.url.searchParams.has('verified')
				? ('confirmed' as const)
				: null
			: { email: user.email }
	};
};

export const actions: Actions = {
	resendVerification: async (event) => {
		const user = requireActionUser(event);
		if (user.emailVerified) return { resent: true };

		const limit = await requestedEmailAllowed(user.email, 'verify-email');
		if (!limit.allowed) {
			return fail(429, { resendError: `We just sent one. You can ask again in ${describeWait(limit.retryAfter)}.` });
		}
		try {
			await auth.api.sendVerificationEmail({ body: { email: user.email }, headers: event.request.headers });
		} catch (err) {
			if (!(err instanceof APIError)) throw err;
			return fail(400, { resendError: 'Could not send the email. Try again later.' });
		}
		return { resent: true };
	}
};
