import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { MAX_UPLOAD_BYTES, saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { db } from '$lib/server/db';
import { paymentMethod, promoCode, user as userTable } from '$lib/server/db/schema';
import { ChapaError, chapaEnabled } from '$lib/server/chapa';
import { latestPendingPayment, settleChapaPayment, startChapaCheckout } from '$lib/server/chapa-settlement';
import { receiptReceivedEmail, receiptSubmittedAdminEmail } from '$lib/server/email';
import {
	activePaymentMethods,
	EnrollmentError,
	enrollWithFullDiscount,
	getEnrollment,
	startPaidEnrollment
} from '$lib/server/enrollment';
import { PromoError, quoteCourse } from '$lib/server/promo';
import { getCourse } from '$lib/server/public-catalog';
import { requireActionUser, requireUser } from '$lib/server/student';
import { effectivePrice } from '$lib/progress';
import { normalizePromoCode } from '$lib/promo';
import { receiptProblem } from '$lib/receipt';
import { ROUTES } from '$lib/site';
import type { Actions, PageServerLoad } from './$types';

/** A Chapa checkout older than this is not re-verified on every visit. */
const RECHECK_WINDOW_MS = 24 * 60 * 60 * 1000;

async function paidCourse(slug: string) {
	const found = await getCourse(slug);
	if (!found) error(404, 'Course not found');
	// Free courses skip checkout: the course page enrolls them in place.
	if (found.accessType === 'FREE') redirect(303, ROUTES.courses.detail(found.slug));
	return found;
}

/** The refusal the student sees for anything checkout can say no to; anything else is a fault. */
function refusal(err: unknown): string | null {
	if (err instanceof EnrollmentError || err instanceof PromoError || err instanceof ChapaError) return err.message;
	return null;
}

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const found = await paidCourse(event.params.slug);
	const courseId = Number(found.id);
	const current = await getEnrollment(user.id, courseId);
	if (current?.status === 'ACTIVE') redirect(303, ROUTES.student.learn(found.slug));

	// Back from Chapa by some other way than its return link (or before the webhook arrived): settle
	// the latest attempt now, so nobody is offered a second payment for a course already paid for.
	let chapaPending: { txRef: string; amount: string; currency: string; createdAt: string } | null = null;
	const pendingPayment = await latestPendingPayment(user.id, courseId);
	if (pendingPayment && Date.now() - pendingPayment.createdAt.getTime() < RECHECK_WINDOW_MS) {
		const outcome = await settleChapaPayment(pendingPayment.txRef);
		if (outcome.status === 'paid') redirect(303, ROUTES.student.learn(found.slug));
		if (outcome.status === 'pending') {
			chapaPending = {
				txRef: pendingPayment.txRef,
				amount: pendingPayment.amount,
				currency: pendingPayment.currency,
				createdAt: pendingPayment.createdAt.toISOString()
			};
		}
	}

	// A promo code arrives in the URL (the promo step is a GET form), so a reload keeps it.
	const promoInput = normalizePromoCode(event.url.searchParams.get('promo'));
	let promo: { code: string; description: string | null; discountAmount: string; amountDue: string } | null = null;
	let promoError: string | null = null;
	if (promoInput) {
		try {
			const quote = await quoteCourse({ userId: user.id, courseId, code: promoInput });
			if (quote.promo)
				promo = {
					code: quote.promo.code,
					description: quote.promo.description,
					discountAmount: quote.discountAmount,
					amountDue: quote.amountDue
				};
		} catch (err) {
			if (!(err instanceof PromoError)) throw err;
			promoError = err.message;
		}
	}

	const [methods, submittedWith, submittedPromo, [phone]] = await Promise.all([
		activePaymentMethods(),
		current?.paymentMethodId
			? db.select({ name: paymentMethod.name }).from(paymentMethod).where(eq(paymentMethod.id, current.paymentMethodId))
			: Promise.resolve([]),
		current?.promoCodeId
			? db.select({ code: promoCode.code }).from(promoCode).where(eq(promoCode.id, current.promoCodeId))
			: Promise.resolve([]),
		db.select({ verified: userTable.phoneNumberVerified }).from(userTable).where(eq(userTable.id, user.id))
	]);

	return {
		course: {
			id: found.id,
			slug: found.slug,
			title: found.title,
			subtitle: found.subtitle,
			presenterName: found.presenterName,
			thumbnailUrl: found.thumbnailUrl,
			categoryName: found.categoryName,
			categorySlug: found.categorySlug,
			difficulty: found.difficulty,
			estimatedDurationMinutes: found.estimatedDurationMinutes,
			certificateEnabled: found.certificateEnabled,
			outcomes: found.outcomes,
			price: found.price,
			discountPrice: found.discountPrice,
			currency: found.currency,
			total: effectivePrice(found.price, found.discountPrice)
		},
		promo,
		promoInput,
		promoError,
		requestedStep: Number(event.url.searchParams.get('step')) || null,
		chapa: chapaEnabled(),
		chapaPending,
		// Only a suggestion: students without a verified phone are offered SMS updates, never stopped.
		hasVerifiedPhone: Boolean(phone?.verified),
		methods,
		maxReceiptBytes: MAX_UPLOAD_BYTES,
		submission: current
			? {
					status: current.status,
					amount: current.amount,
					currency: current.currency,
					discountAmount: current.discountAmount,
					promoCode: submittedPromo[0]?.code ?? null,
					transactionReference: current.transactionReference,
					methodName: submittedWith[0]?.name ?? null,
					submittedAt: current.updatedAt.toISOString(),
					rejectionReason: current.rejectionReason
				}
			: null
	};
};

