import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { courseOptions } from '$lib/server/dashboard/options';
import {
	approveEnrollment,
	enrollmentForReview,
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

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('status');
	const status = STATUSES.find((s) => s === param) as EnrollmentStatus | undefined;

	const [rows, counts, courses, rejectForm, enrollForm] = await Promise.all([
		listEnrollments(status),
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

		if (!(await approveEnrollment(id, locals.user!.id))) {
			return flashFail(cookies, 'That enrolment is no longer waiting for review.');
		}
		void notifyEnrollmentApproved(id);
		return flashOk(cookies, 'Approved. The student can start the course now.');
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
