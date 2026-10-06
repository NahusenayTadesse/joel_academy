import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate, course, enrollment, lesson, lessonProgress, paymentMethod, user } from '$lib/server/db/schema';
import { issueCertificate } from '$lib/server/certificates';
import { certificateIssuedEmail, enrollmentConfirmedEmail } from '$lib/server/email';
import { quoteCourse } from '$lib/server/promo';
import { courseProgress, type CourseProgress } from '$lib/progress';

/*
 * Who may learn what. Free courses enroll straight to ACTIVE; paid ones go PENDING with a receipt
 * until staff approve, or ACTIVE once Chapa confirms the money (`chapa-settlement.ts`), or straight
 * to ACTIVE when a promo code covers the whole price. Lesson content is open to ACTIVE enrollments,
 * and preview lessons to anyone signed in. Every function takes the user id from the caller's
 * session, never from a form, and every price comes from `quoteCourse`, never from the page.
 *
 * Emails go out after the write has committed; they never fail the request (see `$lib/server/email`).
 */

export type Enrollment = typeof enrollment.$inferSelect;
export type EnrollmentStatus = Enrollment['status'];

/** A refusal the student can act on, as opposed to a fault. */
export class EnrollmentError extends Error {
	constructor(
		readonly code:
			| 'COURSE_NOT_FOUND'
			| 'NOT_FREE'
			| 'NOT_PAID'
			| 'ALREADY_ENROLLED'
			| 'PAYMENT_PENDING'
			| 'PAYMENT_METHOD_INVALID'
			| 'NO_PAYMENT_DUE'
			| 'PAYMENT_DUE'
			| 'LESSON_NOT_FOUND'
			| 'NOT_ENROLLED',
		message: string
	) {
		super(message);
		this.name = 'EnrollmentError';
	}
}

export async function getEnrollment(userId: string, courseId: number): Promise<Enrollment | undefined> {
	const [row] = await db
		.select()
		.from(enrollment)
		.where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
		.limit(1);
	return row;
}

async function publishedCourse(courseId: number) {
	const [row] = await db
		.select()
		.from(course)
		.where(and(eq(course.id, courseId), eq(course.status, true)))
		.limit(1);
	if (!row) throw new EnrollmentError('COURSE_NOT_FOUND', 'This course is not available.');
	return row;
}

