import { error, redirect } from '@sveltejs/kit';
import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import { attachmentDisposition, lessonFileFor } from '$lib/server/lesson-files';
import { signInHref } from '$lib/safe-redirect';
import type { RequestHandler } from './$types';

/**
 * A lesson's attached file, for those who may open the lesson (see `lessonFileFor`). Always a
 * download under its original name, never cached: access can end (a refund, a revoked
 * enrollment), and a cached copy would outlive it.
 */
export const GET: RequestHandler = async ({ params, request, locals, url }) => {
	if (!locals.user) redirect(303, signInHref(url));
	const id = Number(params.resourceId);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'File not found');

	const found = await lessonFileFor(id, {
		userId: locals.user.id,
		staff: locals.isSuperAdmin || (locals.permList ?? []).includes('courses.manage')
	});
	if (!found) error(404, 'File not found');

	// The kit streams it (and refuses a name outside the store); the headers are this route's.
	// A bare request: no conditional headers, so it is never a 304 for a file that is not cached.
	const response = streamStoredFile(found.file, new Request(request.url), 'private');
	const headers = new Headers(response.headers);
	headers.delete('ETag');
	headers.delete('Last-Modified');
	headers.set('Content-Type', found.mimeType);
	headers.set('Content-Disposition', attachmentDisposition(found.fileName));
	headers.set('Cache-Control', 'private, no-store');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
	return new Response(response.body, { status: response.status, headers });
};
