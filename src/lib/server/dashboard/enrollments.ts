import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '$lib/server/db';
import { chapaPayment, course, enrollment, paymentMethod, promoCode, user } from '$lib/server/db/schema';
import { enrollmentConfirmedEmail, paymentRejectedEmail } from '$lib/server/email';

export type EnrollmentStatus = (typeof enrollment.$inferSelect)['status'];

const reviewer = alias(user, 'reviewer');

/** Every enrolment with the names staff need to judge it, newest first. */
export async function listEnrollments(status?: EnrollmentStatus) {
	const rows = await db
		.select({
			id: enrollment.id,
			status: enrollment.status,
			userId: enrollment.userId,
			studentName: user.name,
			studentEmail: user.email,
			studentPhone: user.phoneNumber,
			studentPhoneVerified: user.phoneNumberVerified,
			courseId: enrollment.courseId,
			course: course.name,
			courseSlug: course.slug,
			amount: enrollment.amount,
			currency: enrollment.currency,
			paymentProvider: enrollment.paymentProvider,
			paidAt: enrollment.paidAt,
			discountAmount: enrollment.discountAmount,
			promoCode: promoCode.code,
			method: paymentMethod.name,
			/** The receipt's transaction reference, or Chapa's reference for a CHAPA place. */
			reference: enrollment.transactionReference,
			receipt: enrollment.receipt,
			createdAt: enrollment.createdAt,
			reviewedAt: enrollment.reviewedAt,
			reviewer: reviewer.name,
			rejectionReason: enrollment.rejectionReason,
			completedAt: enrollment.completedAt
		})
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.leftJoin(paymentMethod, eq(paymentMethod.id, enrollment.paymentMethodId))
		.leftJoin(promoCode, eq(promoCode.id, enrollment.promoCodeId))
		.leftJoin(reviewer, eq(reviewer.id, enrollment.reviewedBy))
		.where(status ? eq(enrollment.status, status) : undefined)
		.orderBy(desc(enrollment.createdAt), desc(enrollment.id));
	return rows;
}

/** What the approve action needs to know before it touches an enrolment. */
export async function enrollmentForReview(id: number) {
	const [row] = await db
		.select({
			id: enrollment.id,
			status: enrollment.status,
			userId: enrollment.userId,
			courseId: enrollment.courseId,
			paymentProvider: enrollment.paymentProvider,
			studentName: user.name
		})
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.where(eq(enrollment.id, id))
		.limit(1);
	return row ?? null;
}

/** The latest Chapa checkouts, paid or not, with who and what they were for. Read-only for staff. */
export async function listChapaPayments(limit = 50) {
	return db
		.select({
			txRef: chapaPayment.txRef,
			status: chapaPayment.status,
			studentName: user.name,
			studentEmail: user.email,
			course: course.name,
			amount: chapaPayment.amount,
			currency: chapaPayment.currency,
			discountAmount: chapaPayment.discountAmount,
			promoCode: promoCode.code,
			chapaReference: chapaPayment.chapaReference,
			failureReason: chapaPayment.failureReason,
			createdAt: chapaPayment.createdAt,
			verifiedAt: chapaPayment.verifiedAt
		})
		.from(chapaPayment)
		.innerJoin(user, eq(user.id, chapaPayment.userId))
		.innerJoin(course, eq(course.id, chapaPayment.courseId))
		.leftJoin(promoCode, eq(promoCode.id, chapaPayment.promoCodeId))
		.orderBy(desc(chapaPayment.createdAt), desc(chapaPayment.txRef))
		.limit(limit);
}

export async function statusCounts(): Promise<Record<EnrollmentStatus, number>> {
	const rows = await db
		.select({ status: enrollment.status, total: sql<number>`count(*)` })
		.from(enrollment)
		.groupBy(enrollment.status);
	const counts = { PENDING: 0, ACTIVE: 0, REJECTED: 0 };
	for (const row of rows) counts[row.status] = Number(row.total);
	return counts;
}

/**
 * Gives the student the course. A rejected payment can still be approved later (the receipt turned
 * up after all); an active one is left alone. Returns whether a row changed.
 *
 * Approval is when the money counts as received: a reviewed receipt is a MANUAL payment, and a
 * place that cost nothing is FREE.
 */
export async function approveEnrollment(id: number, staffId: string) {
	const now = new Date();
	const [result] = await db
		.update(enrollment)
		.set({
			status: 'ACTIVE',
			reviewedBy: staffId,
			reviewedAt: now,
			rejectionReason: null,
			paidAt: now,
			paymentProvider: sql`case when ${enrollment.paymentProvider} = 'CHAPA' then 'CHAPA' when ${enrollment.amount} > 0 then 'MANUAL' else 'FREE' end`
		})
		.where(and(eq(enrollment.id, id), inArray(enrollment.status, ['PENDING', 'REJECTED'])));
	return result.affectedRows > 0;
}