const postedPromo = (posted: FormData) => normalizePromoCode(posted.get('promoCode')) || null;

export const actions: Actions = {
	/** A receipt for a bank transfer: PENDING until staff review it. */
	submit: async (event) => {
		const user = requireActionUser(event);
		const found = await paidCourse(event.params.slug);

		const posted = await event.request.formData();
		const methodId = Number(posted.get('paymentMethodId'));
		const transactionReference = String(posted.get('transactionReference') ?? '').trim();
		const receipt = posted.get('receipt');
		const promo = postedPromo(posted);
		const values = { paymentMethodId: String(posted.get('paymentMethodId') ?? ''), transactionReference };

		const errors: Partial<Record<'paymentMethodId' | 'transactionReference' | 'receipt', string>> = {};
		if (!Number.isSafeInteger(methodId) || methodId <= 0) errors.paymentMethodId = 'Choose a payment method.';
		if (transactionReference.length < 3) errors.transactionReference = 'Enter the transaction ID from your payment.';
		else if (transactionReference.length > 120) errors.transactionReference = 'The transaction ID is too long.';
		const receiptError = receiptProblem(receipt instanceof File ? receipt : null, MAX_UPLOAD_BYTES);
		if (receiptError) errors.receipt = receiptError;
		if (Object.keys(errors).length > 0) return fail(400, { values, errors });

		// Checked before the file is written, so a refused submission leaves nothing behind in the store.
		const current = await getEnrollment(user.id, Number(found.id));
		if (current?.status === 'ACTIVE') redirect(303, ROUTES.student.learn(found.slug));
		if (current?.status === 'PENDING')
			return fail(409, { values, errors: { form: 'A payment for this course is already under review.' } });
		try {
			await quoteCourse({ userId: user.id, courseId: Number(found.id), code: promo });
		} catch (err) {
			const message = refusal(err);
			if (!message) throw err;
			return fail(400, { values, errors: { form: message } });
		}

		let stored: string;
		try {
			stored = await saveUploadedFile(receipt as File);
		} catch (err) {
			if (err instanceof UploadRefused) return fail(400, { values, errors: { receipt: err.message } });
			throw err;
		}

		let enrolled;
		try {
			enrolled = await startPaidEnrollment({
				userId: user.id,
				courseId: Number(found.id),
				paymentMethodId: methodId,
				receipt: stored,
				transactionReference,
				promoCode: promo
			});
		} catch (err) {
			if (err instanceof EnrollmentError && err.code === 'PAYMENT_METHOD_INVALID')
				return fail(400, { values, errors: { paymentMethodId: err.message } });
			const message = refusal(err);
			if (!message) throw err;
			return fail(400, { values, errors: { form: message } });
		}

		await Promise.all([
			receiptSubmittedAdminEmail({
				studentName: user.name,
				studentEmail: user.email,
				courseTitle: found.title,
				amount: enrolled.amount,
				currency: enrolled.currency,
				reference: transactionReference
			}),
			receiptReceivedEmail({
				to: user.email,
				name: user.name,
				courseTitle: found.title,
				courseSlug: found.slug,
				amount: enrolled.amount,
				currency: enrolled.currency
			})
		]);
		redirect(303, ROUTES.student.checkout(found.slug));
	},

	/** Opens a Chapa checkout and sends the student there; nothing is enrolled until it verifies. */
	chapa: async (event) => {
		const user = requireActionUser(event);
		const found = await paidCourse(event.params.slug);
		if (!chapaEnabled()) return fail(400, { errors: { chapa: 'Online payment is not available right now.' } });
		const posted = await event.request.formData();

		let checkoutUrl: string;
		try {
			checkoutUrl = await startChapaCheckout({
				user: { id: user.id, name: user.name, email: user.email },
				courseId: Number(found.id),
				promoCode: postedPromo(posted),
				origin: event.url.origin,
				slug: found.slug
			});
		} catch (err) {
			if (err instanceof EnrollmentError && err.code === 'ALREADY_ENROLLED') redirect(303, ROUTES.student.learn(found.slug));
			const message = refusal(err);
			if (!message) throw err;
			return fail(400, { errors: { chapa: message } });
		}
		redirect(303, checkoutUrl);
	},

	/** A promo code that covers the whole price: enrolled at once, nothing to pay. */
	redeem: async (event) => {
		const user = requireActionUser(event);
		const found = await paidCourse(event.params.slug);
		const promo = postedPromo(await event.request.formData());
		if (!promo) return fail(400, { errors: { redeem: 'Enter a promo code first.' } });
		try {
			await enrollWithFullDiscount(user.id, Number(found.id), promo);
		} catch (err) {
			if (err instanceof EnrollmentError && err.code === 'ALREADY_ENROLLED') redirect(303, ROUTES.student.learn(found.slug));
			const message = refusal(err);
			if (!message) throw err;
			return fail(400, { errors: { redeem: message } });
		}
		redirect(303, ROUTES.student.learn(found.slug));
	}
};
