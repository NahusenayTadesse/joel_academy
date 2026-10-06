import { randomBytes } from 'node:crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate, course, instructor, user } from '$lib/server/db/schema';
import type { CertificateVerification } from '$lib/components/info/certificate-verification';

type Executor = Pick<typeof db, 'select' | 'insert'>;

/**
 * Issues the certificate for a completed course, or returns the one already issued — a student
 * finishing the last lesson twice must not get two numbers. Pass a transaction to make issuing
 * part of a larger write.
 *
 * Codes run per year (JTA-2026-000123). The unique index settles the rare race between two issues
 * in the same instant: the loser retries with the next number.
 */
export async function issueCertificate(
	{ userId, courseId }: { userId: string; courseId: number },
	executor: Executor = db
): Promise<typeof certificate.$inferSelect> {
	const [existing] = await executor
		.select()
		.from(certificate)
		.where(and(eq(certificate.userId, userId), eq(certificate.courseId, courseId)));
	if (existing) return existing;

	const [details] = await executor
		.select({ recipientName: user.name, courseTitle: course.name, instructorName: instructor.name })
		.from(course)
		.innerJoin(user, eq(user.id, userId))
		.leftJoin(instructor, eq(instructor.id, course.instructorId))
		.where(eq(course.id, courseId));
	if (!details) throw new Error(`Cannot issue a certificate: course ${courseId} or user not found`);

	const year = new Date().getFullYear();
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const [{ issued }] = await executor
			.select({ issued: sql<number>`count(*)` })
			.from(certificate)
			.where(sql`${certificate.code} like ${`JTA-${year}-%`}`);
		const code = `JTA-${year}-${String(Number(issued) + 1 + attempt).padStart(6, '0')}`;
		try {
			await executor.insert(certificate).values({
				code,
				token: randomBytes(24).toString('base64url'),
				userId,
				courseId,
				recipientName: details.recipientName,
				courseTitle: details.courseTitle,
				instructorName: details.instructorName
			});
			const [created] = await executor.select().from(certificate).where(eq(certificate.code, code));
			return created;
		} catch (error) {
			const duplicate = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
			if (duplicate !== 'ER_DUP_ENTRY') throw error;
			// Same user and course issued concurrently: return that one.
			const [raced] = await executor
				.select()
				.from(certificate)
				.where(and(eq(certificate.userId, userId), eq(certificate.courseId, courseId)));
			if (raced) return raced;
		}
	}
	throw new Error('Could not allocate a certificate code');
}

const dateOnly = (value: Date) => value.toISOString();

/** Looks a certificate up by its printed code or its verification token. */
export async function verifyCertificate(identifier: string): Promise<CertificateVerification> {
	const value = identifier.trim();
	if (!value) return { state: 'INVALID' };
	const [row] = await db
		.select()
		.from(certificate)
		.where(or(eq(certificate.code, value.toUpperCase()), eq(certificate.token, value)))
		.limit(1);
	if (!row) return { state: 'INVALID' };
	return {
		state: row.revokedAt ? 'REVOKED' : 'VALID',
		certificateNumber: row.code,
		studentName: row.recipientName,
		courseTitle: row.courseTitle,
		completionDate: dateOnly(row.issuedAt),
		issuedAt: dateOnly(row.issuedAt)
	};
}
