import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chapaPayment, course, enrollment, user } from '$lib/server/db/schema';
import { paymentNeedsReviewAdminEmail } from '$lib/server/email';
import {
	ChapaError,
	initializeChapa,
	judgeVerification,
	newTxRef,
	verifyChapa,
	type ChapaVerification
} from '$lib/server/chapa';
import { EnrollmentError, isDuplicate, notifyEnrolled } from '$lib/server/enrollment';
import { quoteCourse } from '$lib/server/promo';

/*
 * Paying for a course through Chapa. Starting a checkout writes a PENDING `chapa_payment` and
 * nothing else: no enrollment exists until `settleChapaPayment` has asked Chapa's verify API and
 * been told, for this reference, that exactly the amount and currency we asked for was paid.
 *
 * Settlement is idempotent and safe to run concurrently — the webhook, the return page and a
 * checkout reload may all race for the same reference. The payment row is locked for the write, so
 * one caller settles it and sends the email; the others find it PAID and report that.
 */

export type ChapaPayment = typeof chapaPayment.$inferSelect;

export type Settlement =
	| { status: 'paid'; payment: ChapaPayment; alreadySettled: boolean }
	| { status: 'failed'; payment: ChapaPayment; reason: string }
	/** `retryable`: asking again later may change the answer — the webhook answers 503 so Chapa retries. */
	| { status: 'pending'; payment: ChapaPayment | null; reason: string; retryable: boolean };

/** Tells staff about a payment that took money but could not be applied automatically. */
async function alertStaff(payment: ChapaPayment, reason: string, reference: string | null | undefined) {
	const [details] = await db
		.select({ studentName: user.name, studentEmail: user.email, courseTitle: course.name })
		.from(user)
		.innerJoin(course, eq(course.id, payment.courseId))
		.where(eq(user.id, payment.userId))
		.limit(1);
	if (!details) return;
	await paymentNeedsReviewAdminEmail({
		...details,
		amount: payment.amount,
		currency: payment.currency,
		reason,
		reference: reference ?? payment.chapaReference
	});
}

async function paymentByRef(txRef: string) {
	const [row] = await db.select().from(chapaPayment).where(eq(chapaPayment.txRef, txRef)).limit(1);
	return row ?? null;
}

/**
 * Verifies one Chapa payment and, when it is genuinely paid, gives the student the course: the
 * payment becomes PAID and the enrollment ACTIVE (a pending or rejected receipt for the same course
 * is replaced by this payment). `verify` is swappable for tests.
 */
export async function settleChapaPayment(
	txRef: string,
	verify: (txRef: string) => Promise<ChapaVerification> = verifyChapa
): Promise<Settlement> {
	const payment = await paymentByRef(txRef);
	if (!payment) return { status: 'pending', payment: null, reason: 'Unknown payment reference.', retryable: false };
	if (payment.status === 'PAID') return { status: 'paid', payment, alreadySettled: true };

	let verification: ChapaVerification;
	try {
		verification = await verify(txRef);
	} catch (error) {
		console.error(`Chapa verify failed for ${txRef}:`, error instanceof Error ? error.message : error);
		return { status: 'pending', payment, reason: 'Could not reach Chapa to confirm the payment.', retryable: true };
	}

	const judgement = judgeVerification(payment, verification);
	if (judgement.outcome === 'pending') return { status: 'pending', payment, reason: judgement.reason, retryable: true };

	if (judgement.outcome === 'failed') {
		console.warn(`Chapa payment ${txRef} not settled: ${judgement.reason}`);
		// Never undo a PAID row: another caller may have settled it a moment ago.
		await db
			.update(chapaPayment)
			.set({ status: 'FAILED', failureReason: judgement.reason.slice(0, 500), verifiedAt: new Date() })
			.where(and(eq(chapaPayment.txRef, txRef), ne(chapaPayment.status, 'PAID')));
		const current = (await paymentByRef(txRef))!;
		// Money was taken but doesn't match: staff must decide. Told once, on the first verdict.
		if (payment.status === 'PENDING' && current.status === 'FAILED' && /needs staff review/i.test(judgement.reason)) {
			await alertStaff(current, judgement.reason, null);
		}
		return current.status === 'PAID'
			? { status: 'paid', payment: current, alreadySettled: true }
			: { status: 'failed', payment: current, reason: judgement.reason };
	}

	const reference = judgement.reference;
	const settled = await db.transaction(async (tx) => {
		const [locked] = await tx.select().from(chapaPayment).where(eq(chapaPayment.txRef, txRef)).for('update');
		if (locked.status === 'PAID') return { won: false, enrolled: false };
		const now = new Date();
		await tx
			.update(chapaPayment)
			.set({ status: 'PAID', chapaReference: reference, failureReason: null, verifiedAt: now })
			.where(eq(chapaPayment.txRef, txRef));

		const place = {
			status: 'ACTIVE' as const,
			amount: locked.amount,
			currency: locked.currency,
			paymentProvider: 'CHAPA' as const,
			promoCodeId: locked.promoCodeId,
			discountAmount: locked.discountAmount,
			paidAt: now,
			transactionReference: (reference ?? locked.txRef).slice(0, 120),
			paymentMethodId: null,
			rejectionReason: null,
			reviewedBy: null,
			reviewedAt: null
		};
		const existing = async () =>
			(
				await tx
					.select({ id: enrollment.id, status: enrollment.status })
					.from(enrollment)
					.where(and(eq(enrollment.userId, locked.userId), eq(enrollment.courseId, locked.courseId)))
					.for('update')
			)[0];

		let current = await existing();
		if (!current) {
			try {
				await tx.insert(enrollment).values({ userId: locked.userId, courseId: locked.courseId, ...place });
				return { won: true, enrolled: true };
			} catch (error) {
				if (!isDuplicate(error)) throw error;
				current = await existing();
			}
		}
		if (current.status === 'ACTIVE') {
			// Paid twice (two tabs), or staff approved a receipt meanwhile: the money is recorded on
			// this payment for staff to refund; the enrollment keeps what activated it.
			console.warn(`Chapa payment ${txRef} settled for an enrollment that was already active (${current.id}).`);
			return { won: true, enrolled: false };
		}
		await tx.update(enrollment).set(place).where(eq(enrollment.id, current.id));
		return { won: true, enrolled: true };
	});

	const final = (await paymentByRef(txRef))!;
	if (settled.won && !settled.enrolled) {
		await alertStaff(final, 'Paid after the course was already active (paid twice, or a receipt was approved meanwhile). Refund one payment in Chapa.', reference);
	}
	if (settled.enrolled) {
		await notifyEnrolled(final.userId, final.courseId, {
			provider: 'CHAPA',
			amount: final.amount,
			currency: final.currency,
			reference
		});
	}
	return { status: 'paid', payment: final, alreadySettled: !settled.won };
}

