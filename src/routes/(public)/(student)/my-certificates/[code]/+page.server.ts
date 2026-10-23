import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate, course } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/student';
import { verificationQrPath } from '$lib/server/certificate-pdf';
import { siteUrl } from '$lib/server/email/notify';
import { delocalizePath } from '$lib/i18n';
import { m } from '$lib/paraglide/messages';
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
	if (!row) error(404, m.learn_certificate_not_found());
	const { certificate: found } = row;
	// The configured site address, as in the emails and the PDF, so all three show the same link
	// (without a language prefix: the PDF's QR code is the same in every language).
	const verificationUrl = siteUrl(delocalizePath(ROUTES.certificates.verify(found.token)));

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
		verificationUrl,
		qr: found.revokedAt ? null : verificationQrPath(verificationUrl),
		pdfHref: found.revokedAt ? null : `${ROUTES.student.certificate(found.code)}/pdf`
	};
};
