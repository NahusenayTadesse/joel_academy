import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { category, certificate, course, enrollment, lesson, lessonProgress } from '$lib/server/db/schema';
import { progressByCourse } from '$lib/server/enrollment';
import { latestNotifications } from '$lib/server/notifications';
import { requireUser } from '$lib/server/student';
import { mediaUrl } from '$lib/media';
import type { PageServerLoad } from './$types';

const time = (date: Date | null) => date?.getTime() ?? 0;

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	event.depends('app:notifications');

	const [rows, certificateRows, [issued], [learned], notifications] = await Promise.all([
		// A student has a handful of enrollments, so all are read and sorted here.
		db
			.select({
				id: enrollment.id,
				status: enrollment.status,
				completedAt: enrollment.completedAt,
				rejectionReason: enrollment.rejectionReason,
				lastActivityAt: enrollment.lastActivityAt,
				createdAt: enrollment.createdAt,
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
			.where(eq(enrollment.userId, user.id)),
		db
			.select({
				id: certificate.id,
				code: certificate.code,
				courseTitle: certificate.courseTitle,
				issuedAt: certificate.issuedAt,
				revokedAt: certificate.revokedAt
			})
			.from(certificate)
			.where(eq(certificate.userId, user.id))
			.orderBy(desc(certificate.issuedAt))
			.limit(3),
		db
			.select({ total: count() })
			.from(certificate)
			.where(and(eq(certificate.userId, user.id), isNull(certificate.revokedAt))),
		db
			.select({
				lessons: count(),
				seconds: sql<string>`coalesce(sum(${lesson.durationSeconds}), 0)`
			})
			.from(lessonProgress)
			.innerJoin(lesson, eq(lesson.id, lessonProgress.lessonId))
			.where(eq(lessonProgress.userId, user.id)),
		latestNotifications(user.id, 5)
	]);

	const active = rows.filter((row) => row.status === 'ACTIVE');
	const progress = await progressByCourse(
		user.id,
		active.map((row) => row.courseId)
	);

	const courses = active
		// Most recently studied first; never-opened courses by when they were joined.
		.sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt) || time(b.createdAt) - time(a.createdAt))
		.map((row) => {
			const current = progress.get(row.courseId);
			return {
				id: row.id,
				slug: row.slug,
				title: row.title,
				thumbnailUrl: mediaUrl(row.thumbnail),
				categoryName: row.categoryName ?? 'Course',
				categorySlug: row.categorySlug ?? undefined,
				completed: row.completedAt !== null,
				progressPercent: row.completedAt ? 100 : (current?.percent ?? 0),
				completedLessons: current?.requiredDone ?? 0,
				totalLessons: current?.required ?? 0
			};
		});
	const inProgress = courses.filter((item) => !item.completed);

	const payments = rows
		.filter((row) => row.status !== 'ACTIVE')
		.sort((a, b) => time(b.createdAt) - time(a.createdAt))
		.map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			status: row.status as 'PENDING' | 'REJECTED',
			rejectionReason: row.rejectionReason
		}));

	return {
		firstName: user.name.trim().split(/\s+/)[0] || user.name,
		continueLearning: inProgress.slice(0, 3),
		stats: {
			enrolled: courses.length,
			inProgress: inProgress.length,
			completed: courses.length - inProgress.length,
			certificates: Number(issued?.total ?? 0),
			lessonsDone: Number(learned?.lessons ?? 0),
			secondsLearned: Number(learned?.seconds ?? 0)
		},
		pendingPayments: payments.filter((item) => item.status === 'PENDING'),
		rejectedPayments: payments.filter((item) => item.status === 'REJECTED'),
		recentCertificates: certificateRows.map((row) => ({
			id: row.id,
			code: row.code,
			courseTitle: row.courseTitle,
			issuedAt: row.issuedAt.toISOString(),
			revoked: row.revokedAt !== null
		})),
		notifications
	};
};
