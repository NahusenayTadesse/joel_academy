import { error, fail, redirect } from '@sveltejs/kit';
import { EnrollmentError, markLessonComplete } from '$lib/server/enrollment';
import { loadLearning } from '$lib/server/learning';
import { requireActionUser, requireUser } from '$lib/server/student';
import { ROUTES } from '$lib/site';
import type { Actions, PageServerLoad } from './$types';

const lessonParam = (value: string | null) => {
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const learning = await loadLearning(event.params.slug, user.id, lessonParam(event.url.searchParams.get('lesson')));
	if (!learning) error(404, 'Course not found');
	return learning;
};

export const actions: Actions = {
	complete: async (event) => {
		const user = requireActionUser(event);
		const posted = await event.request.formData();
		const lessonId = lessonParam(String(posted.get('lessonId') ?? ''));
		if (!lessonId) return fail(400, { error: 'Choose a lesson to complete.' });
		try {
			// Ownership and enrollment are checked inside, against the session's user.
			const result = await markLessonComplete(user.id, lessonId);
			// Without JavaScript the browser shows whatever this returns, so it is sent on where the
			// enhanced page would go: the certificate, or the next lesson (`next` only picks a page
			// of this course to show; access is decided when that page loads).
			if (event.request.headers.get('x-sveltekit-action') !== 'true') {
				const next = lessonParam(String(posted.get('next') ?? ''));
				redirect(
					303,
					result.certificateCode
						? ROUTES.student.certificate(result.certificateCode)
						: ROUTES.student.learn(event.params.slug, next ?? lessonId)
				);
			}
			return {
				lessonId,
				courseCompleted: result.progress.completed,
				progressPercent: result.progress.percent,
				certificateCode: result.certificateCode
			};
		} catch (err) {
			if (err instanceof EnrollmentError) return fail(403, { error: err.message });
			throw err;
		}
	}
};