/**
 * Opens a Chapa checkout for a paid course and returns the page to send the student to. The price
 * (after the promo code, re-checked and locked) is fixed on the payment row here; settlement holds
 * Chapa to it.
 */
export async function startChapaCheckout(input: {
	user: { id: string; name: string; email: string };
	courseId: number;
	promoCode?: string | null;
	origin: string;
	slug: string;
}): Promise<string> {
	const [target] = await db
		.select({ id: course.id, name: course.name, accessType: course.accessType })
		.from(course)
		.where(and(eq(course.id, input.courseId), eq(course.status, true)))
		.limit(1);
	if (!target) throw new EnrollmentError('COURSE_NOT_FOUND', 'This course is not available.');
	if (target.accessType !== 'PAID') throw new EnrollmentError('NOT_PAID', 'This course is free; no payment is needed.');

	const txRef = newTxRef();
	const row = await db.transaction(async (tx) => {
		const quote = await quoteCourse({ userId: input.user.id, courseId: target.id, code: input.promoCode, lock: true }, tx);
		if (Number(quote.amountDue) <= 0)
			throw new EnrollmentError('NO_PAYMENT_DUE', 'Your promo code covers the whole price; there is nothing to pay.');
		const [current] = await tx
			.select({ status: enrollment.status })
			.from(enrollment)
			.where(and(eq(enrollment.userId, input.user.id), eq(enrollment.courseId, target.id)));
		if (current?.status === 'ACTIVE') throw new EnrollmentError('ALREADY_ENROLLED', 'You are already enrolled in this course.');
		if (current?.status === 'PENDING')
			throw new EnrollmentError('PAYMENT_PENDING', 'A payment for this course is already under review.');

		const values = {
			txRef,
			userId: input.user.id,
			courseId: target.id,
			amount: quote.amountDue,
			currency: quote.currency,
			promoCodeId: quote.promo?.id ?? null,
			discountAmount: quote.discountAmount
		};
		await tx.insert(chapaPayment).values(values);
		return values;
	});

	const origin = input.origin.replace(/\/$/, '');
	try {
		return await initializeChapa({
			txRef,
			amount: row.amount,
			currency: row.currency,
			email: input.user.email,
			name: input.user.name,
			callbackUrl: `${origin}/api/chapa/webhook`,
			returnUrl: `${origin}/checkout/${encodeURIComponent(input.slug)}/complete?tx_ref=${encodeURIComponent(txRef)}`,
			title: 'Joel Academy',
			description: target.name
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.error(`Chapa initialize failed for ${txRef}:`, reason);
		await db
			.update(chapaPayment)
			.set({ status: 'FAILED', failureReason: `Could not start: ${reason}`.slice(0, 500) })
			.where(and(eq(chapaPayment.txRef, txRef), eq(chapaPayment.status, 'PENDING')));
		throw new ChapaError('Chapa could not start the payment. Please try again, or pay by bank transfer.');
	}
}

/** The student's most recent unsettled Chapa payment for a course, to settle on their return. */
export async function latestPendingPayment(userId: string, courseId: number) {
	const [row] = await db
		.select()
		.from(chapaPayment)
		.where(and(eq(chapaPayment.userId, userId), eq(chapaPayment.courseId, courseId), eq(chapaPayment.status, 'PENDING')))
		.orderBy(desc(chapaPayment.createdAt))
		.limit(1);
	return row ?? null;
}
