import { saveLessonPosition } from '$lib/server/resume';
import type { RequestHandler } from './$types';

/**
 * Where the student is in a lesson's video, sent by the player as it plays and as the page is
 * left (`navigator.sendBeacon`, a urlencoded `lessonId` and `seconds`). Nobody reads the answer,
 * so anything unusable — signed out, not enrolled, not this course's lesson — is a quiet 204 too.
 */
export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return new Response(null, { status: 401 });
	let posted: FormData;
	try {
		posted = await request.formData();
	} catch {
		return new Response(null, { status: 400 });
	}
	const lessonId = Number(posted.get('lessonId'));
	if (Number.isSafeInteger(lessonId) && lessonId > 0) {
		await saveLessonPosition(locals.user.id, params.slug, lessonId, String(posted.get('seconds') ?? ''));
	}
	return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};
