import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { course, enrollment, paymentMethod } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/student';
import type { PaymentRecord as PaymentRow } from '$lib/components/student/home/payment-status';
import type { PageServerLoad } from './$types';

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const;

/*
 * The student's own payments: manual receipts (one per enrollment: a resubmission replaces the
 * declined one). The receipt file itself is for staff only and never linked here.
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const params = event.url.searchParams;
	const status = FILTERS.find((value) => value === params.get('status')) ?? 'ALL';
	const search = (params.get('search') ?? '').trim().slice(0, 100);

	const receipts = await db
		.select({
			id: enrollment.id,
			status: enrollment.status,
			amount: enrollment.amount,
			currency: enrollment.currency,
			reference: enrollment.transactionReference,
			reviewedAt: enrollment.reviewedAt,
			rejectionReason: enrollment.rejectionReason,
			createdAt: enrollment.createdAt,
			updatedAt: enrollment.updatedAt,
			methodName: paymentMethod.name,
			courseTitle: course.name,
			courseSlug: course.slug
		})
		.from(enrollment)
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.leftJoin(paymentMethod, eq(paymentMethod.id, enrollment.paymentMethodId))
		.where(and(eq(enrollment.userId, user.id), eq(enrollment.paymentProvider, 'MANUAL')));

	const rows: PaymentRow[] = receipts
		.map(
			(row): PaymentRow => ({
				key: `manual-${row.id}`,
				courseTitle: row.courseTitle,
				courseSlug: row.courseSlug,
				status: row.status === 'ACTIVE' ? 'APPROVED' : row.status === 'REJECTED' ? 'DECLINED' : 'PENDING',
				amount: row.amount,
				currency: row.currency,
				method: row.methodName ?? 'Bank transfer',
				reference: row.reference,
				// No separate "submitted" stamp is kept: a pending row was last written by its submission.
				submittedAt: (row.status === 'PENDING' ? row.updatedAt : row.createdAt).toISOString(),
				reviewedAt: row.status === 'PENDING' ? null : (row.reviewedAt?.toISOString() ?? null),
				reason: row.status === 'REJECTED' ? row.rejectionReason : null
			})
		)
		.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

	const needle = search.toLowerCase();
	const items = rows.filter(
		(row) =>
			(status === 'ALL' || row.status === status) &&
			(!needle ||
				row.courseTitle.toLowerCase().includes(needle) ||
				(row.reference ?? '').toLowerCase().includes(needle))
	);

	return {
		items,
		total: rows.length,
		hasPending: rows.some((row) => row.status === 'PENDING'),
		filters: { status, search }
	};
};
