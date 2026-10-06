import { count, eq, isNull, notInArray, sql } from 'drizzle-orm';
import { hasPermission } from '@nahu/admin-kit/server/permissions';
import { db } from '$lib/server/db';
import {
	certificate,
	contactMessage,
	course,
	enrollment,
	newsletterSubscriber,
	staffRole,
	user
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const total = async (query: Promise<{ value: number }[]>) => (await query)[0]?.value ?? 0;

export const load: PageServerLoad = async ({ locals }) => {
	const [courses, published] = await Promise.all([
		total(db.select({ value: count() }).from(course)),
		total(db.select({ value: count() }).from(course).where(eq(course.status, true)))
	]);

	// Students, money and messages are `academy.manage` business; editors see the catalog only.
	if (!hasPermission(locals, 'academy.manage')) {
		return { courses, published, academy: null };
	}

	const [students, active, pending, newMessages, certificates, subscribers] = await Promise.all([
		// Every account that is not staff.
		total(
			db
				.select({ value: count() })
				.from(user)
				.where(notInArray(user.id, db.select({ id: staffRole.userId }).from(staffRole)))
		),
		total(
			db
				.select({ value: sql<number>`count(distinct ${enrollment.userId})` })
				.from(enrollment)
				.where(eq(enrollment.status, 'ACTIVE'))
		),
		total(db.select({ value: count() }).from(enrollment).where(eq(enrollment.status, 'PENDING'))),
		total(
			db.select({ value: count() }).from(contactMessage).where(eq(contactMessage.status, 'NEW'))
		),
		total(db.select({ value: count() }).from(certificate).where(isNull(certificate.revokedAt))),
		total(db.select({ value: count() }).from(newsletterSubscriber))
	]);

	return {
		courses,
		published,
		academy: {
			students,
			active: Number(active),
			pending,
			newMessages,
			certificates,
			subscribers
		}
	};
};