/** Only a pending payment can be rejected; the reason is shown to the student. */
export async function rejectEnrollment(id: number, staffId: string, reason: string) {
	const [result] = await db
		.update(enrollment)
		.set({
			status: 'REJECTED',
			reviewedBy: staffId,
			reviewedAt: new Date(),
			rejectionReason: reason
		})
		// Only a bank-transfer receipt is reviewed; an online payment is never rejected from here.
		.where(and(eq(enrollment.id, id), eq(enrollment.status, 'PENDING'), eq(enrollment.paymentProvider, 'MANUAL')));
	return result.affectedRows > 0;
}

export type ManualEnrollResult =
	| { ok: true; created: boolean; enrollmentId: number; studentName: string; courseName: string }
	| { ok: false; field: 'email' | 'courseId'; message: string };

/**
 * Staff enrol a student by email — a bank transfer settled by phone, a scholarship. The student
 * must already have an account. An existing pending or rejected enrolment is approved in place,
 * since the unique (user, course) index allows only one.
 */
export async function manualEnroll(
	email: string,
	courseId: number,
	staffId: string
): Promise<ManualEnrollResult> {
	const [[student], [target]] = await Promise.all([
		db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.email, email.toLowerCase())),
		db
			.select({ id: course.id, name: course.name, currency: course.currency })
			.from(course)
			.where(eq(course.id, courseId))
	]);
	if (!student) {
		return {
			ok: false,
			field: 'email',
			message: 'No account uses this email. Ask the student to sign up first.'
		};
	}
	if (!target) return { ok: false, field: 'courseId', message: 'Pick a course.' };

	const [existing] = await db
		.select({ id: enrollment.id, status: enrollment.status })
		.from(enrollment)
		.where(and(eq(enrollment.userId, student.id), eq(enrollment.courseId, target.id)));

	if (existing?.status === 'ACTIVE') {
		return {
			ok: false,
			field: 'email',
			message: `${student.name} is already enrolled in this course.`
		};
	}
	if (existing) {
		await approveEnrollment(existing.id, staffId);
		return {
			ok: true,
			created: false,
			enrollmentId: existing.id,
			studentName: student.name,
			courseName: target.name
		};
	}

	const now = new Date();
	const [inserted] = await db
		.insert(enrollment)
		.values({
			userId: student.id,
			courseId: target.id,
			status: 'ACTIVE',
			// Nothing was charged through the site; the amount stays 0 so revenue figures stay honest.
			amount: '0.00',
			currency: target.currency,
			paymentProvider: 'FREE',
			paidAt: now,
			transactionReference: 'Enrolled by staff',
			reviewedBy: staffId,
			reviewedAt: now
		})
		.$returningId();
	return {
		ok: true,
		created: true,
		enrollmentId: inserted.id,
		studentName: student.name,
		courseName: target.name
	};
}

// ── Notifications ───────────────────────────────────────────────────────────────────────────
// Called after the write above has committed. They never reject, so actions can start them
// without awaiting: a slow mail server must not hold up the dashboard.

async function enrollmentFacts(id: number) {
	const [row] = await db
		.select({
			status: enrollment.status,
			to: user.email,
			name: user.name,
			courseTitle: course.name,
			courseSlug: course.slug,
			amount: enrollment.amount,
			currency: enrollment.currency,
			provider: enrollment.paymentProvider,
			reference: enrollment.transactionReference,
			reason: enrollment.rejectionReason
		})
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.where(eq(enrollment.id, id));
	return row;
}

/** Tells the student they can start the course (approved receipt, or enrolled by staff). */
export async function notifyEnrollmentApproved(id: number): Promise<void> {
	try {
		const facts = await enrollmentFacts(id);
		if (facts?.status !== 'ACTIVE') return;
		await enrollmentConfirmedEmail({
			to: facts.to,
			name: facts.name,
			courseTitle: facts.courseTitle,
			courseSlug: facts.courseSlug,
			amount: facts.amount,
			currency: facts.currency,
			provider: facts.provider,
			reference: facts.reference
		});
	} catch (cause) {
		console.error(`Could not email the approval of enrollment ${id}:`, cause);
	}
}

/** Tells the student their receipt was not accepted, and why. */
export async function notifyEnrollmentRejected(id: number): Promise<void> {
	try {
		const facts = await enrollmentFacts(id);
		if (facts?.status !== 'REJECTED') return;
		await paymentRejectedEmail({
			to: facts.to,
			name: facts.name,
			courseTitle: facts.courseTitle,
			courseSlug: facts.courseSlug,
			reason: facts.reason ?? ''
		});
	} catch (cause) {
		console.error(`Could not email the rejection of enrollment ${id}:`, cause);
	}
}
