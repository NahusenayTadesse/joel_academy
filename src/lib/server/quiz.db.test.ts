import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * Quiz gating against a real database: a quiz lesson completes only by passing, attempts are rate
 * limited, and the certificate waits for the pass. Runs only when DATABASE_URL names a database
 * ending in `_test`; it builds its own course and student and removes them afterwards.
 */

const url = process.env.DATABASE_URL ?? '';
const enabled = /\/[a-z0-9_]+_test(\?|$)/i.test(url);

const sent = vi.hoisted(() => ({ certificates: [] as unknown[] }));
vi.mock('$lib/server/email', () => ({
	enrollmentConfirmedEmail: vi.fn(async () => 'SKIPPED'),
	certificateIssuedEmail: vi.fn(async (details: unknown) => {
		sent.certificates.push(details);
		return 'SKIPPED';
	})
}));

describe.skipIf(!enabled)('quiz gating against the test database', () => {
	const stamp = Date.now().toString(36);
	const userId = `quiz-${stamp}`;
	const outsiderId = `quiz-out-${stamp}`;
	let mod: {
		db: typeof import('./db').db;
		schema: typeof import('./db/schema');
		enrollment: typeof import('./enrollment');
		quiz: typeof import('./quiz');
		orm: typeof import('drizzle-orm');
	};
	let courseId = 0;
	let textLessonId = 0;
	let quizLessonId = 0;
	/** questionId → [correct option id, wrong option id] */
	const options = new Map<number, [number, number]>();

	const answerForm = (right: boolean) => {
		const form = new FormData();
		for (const [questionId, [correct, wrong]] of options) form.append(`q-${questionId}`, String(right ? correct : wrong));
		return form;
	};

	beforeAll(async () => {
		mod = {
			db: (await import('./db')).db,
			schema: await import('./db/schema'),
			enrollment: await import('./enrollment'),
			quiz: await import('./quiz'),
			orm: await import('drizzle-orm')
		};
		const { db, schema, orm } = mod;
		const [[{ name }]] = (await db.execute(orm.sql`select database() as name`)) as unknown as [[{ name: string }]];
		if (!name.endsWith('_test')) throw new Error(`Refusing to run against ${name}`);

		[{ id: courseId }] = await db
			.insert(schema.course)
			.values({
				name: `Quiz gating ${stamp}`,
				slug: `quiz-gating-${stamp}`,
				description: 'Fixture',
				accessType: 'FREE',
				certificateEnabled: true,
				status: true
			})
			.$returningId();
		const [{ id: sectionId }] = await db.insert(schema.courseSection).values({ courseId, title: 'Only' }).$returningId();
		[{ id: textLessonId }] = await db
			.insert(schema.lesson)
			.values({ sectionId, courseId, title: 'Read', lessonType: 'TEXT', sortOrder: 0 })
			.$returningId();
		[{ id: quizLessonId }] = await db
			.insert(schema.lesson)
			.values({ sectionId, courseId, title: 'Check', lessonType: 'QUIZ', passingScore: 100, sortOrder: 1 })
			.$returningId();
		for (const prompt of ['One?', 'Two?']) {
			await mod.quiz.saveQuestion(quizLessonId, { prompt, explanation: 'Because.', options: ['Yes', 'No'], correct: [0] });
		}
		const saved = await mod.quiz.editorQuestions(quizLessonId);
		for (const question of saved) options.set(question.id, [question.options[0].id, question.options[1].id]);

		await db.insert(schema.user).values([
			{ id: userId, name: 'Quiz Student', email: `${userId}@quiz.test` },
			{ id: outsiderId, name: 'Quiz Outsider', email: `${outsiderId}@quiz.test` }
		]);
		await db
			.insert(schema.enrollment)
			.values({ userId, courseId, status: 'ACTIVE', amount: '0.00', currency: 'ETB', paymentProvider: 'FREE' });
	});

	afterAll(async () => {
		if (!mod) return;
		const { db, schema, orm } = mod;
		await db.delete(schema.user).where(orm.inArray(schema.user.id, [userId, outsiderId]));
		if (courseId) await db.delete(schema.course).where(orm.eq(schema.course.id, courseId));
	});

	it('sends no correct flags with the student view', async () => {
		const view = await mod.quiz.studentQuiz(userId, quizLessonId, 100);
		expect(view.questions).toHaveLength(2);
		expect(JSON.stringify(view)).not.toMatch(/isCorrect|explanation/);
	});

	it('refuses to complete a quiz lesson that has not been passed', async () => {
		await expect(mod.enrollment.markLessonComplete(userId, quizLessonId)).rejects.toMatchObject({ code: 'QUIZ_NOT_PASSED' });
		const result = await mod.enrollment.markLessonComplete(userId, textLessonId);
		expect(result).toMatchObject({ certificateCode: null, progress: { completed: false } });
	});

	it('records a failing attempt without completing anything', async () => {
		const outcome = await mod.quiz.submitQuizAttempt(userId, quizLessonId, answerForm(false));
		expect(outcome).toMatchObject({ score: 0, passed: false, certificateCode: null });
		// Failed: explanations come back, the right answers do not.
		expect(outcome.results.every((item) => item.correctOptionIds.length === 0 && item.explanation === 'Because.')).toBe(true);
		const done = await mod.enrollment.completedLessonIds(userId, courseId);
		expect(done.has(quizLessonId)).toBe(false);
	});

	it('rate-limits attempts at the same quiz', async () => {
		await expect(mod.quiz.submitQuizAttempt(userId, quizLessonId, answerForm(true))).rejects.toMatchObject({
			code: 'TOO_SOON'
		});
	});

	it('completes the lesson and issues the certificate on a pass', async () => {
		const { db, schema, orm } = mod;
		// Age the earlier attempt past the wait rather than sleeping through it.
		await db
			.update(schema.quizAttempt)
			.set({ createdAt: orm.sql`now() - interval 1 minute` })
			.where(orm.eq(schema.quizAttempt.userId, userId));
		sent.certificates.length = 0;
		const outcome = await mod.quiz.submitQuizAttempt(userId, quizLessonId, answerForm(true));
		expect(outcome).toMatchObject({ score: 100, passed: true, courseCompleted: true });
		expect(outcome.certificateCode).toBeTruthy();
		expect(sent.certificates).toHaveLength(1);
		// Passing again later is harmless, and the completion path now accepts the lesson.
		await expect(mod.enrollment.markLessonComplete(userId, quizLessonId)).resolves.toMatchObject({
			progress: { completed: true }
		});
	});

	it('does not grade a student who is not enrolled', async () => {
		await expect(mod.quiz.submitQuizAttempt(outsiderId, quizLessonId, answerForm(true))).rejects.toMatchObject({
			code: 'NOT_ENROLLED'
		});
	});

	it('keeps a quiz from losing its last question', async () => {
		const [first, second] = [...options.keys()];
		expect(await mod.quiz.deleteQuestion(quizLessonId, first)).toBe('DELETED');
		expect(await mod.quiz.deleteQuestion(quizLessonId, second)).toBe('LAST');
		expect(await mod.quiz.deleteQuestion(textLessonId, second)).toBe('GONE');
	});
});