export const isDuplicate = (error: unknown) =>
	((error as { cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code) === 'ER_DUP_ENTRY';

/** Tells the student they have the course. Call after the write that enrolled them has committed. */
export async function notifyEnrolled(
	userId: string,
	courseId: number,
	payment: { provider: 'FREE' | 'MANUAL' | 'CHAPA'; amount: string; currency: string; reference?: string | null }
) {
	const [found] = await db
		.select({ email: user.email, name: user.name, courseTitle: course.name, courseSlug: course.slug })
		.from(user)
		.innerJoin(course, eq(course.id, courseId))
		.where(eq(user.id, userId))
		.limit(1);
	if (!found) return;
	await enrollmentConfirmedEmail({
		to: found.email,
		name: found.name,
		courseTitle: found.courseTitle,
		courseSlug: found.courseSlug,
		amount: payment.amount,
		currency: payment.currency,
		provider: payment.provider,
		reference: payment.reference ?? null
	});
}

/** Enrolls in a free course. Enrolling twice is harmless: the existing place is returned. */
export async function enrollFree(userId: string, courseId: number): Promise<Enrollment> {
	const row = await publishedCourse(courseId);
	if (row.accessType !== 'FREE') throw new EnrollmentError('NOT_FREE', 'This course requires payment.');

	const free = { status: 'ACTIVE' as const, amount: '0.00', paymentProvider: 'FREE' as const, rejectionReason: null };
	const existing = await getEnrollment(userId, courseId);
	if (existing?.status === 'ACTIVE') return existing;
	let enrolled = true;
	if (existing) {
		// A paid course made free since: whatever was pending or rejected no longer stands in the way.
		await db.update(enrollment).set(free).where(eq(enrollment.id, existing.id));
	} else {
		try {
			await db.insert(enrollment).values({ userId, courseId, currency: row.currency, ...free });
		} catch (error) {
			// A double click: the other request enrolled them, and sends the email.
			if (!isDuplicate(error)) throw error;
			enrolled = false;
		}
	}
	if (enrolled) await notifyEnrolled(userId, courseId, { provider: 'FREE', amount: '0.00', currency: row.currency });
	return (await getEnrollment(userId, courseId))!;
}

/**
 * Enrolls in a paid course whose promo code covers the whole price: ACTIVE at once, with nothing
 * to pay. The code is re-checked (and locked) here; one that no longer covers the price is refused.
 */
export async function enrollWithFullDiscount(userId: string, courseId: number, code: string): Promise<Enrollment> {
	const row = await publishedCourse(courseId);
	if (row.accessType !== 'PAID') throw new EnrollmentError('NOT_PAID', 'This course is free; no promo code is needed.');

	await db.transaction(async (tx) => {
		const quote = await quoteCourse({ userId, courseId, code, lock: true }, tx);
		if (!quote.promo || Number(quote.amountDue) > 0)
			throw new EnrollmentError('PAYMENT_DUE', 'This code does not cover the whole price. Choose a way to pay.');

		const values = {
			status: 'ACTIVE' as const,
			amount: '0.00',
			currency: quote.currency,
			paymentProvider: 'FREE' as const,
			promoCodeId: quote.promo.id,
			discountAmount: quote.discountAmount,
			paymentMethodId: null,
			rejectionReason: null
		};
		const [existing] = await tx
			.select({ id: enrollment.id, status: enrollment.status })
			.from(enrollment)
			.where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
			.for('update');
		if (existing?.status === 'ACTIVE') throw new EnrollmentError('ALREADY_ENROLLED', 'You are already enrolled in this course.');
		if (existing?.status === 'PENDING')
			throw new EnrollmentError('PAYMENT_PENDING', 'A payment for this course is already under review.');
		if (existing) await tx.update(enrollment).set(values).where(eq(enrollment.id, existing.id));
		else await tx.insert(enrollment).values({ userId, courseId, ...values });
	});

	await notifyEnrolled(userId, courseId, { provider: 'FREE', amount: '0.00', currency: row.currency });
	return (await getEnrollment(userId, courseId))!;
}

/** The payment methods a student may choose from at checkout, in the order staff set. */
export function activePaymentMethods() {
	return db
		.select({
			id: paymentMethod.id,
			name: paymentMethod.name,
			accountName: paymentMethod.accountName,
			accountNumber: paymentMethod.accountNumber,
			instructions: paymentMethod.instructions
		})
		.from(paymentMethod)
		.where(and(eq(paymentMethod.status, true), isNull(paymentMethod.deletedAt)))
		.orderBy(paymentMethod.sortOrder, paymentMethod.id);
}

/**
 * Submits a receipt for a paid course: a new PENDING enrollment, or a resubmission after a
 * rejection. The amount is the course's price now, less any promo code, never anything the browser
 * sent. A code that covers the whole price is refused here: that is `enrollWithFullDiscount`.
 */
export async function startPaidEnrollment(input: {
	userId: string;
	courseId: number;
	paymentMethodId: number;
	receipt: string;
	transactionReference: string;
	promoCode?: string | null;
}): Promise<Enrollment> {
	const row = await publishedCourse(input.courseId);
	if (row.accessType !== 'PAID') throw new EnrollmentError('NOT_PAID', 'This course is free; no payment is needed.');

	const [method] = await db
		.select({ id: paymentMethod.id })
		.from(paymentMethod)
		.where(and(eq(paymentMethod.id, input.paymentMethodId), eq(paymentMethod.status, true), isNull(paymentMethod.deletedAt)))
		.limit(1);
	if (!method) throw new EnrollmentError('PAYMENT_METHOD_INVALID', 'Choose one of the payment methods listed.');

	await db.transaction(async (tx) => {
		const quote = await quoteCourse(
			{ userId: input.userId, courseId: input.courseId, code: input.promoCode, lock: true },
			tx
		);
		if (Number(quote.amountDue) <= 0)
			throw new EnrollmentError('NO_PAYMENT_DUE', 'Your promo code covers the whole price; there is nothing to pay.');

		const payment = {
			status: 'PENDING' as const,
			amount: quote.amountDue,
			currency: quote.currency,
			paymentProvider: 'MANUAL' as const,
			promoCodeId: quote.promo?.id ?? null,
			discountAmount: quote.discountAmount,
			paymentMethodId: method.id,
			receipt: input.receipt,
			transactionReference: input.transactionReference,
			rejectionReason: null,
			reviewedBy: null,
			reviewedAt: null,
			paidAt: null
		};

		const [existing] = await tx
			.select({ id: enrollment.id, status: enrollment.status })
			.from(enrollment)
			.where(and(eq(enrollment.userId, input.userId), eq(enrollment.courseId, input.courseId)))
			.for('update');
		if (existing?.status === 'ACTIVE') throw new EnrollmentError('ALREADY_ENROLLED', 'You are already enrolled in this course.');
		if (existing?.status === 'PENDING')
			throw new EnrollmentError('PAYMENT_PENDING', 'A payment for this course is already under review.');

		if (existing) {
			await tx.update(enrollment).set(payment).where(eq(enrollment.id, existing.id));
		} else {
			try {
				await tx.insert(enrollment).values({ userId: input.userId, courseId: input.courseId, ...payment });
			} catch (error) {
				if (!isDuplicate(error)) throw error;
				throw new EnrollmentError('PAYMENT_PENDING', 'A payment for this course is already under review.');
			}
		}
	});
	return (await getEnrollment(input.userId, input.courseId))!;
}

/** Whether a lesson's content may be shown. Preview lessons are open to anyone signed in. */
export function canAccessLesson(
	current: Pick<Enrollment, 'status'> | null | undefined,
	target: { isPreview: boolean }
): boolean {
	return current?.status === 'ACTIVE' || target.isPreview;
}

/** Lesson ids of `courseId` the student has completed. */
export async function completedLessonIds(userId: string, courseId: number): Promise<Set<number>> {
	const rows = await db
		.select({ lessonId: lessonProgress.lessonId })
		.from(lessonProgress)
		.innerJoin(lesson, eq(lesson.id, lessonProgress.lessonId))
		.where(and(eq(lessonProgress.userId, userId), eq(lesson.courseId, courseId)));
	return new Set(rows.map((row) => row.lessonId));
}

/** Progress for each of several courses at once, for the "my courses" list. */
export async function progressByCourse(userId: string, courseIds: number[]): Promise<Map<number, CourseProgress>> {
	if (courseIds.length === 0) return new Map();
	const [lessons, done] = await Promise.all([
		db
			.select({ id: lesson.id, courseId: lesson.courseId, isMandatory: lesson.isMandatory })
			.from(lesson)
			.where(inArray(lesson.courseId, courseIds)),
		db
			.select({ lessonId: lessonProgress.lessonId })
			.from(lessonProgress)
			.innerJoin(lesson, eq(lesson.id, lessonProgress.lessonId))
			.where(and(eq(lessonProgress.userId, userId), inArray(lesson.courseId, courseIds)))
	]);
	const doneIds = new Set(done.map((row) => row.lessonId));
	return new Map(
		courseIds.map((id) => [id, courseProgress(lessons.filter((item) => item.courseId === id), doneIds)])
	);
}

export interface CompletionResult {
	progress: CourseProgress;
	/** Set when this completion finished the course and it awards a certificate. */
	certificateCode: string | null;
	/** True only for the completion that issued the certificate, not for later ones. */
	certificateIssued: boolean;
}

/**
 * Marks a lesson done for an ACTIVE enrollment. Marking it again changes nothing. When the last
 * required lesson is done, the enrollment is stamped complete and — if the course awards one — the
 * certificate issued, in the same transaction, so a completed course never lacks its certificate.
 * A newly issued certificate is emailed once the transaction has committed.
 */
export async function markLessonComplete(userId: string, lessonId: number): Promise<CompletionResult> {
	const { result, issued } = await db.transaction(async (tx) => {
		const [target] = await tx
			.select({ id: lesson.id, courseId: lesson.courseId })
			.from(lesson)
			.where(eq(lesson.id, lessonId))
			.limit(1);
		if (!target) throw new EnrollmentError('LESSON_NOT_FOUND', 'That lesson does not exist.');

		const [current] = await tx
			.select()
			.from(enrollment)
			.where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, target.courseId)))
			.limit(1)
			.for('update');
		if (current?.status !== 'ACTIVE')
			throw new EnrollmentError('NOT_ENROLLED', 'Enroll in this course to track your progress.');

		await tx.insert(lessonProgress).ignore().values({ userId, lessonId });

		const [lessons, done, [owner]] = await Promise.all([
			tx.select({ id: lesson.id, isMandatory: lesson.isMandatory }).from(lesson).where(eq(lesson.courseId, target.courseId)),
			tx
				.select({ lessonId: lessonProgress.lessonId })
				.from(lessonProgress)
				.innerJoin(lesson, eq(lesson.id, lessonProgress.lessonId))
				.where(and(eq(lessonProgress.userId, userId), eq(lesson.courseId, target.courseId))),
			tx.select({ certificateEnabled: course.certificateEnabled }).from(course).where(eq(course.id, target.courseId))
		]);
		const progress = courseProgress(lessons, new Set(done.map((row) => row.lessonId)));
		const none = { progress, certificateCode: null, certificateIssued: false };
		if (!progress.completed) return { result: none, issued: null };

		if (!current.completedAt) {
			await tx.update(enrollment).set({ completedAt: new Date() }).where(eq(enrollment.id, current.id));
		}
		if (!owner?.certificateEnabled) return { result: none, issued: null };
		// The enrollment row is locked, so no other completion can issue between this check and the issue.
		const [before] = await tx
			.select({ id: certificate.id })
			.from(certificate)
			.where(and(eq(certificate.userId, userId), eq(certificate.courseId, target.courseId)))
			.limit(1);
		const cert = await issueCertificate({ userId, courseId: target.courseId }, tx);
		return {
			result: { progress, certificateCode: cert.code, certificateIssued: !before },
			issued: before ? null : cert
		};
	});

	if (issued) {
		const [owner] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId));
		if (owner) {
			await certificateIssuedEmail({
				to: owner.email,
				name: owner.name,
				courseTitle: issued.courseTitle,
				code: issued.code,
				token: issued.token
			});
		}
	}
	return result;
}
