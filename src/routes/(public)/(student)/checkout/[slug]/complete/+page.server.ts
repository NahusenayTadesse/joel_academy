import { error } from '@sveltejs/kit';
import { TX_REF_PATTERN } from '$lib/server/chapa';
import { settleChapaPayment } from '$lib/server/chapa-settlement';
import { getCourse } from '$lib/server/public-catalog';
import { requireUser } from '$lib/server/student';
import type { PageServerLoad } from './$types';

/*
 * Where Chapa sends the student back. The redirect itself proves nothing: this settles through the
 * same verify-backed `settleChapaPayment` as the webhook — which cannot reach a development machine,
 * so here it is the path that settles there — and reports what is actually true.
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const found = await getCourse(event.params.slug);
	if (!found) error(404, 'Course not found');

	const txRef = event.url.searchParams.get('tx_ref') ?? event.url.searchParams.get('trx_ref') ?? '';
	if (!TX_REF_PATTERN.test(txRef)) error(404, 'Payment not found');

	const outcome = await settleChapaPayment(txRef);
	// Only the student who started the payment may see it, and only under its own course.
	if (!outcome.payment || outcome.payment.userId !== user.id || outcome.payment.courseId !== Number(found.id))
		error(404, 'Payment not found');

	const payment = outcome.payment;
	return {
		course: {
			slug: found.slug,
			title: found.title,
			presenterName: found.presenterName,
			thumbnailUrl: found.thumbnailUrl,
			categoryName: found.categoryName,
			categorySlug: found.categorySlug
		},
		state: outcome.status,
		reason: outcome.status === 'paid' ? null : outcome.reason,
		payment: {
			txRef: payment.txRef,
			amount: payment.amount,
			currency: payment.currency,
			discountAmount: payment.discountAmount,
			reference: payment.chapaReference,
			createdAt: payment.createdAt.toISOString(),
			verifiedAt: payment.verifiedAt?.toISOString() ?? null
		}
	};
};
