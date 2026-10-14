import { REVIEW_STATUSES } from '$lib/server/db/schema';
import { deleteReview, setReviewStatus, staffCourseAverages, staffReviews } from '$lib/server/reviews';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rows, averages] = await Promise.all([staffReviews(), staffCourseAverages()]);
	return { rows, averages };
};

export const actions: Actions = {
	/** Hides a review from the public page and the course's average, or shows it again. */
	status: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = postedId(data);
		const status = REVIEW_STATUSES.find((value) => value === data.get('status'));
		if (!id || !status) return flashFail(cookies, 'That review could not be updated.');
		if (!(await setReviewStatus(id, status))) return flashFail(cookies, 'That review no longer exists.', 404);
		return flashOk(cookies, status === 'HIDDEN' ? 'Review hidden.' : 'Review published again.');
	},

	delete: async ({ request, cookies }) => {
		const id = postedId(await request.formData());
		if (!id || !(await deleteReview(id))) return flashFail(cookies, 'That review no longer exists.', 404);
		return flashOk(cookies, 'Review deleted.');
	}
};
