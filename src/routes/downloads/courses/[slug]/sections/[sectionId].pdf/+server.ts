import { error } from '@sveltejs/kit';
import { courseScope, pdfResponse, pdfViewer, sectionPdf } from '$lib/server/course-pdfs';
import type { RequestHandler } from './$types';

/**
 * A section's workbook. Open to anyone who can see the course: what it holds depends on the
 * reader (`sectionPdf` leaves out the notes of lessons they cannot open).
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const sectionId = Number(params.sectionId);
	if (!Number.isSafeInteger(sectionId) || sectionId <= 0) error(404, 'Section not found');
	const scope = await courseScope(params.slug, pdfViewer(locals));
	if (!scope) error(404, 'Course not found');
	const pdf = await sectionPdf(scope, sectionId);
	if (!pdf) error(404, 'Section not found');
	return pdfResponse(pdf, url.searchParams.has('view'));
};
