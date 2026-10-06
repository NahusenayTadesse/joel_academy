import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { certificate, course, enrollment, user } from '$lib/server/db/schema';
import { issueCertificate } from '$lib/server/certificates';
import { certificateIssuedEmail, certificateRevokedEmail } from '$lib/server/email';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { issueSchema, revokeSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

/** Active enrolments with no certificate yet: the only ones a certificate can be issued for. */
function eligible() {
	return db
		.select({
			value: enrollment.id,
			student: user.name,
			email: user.email,
			course: course.name,
			certificateEnabled: course.certificateEnabled
		})
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.leftJoin(
			certificate,
			and(eq(certificate.userId, enrollment.userId), eq(certificate.courseId, enrollment.courseId))
		)
		.where(and(eq(enrollment.status, 'ACTIVE'), isNull(certificate.id)))
		.orderBy(user.name, course.name);
}

export const load: PageServerLoad = async () => {
	const [rows, candidates, revokeForm, issueForm] = await Promise.all([
		db
			.select({
				id: certificate.id,
				code: certificate.code,
				token: certificate.token,
				recipientName: certificate.recipientName,
				email: user.email,
				courseTitle: certificate.courseTitle,
				courseId: certificate.courseId,
				issuedAt: certificate.issuedAt,
				revokedAt: certificate.revokedAt,
				revokedReason: certificate.revokedReason
			})
			.from(certificate)
			.leftJoin(user, eq(user.id, certificate.userId))
			.orderBy(desc(certificate.issuedAt), desc(certificate.id)),
		eligible(),
		superValidate(zod4(revokeSchema)),
		superValidate(zod4(issueSchema))
	]);

	return {
		rows,
		candidates: candidates.map((row) => ({
			value: row.value,
			name: `${row.student} (${row.email}) — ${row.course}${row.certificateEnabled ? '' : ' [certificates off]'}`
		})),
		revokeForm,
		issueForm
	};
};

export const actions: Actions = {
	issue: async ({ request }) => {
		const form = await superValidate(request, zod4(issueSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });

		const [found] = await db
			.select({
				userId: enrollment.userId,
				courseId: enrollment.courseId,
				status: enrollment.status,
				certificateEnabled: course.certificateEnabled,
				email: user.email,
				existing: certificate.code
			})
			.from(enrollment)
			.innerJoin(course, eq(course.id, enrollment.courseId))
			.innerJoin(user, eq(user.id, enrollment.userId))
			.leftJoin(
				certificate,
				and(eq(certificate.userId, enrollment.userId), eq(certificate.courseId, enrollment.courseId))
			)
			.where(eq(enrollment.id, form.data.enrollmentId));

		const refuse = (text: string) => {
			setError(form, 'enrollmentId', text);
			return message(form, { type: 'error', text }, { status: 400 });
		};
		if (!found || found.status !== 'ACTIVE') return refuse('That enrolment is not active.');
		if (!found.certificateEnabled) {
			return refuse('This course does not issue certificates. Turn them on in the course first.');
		}
		// issueCertificate would hand back the existing one; saying so avoids a second congratulations.
		if (found.existing) return refuse(`This student already has certificate ${found.existing}.`);

		const issued = await issueCertificate({
			userId: found.userId,
			courseId: found.courseId
		});
		void certificateIssuedEmail({
			to: found.email,
			name: issued.recipientName,
			courseTitle: issued.courseTitle,
			code: issued.code,
			token: issued.token
		});
		return message(form, { type: 'success', text: `Issued ${issued.code}.` });
	},

	revoke: async ({ request }) => {
		const form = await superValidate(request, zod4(revokeSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Give a reason.' }, { status: 400 });
		const [result] = await db
			.update(certificate)
			.set({ revokedAt: new Date(), revokedReason: form.data.reason })
			.where(and(eq(certificate.id, form.data.id), isNull(certificate.revokedAt)));
		if (result.affectedRows) {
			const [revoked] = await db
				.select({ email: user.email, name: user.name, courseTitle: certificate.courseTitle, code: certificate.code })
				.from(certificate)
				.innerJoin(user, eq(user.id, certificate.userId))
				.where(eq(certificate.id, form.data.id));
			if (revoked) {
				void certificateRevokedEmail({
					to: revoked.email,
					name: revoked.name,
					courseTitle: revoked.courseTitle,
					code: revoked.code,
					reason: form.data.reason
				});
			}
		}
		return result.affectedRows
			? message(form, {
					type: 'success',
					text: 'Revoked. Verification now shows it as revoked.'
				})
			: message(form, { type: 'error', text: 'Already revoked.' }, { status: 409 });
	},

	restore: async ({ request, cookies }) => {
		const id = postedId(await request.formData());
		const [result] = await db
			.update(certificate)
			.set({ revokedAt: null, revokedReason: null })
			.where(and(eq(certificate.id, id), isNotNull(certificate.revokedAt)));
		return result.affectedRows
			? flashOk(cookies, 'Restored. The certificate verifies as valid again.')
			: flashFail(cookies, 'That certificate is not revoked.');
	}
};
