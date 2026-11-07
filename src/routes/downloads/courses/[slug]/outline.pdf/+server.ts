import { error } from '@sveltejs/kit';
import { courseOutlinePdf, courseScope, pdfResponse, pdfViewer } from '$lib/server/course-pdfs';
import type { RequestHandler } from './$types';

/** The course outline, for anyone who can see the course; `?view` opens it in the browser. */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const scope = await courseScope(params.slug, pdfViewer(locals));
	if (!scope) error(404, 'Course not found');
	return pdfResponse(await courseOutlinePdf(scope), url.searchParams.has('view'));
};
