import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * Lesson files and resume against a real database: who gets a resource's bytes from
 * `/lesson-files/[resourceId]`, and where a course reopens. Runs only when DATABASE_URL names a
 * database ending in `_test`; it writes (and then removes) its own users, enrollment, resource and
 * stored file.
 */

const url = process.env.DATABASE_URL ?? '';
const enabled = /\/[a-z0-9_]+_test(\?|$)/i.test(url);

vi.mock('$lib/server/email', () => ({
	enrollmentConfirmedEmail: vi.fn(async () => 'SKIPPED'),
	certificateIssuedEmail: vi.fn(async () => 'SKIPPED')
}));

describe.skipIf(!enabled)('lesson files and resume against the test database', () => {
	const stamp = Date.now();
	const enrolledId = `resume-in-${stamp}`;
	const outsiderId = `resume-out-${stamp}`;
	const pendingId = `resume-pending-${stamp}`;
	const storedName = `${crypto.randomUUID()}.pdf`;
	const bytes = Buffer.from(`%PDF-1.7\n% lesson file test ${stamp}\n`);
	let mod: {
		db: typeof import('./db').db;
		schema: typeof import('./db/schema');
		orm: typeof import('drizzle-orm');
		files: typeof import('@nahu/admin-kit/server/files');
		route: typeof import('../../routes/lesson-files/[resourceId]/+server');
		resume: typeof import('./resume');
		learning: typeof import('./learning');
	};
	let target: { courseId: number; slug: string; lessons: number[]; members: number };
	let resourceId = 0;

	beforeAll(async () => {
		mod = {
			db: (await import('./db')).db,
			schema: await import('./db/schema'),
			orm: await import('drizzle-orm'),
			files: await import('@nahu/admin-kit/server/files'),
			route: await import('../../routes/lesson-files/[resourceId]/+server'),
			resume: await import('./resume'),
			learning: await import('./learning')
		};
		const { db, schema, orm, files } = mod;
		const [[{ name }]] = (await db.execute(orm.sql`select database() as name`)) as unknown as [[{ name: string }]];
		if (!name.endsWith('_test')) throw new Error(`Refusing to run against ${name}`);

		// A published course with at least three lessons, one of them for members only.
		const courses = await db
			.select({ id: schema.course.id, slug: schema.course.slug })
			.from(schema.course)
			.where(orm.eq(schema.course.status, true))
			.orderBy(schema.course.id);
		for (const candidate of courses) {
			const lessons = await db
				.select({ id: schema.lesson.id, isPreview: schema.lesson.isPreview })
				.from(schema.lesson)
				.innerJoin(schema.courseSection, orm.eq(schema.courseSection.id, schema.lesson.sectionId))
				.where(orm.eq(schema.lesson.courseId, candidate.id))
				.orderBy(schema.courseSection.sortOrder, schema.courseSection.id, schema.lesson.sortOrder, schema.lesson.id);
			const members = lessons.find((item) => !item.isPreview);
			if (lessons.length >= 3 && members) {
				target = { courseId: candidate.id, slug: candidate.slug, lessons: lessons.map((item) => item.id), members: members.id };
				break;
			}
		}
		if (!target) throw new Error('The test database needs a published course with three lessons, not all previews');

		await db.insert(schema.user).values([
			{ id: enrolledId, name: 'Resume Enrolled', email: `in-${stamp}@resume.test` },
			{ id: outsiderId, name: 'Resume Outsider', email: `out-${stamp}@resume.test` },
			{ id: pendingId, name: 'Resume Pending', email: `pending-${stamp}@resume.test` }
		]);
		const base = { courseId: target.courseId, amount: '0.00', currency: 'ETB', paymentProvider: 'FREE' as const };
		await db.insert(schema.enrollment).values([
			{ ...base, userId: enrolledId, status: 'ACTIVE' },
			{ ...base, userId: pendingId, status: 'PENDING', paymentProvider: 'MANUAL' }
		]);

		fs.writeFileSync(path.join(files.FILES_DIR, storedName), bytes);
		const [inserted] = await db.insert(schema.lessonResource).values({
			lessonId: target.members,
			title: 'Resume test handout',
			file: storedName,
			fileName: 'Handout – week 1.pdf',
			fileSize: bytes.length,
			mimeType: 'application/pdf'
		});
		resourceId = inserted.insertId;
	});

	afterAll(async () => {
		if (!mod) return;
		const { db, schema, orm, files } = mod;
		if (resourceId) await db.delete(schema.lessonResource).where(orm.eq(schema.lessonResource.id, resourceId));
		await db.delete(schema.user).where(orm.inArray(schema.user.id, [enrolledId, outsiderId, pendingId]));
		fs.rmSync(path.join(files.FILES_DIR, storedName), { force: true });
	});

	const download = (userId: string | null) =>
		mod.route.GET({
			params: { resourceId: String(resourceId) },
			request: new Request(`http://localhost/lesson-files/${resourceId}`),
			url: new URL(`http://localhost/lesson-files/${resourceId}`),
			locals: { user: userId ? { id: userId } : undefined, isSuperAdmin: false, permList: [] }
		} as unknown as Parameters<typeof mod.route.GET>[0]);

	const refusal = async (userId: string | null) => {
		try {
			await download(userId);
		} catch (thrown) {
			return thrown as { status: number; location?: string };
		}
		throw new Error('Expected the download to be refused');
	};

	it('refuses a student who is not enrolled, or not yet approved, with a 404', async () => {
		expect((await refusal(outsiderId)).status).toBe(404);
		expect((await refusal(pendingId)).status).toBe(404);
	});

	it('sends someone signed out to sign in', async () => {
		const answer = await refusal(null);
		expect(answer.status).toBe(303);
		expect(answer.location).toMatch(/^\/login\?/);
	});

	it('gives an enrolled student the bytes, as a private download under the original name', async () => {
		const response = await download(enrolledId);
		expect(response.status).toBe(200);
		expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		const disposition = response.headers.get('content-disposition') ?? '';
		expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent('Handout – week 1.pdf')}`);
		expect(disposition).not.toContain(storedName);
		expect(response.headers.get('etag')).toBeNull();
	});

	it('lets staff download it without an enrollment', async () => {
		const response = await mod.route.GET({
			params: { resourceId: String(resourceId) },
			request: new Request('http://localhost/'),
			url: new URL('http://localhost/'),
			locals: { user: { id: outsiderId }, isSuperAdmin: false, permList: ['dashboard.view', 'courses.manage'] }
		} as unknown as Parameters<typeof mod.route.GET>[0]);
		expect(response.status).toBe(200);
		await response.body?.cancel();
	});

	it('lists the file on the learning page by its route and name, never its stored name', async () => {
		const learning = await mod.learning.loadLearning(target.slug, enrolledId, target.members);
		const listed = learning?.lessonContent?.resources.find((item) => item.id === resourceId);
		expect(listed?.file).toEqual({ href: `/lesson-files/${resourceId}`, name: 'Handout – week 1.pdf', size: bytes.length });
		expect(JSON.stringify(learning)).not.toContain(storedName);
	});

	it('reopens the course at the last lesson opened, at the saved position', async () => {
		const { resume, learning, db, schema, orm } = mod;
		const third = target.lessons[2];
		// Opening a lesson makes it the one the course resumes at.
		await learning.loadLearning(target.slug, enrolledId, third);
		const reopened = await learning.loadLearning(target.slug, enrolledId, null);
		expect(reopened?.activeLessonId).toBe(third);

		expect(await resume.saveLessonPosition(enrolledId, target.slug, third, '272.6')).toBe('SAVED');
		expect((await learning.loadLearning(target.slug, enrolledId, null))?.lessonContent?.resumeAt).toBe(272);
		// Someone without an ACTIVE enrollment, or another course's slug, saves nothing.
		expect(await resume.saveLessonPosition(outsiderId, target.slug, third, '50')).toBe('IGNORED');
		expect(await resume.saveLessonPosition(pendingId, target.slug, third, '50')).toBe('IGNORED');
		expect(await resume.saveLessonPosition(enrolledId, 'no-such-course', third, '50')).toBe('IGNORED');
		const rows = await db
			.select()
			.from(schema.lessonPosition)
			.where(orm.inArray(schema.lessonPosition.userId, [outsiderId, pendingId]));
		expect(rows).toHaveLength(0);
		const [row] = await db
			.select({ lastLessonId: schema.enrollment.lastLessonId, lastActivityAt: schema.enrollment.lastActivityAt })
			.from(schema.enrollment)
			.where(orm.eq(schema.enrollment.userId, enrolledId));
		expect(row.lastLessonId).toBe(third);
		expect(row.lastActivityAt).toBeInstanceOf(Date);
	});
});
