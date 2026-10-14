import { error, redirect } from '@sveltejs/kit';
import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate } from '$lib/server/db/schema';
import { certificatePdf } from '$lib/server/certificate-pdf';
import { siteUrl } from '$lib/server/email/notify';
import { signInHref } from '$lib/safe-redirect';
import { ROUTES, siteConfig } from '$lib/site';
import type { RequestHandler } from './$types';

/**
 * The certificate as a PDF, for its holder (and staff who manage certificates). Anyone else gets
 * the same 404 as a code that does not exist; a revoked certificate is not handed out at all.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, signInHref(url));
	const staff = locals.isSuperAdmin || (locals.permList ?? []).includes('academy.manage');
	const code = params.code.toUpperCase();
	const mine: SQL[] = staff ? [] : [eq(certificate.userId, locals.user.id)];

	const [found] = await db
		.select()
		.from(certificate)
		.where(and(eq(certificate.code, code), ...mine))
		.limit(1);
	if (!found) error(404, 'Certificate not found');
	if (found.revokedAt) error(410, 'This certificate has been revoked');

	const bytes = await certificatePdf({
		academyName: siteConfig.name,
		recipientName: found.recipientName,
		courseTitle: found.courseTitle,
		code: found.code,
		issuedAt: found.issuedAt,
		verificationUrl: siteUrl(ROUTES.certificates.verify(found.token))
	});

	return new Response(bytes as Uint8Array<ArrayBuffer>, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Length': String(bytes.byteLength),
			'Content-Disposition': `attachment; filename="certificate-${found.code}.pdf"`,
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
