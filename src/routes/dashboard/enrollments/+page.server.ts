import type { Cookies } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { courseOptions } from '$lib/server/dashboard/options';
import { latestPendingPayment, settleChapaPayment } from '$lib/server/chapa-settlement';
import {
	approveEnrollment,
	enrollmentForReview,
	listChapaPayments,
	listEnrollments,
	manualEnroll,
	notifyEnrollmentApproved,
	notifyEnrollmentRejected,
	rejectEnrollment,
	statusCounts,
	type EnrollmentStatus
} from '$lib/server/dashboard/enrollments';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { enrollSchema, rejectSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'] as const;

/**
 * An unwelcome outcome after the data changed (Chapa settled or failed a payment): shown as an
 * error toast, but answered as a normal result so the page reloads its rows — a `fail()` would
 * leave the table showing what was there before.
 */
function flashChanged(cookies: Cookies, message: string) {
	setFlash({ type: 'error', message }, cookies);
	return { ok: false };
}

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('status');
	const status = STATUSES.find((s) => s === param) as EnrollmentStatus | undefined;

	const [rows, payments, counts, courses, rejectForm, enrollForm] = await Promise.all([
		listEnrollments(status),
		listChapaPayments(50),
		statusCounts(),
		courseOptions(),
		superValidate(zod4(rejectSchema)),
		superValidate(zod4(enrollSchema))
	]);

	return {
		status: status ?? null,
		counts,
		rows: rows.map((row) => ({
			...row,
			amount: Number(row.amount),
			discountAmount: Number(row.discountAmount)
		})),
		payments: payments.map((payment) => ({
			...payment,
			amount: Number(payment.amount),
			discountAmount: Number(payment.discountAmount)
		})),
		courses,
		rejectForm,
		enrollForm
	};
};

export const actions: Actions = {
	approve: async ({ request, locals, cookies }) => {
		const id = postedId(await request.formData());
		const target = id ? await enrollmentForReview(id) : null;
		if (!target || target.status === 'ACTIVE') {
			return flashFail(cookies, 'That enrolment is no longer waiting for review.');
		}
		if (target.paymentProvider !== 'MANUAL') {
			return flashFail(cookies, 'Only a bank-transfer receipt needs approving.');
		}

		/*
		 * The student may have paid through Chapa as well — a second tab, or after uploading the
		 * receipt. Settle that first: if Chapa has the money, the place is already paid for, and
		 * approving the receipt too would charge them twice.
		 */
		const pending = await latestPendingPayment(target.userId, target.courseId);
		if (pending) {
			const settlement = await settleChapaPayment(pending.txRef);
			if (settlement.status === 'paid') {
				const reference = settlement.payment.chapaReference ?? settlement.payment.txRef;
				return flashChanged(
					cookies,
					`${target.studentName} already paid online through Chapa (${reference}), so the course is active. ` +
						'The receipt was not approved: decide by hand whether that bank transfer needs refunding.'
				);
			}
		}

		if (!(await approveEnrollment(id, locals.user!.id))) {
			return flashFail(cookies, 'That enrolment is no longer waiting for review.');
		}
		void notifyEnrollmentApproved(id);
		return flashOk(cookies, 'Approved. The student can start the course now.');
	},

	/** Asks Chapa again about one checkout. Settlement is idempotent, so this is always safe. */
	recheck: async ({ request, cookies }) => {
		const txRef = String((await request.formData()).get('txRef') ?? '').trim();
		if (!txRef || txRef.length > 64) return flashFail(cookies, 'That payment reference is not valid.');
		const settlement = await settleChapaPayment(txRef);
		switch (settlement.status) {
			case 'paid':
				return flashOk(
					cookies,
					settlement.alreadySettled
						? 'This payment was already settled as paid.'
						: 'Chapa confirms the payment. It is now marked paid and the student has the course.'
				);
			case 'failed':
				return flashChanged(cookies, `Not paid: ${settlement.reason}`);
			case 'pending':
				return flashChanged(cookies, `Still not confirmed: ${settlement.reason}`);
		}
	},

	reject: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(rejectSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Give a reason.' }, { status: 400 });
		if (!(await rejectEnrollment(form.data.id, locals.user!.id, form.data.reason))) {
			return message(
				form,
				{
					type: 'error',
					text: 'That enrolment is no longer waiting for review.'
				},
				{ status: 409 }
			);
		}
		void notifyEnrollmentRejected(form.data.id);
		return message(form, {
			type: 'success',
			text: 'Rejected. The student sees your reason.'
		});
	},

	enroll: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(enrollSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		const result = await manualEnroll(form.data.email, form.data.courseId, locals.user!.id);
		if (!result.ok) {
			setError(form, result.field, result.message);
			return message(form, { type: 'error', text: result.message }, { status: 400 });
		}
		void notifyEnrollmentApproved(result.enrollmentId);
		return message(form, {
			type: 'success',
			text: `${result.studentName} is ${result.created ? 'enrolled in' : 'now active on'} ${result.courseName}.`
		});
	}
};
