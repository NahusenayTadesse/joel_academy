import { error, redirect } from '@sveltejs/kit';
import { handoutPdf, pdfResponse, pdfViewer } from '$lib/server/course-pdfs';
import { signInHref } from '$lib/safe-redirect';
import type { RequestHandler } from './$types';

/**
 * A handout. A students-only one sends a visitor to sign in, and a signed-in reader without an
 * active enrollment to the course page, where they can enroll.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const id = Number(params.handoutId);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Handout not found');
	const result = await handoutPdf(id, pdfViewer(locals));
	switch (result.status) {
		case 'missing':
			error(404, 'Handout not found');
		case 'sign-in':
			redirect(303, signInHref(url));
		case 'forbidden':
			redirect(303, `/courses/${encodeURIComponent(result.courseSlug)}`);
		case 'ok':
			return pdfResponse(result.pdf, url.searchParams.has('view'));
	}
};
