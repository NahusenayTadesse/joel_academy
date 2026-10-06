import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate, course } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/student';
import { ROUTES } from '$lib/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	// Only the holder sees this page; anyone else gets the same 404 as a code that does not exist.
	const [row] = await db
		.select({ certificate, courseSlug: course.slug })
		.from(certificate)
		.leftJoin(course, eq(course.id, certificate.courseId))
		.where(and(eq(certificate.code, event.params.code.toUpperCase()), eq(certificate.userId, user.id)))
		.limit(1);
	if (!row) error(404, 'Certificate not found');
	const { certificate: found } = row;

	return {
		certificate: {
			code: found.code,
			token: found.token,
			recipientName: found.recipientName,
			courseTitle: found.courseTitle,
			instructorName: found.instructorName,
			issuedAt: found.issuedAt.toISOString(),
			status: found.revokedAt ? ('REVOKED' as const) : ('ISSUED' as const),
			revokedReason: found.revokedReason,
			courseSlug: row.courseSlug
		},
		verificationUrl: new URL(ROUTES.certificates.verify(found.token), event.url.origin).href
	};
};
