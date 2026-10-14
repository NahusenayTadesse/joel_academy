import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { enrollment, lesson, quizAttempt, quizOption, quizQuestion } from '$lib/server/db/schema';
import { markLessonComplete, type CompletionResult } from '$lib/server/enrollment';
import {
	answersFromForm,
	gradeQuiz,
	passingScoreOf,
	QUIZ_RETRY_SECONDS,
	type GradableQuestion
} from '$lib/server/quiz-grade';

/*
 * Quiz lessons. Which options are correct never leaves the server until an attempt has been
 * graded; the student's view of a quiz carries prompts and option texts only. A passing attempt
 * completes the lesson through `markLessonComplete`, which in turn refuses a quiz lesson that has
 * no passing attempt — so passing is the only way through, whichever path is taken.
 */

type Executor = Pick<typeof db, 'select'>;

/** A refusal the student can act on. */
export class QuizError extends Error {
	constructor(
		readonly code: 'LESSON_NOT_FOUND' | 'NOT_A_QUIZ' | 'NOT_ENROLLED' | 'NO_QUESTIONS' | 'TOO_SOON',
		message: string,
		/** Seconds until another attempt is accepted (TOO_SOON only). */
		readonly retryAfter = 0
	) {
		super(message);
		this.name = 'QuizError';
	}
}

/** A quiz's questions in order, each with its options in order — correct flags included. */
async function questionsOf(lessonId: number, executor: Executor = db) {
	const questions = await executor
		.select({
			id: quizQuestion.id,
			prompt: quizQuestion.prompt,
			explanation: quizQuestion.explanation,
			allowMultiple: quizQuestion.allowMultiple,
			sortOrder: quizQuestion.sortOrder
		})
		.from(quizQuestion)
		.where(eq(quizQuestion.lessonId, lessonId))
		.orderBy(asc(quizQuestion.sortOrder), asc(quizQuestion.id));
	if (questions.length === 0) return [];
	const options = await executor
		.select({
			id: quizOption.id,
			questionId: quizOption.questionId,
			text: quizOption.text,
			isCorrect: quizOption.isCorrect
		})
		.from(quizOption)
		.where(
			inArray(
				quizOption.questionId,
				questions.map((question) => question.id)
			)
		)
		.orderBy(asc(quizOption.sortOrder), asc(quizOption.id));
	return questions.map((question) => ({
		...question,
		options: options
			.filter((option) => option.questionId === question.id)
			.map(({ id, text, isCorrect }) => ({ id, text, isCorrect }))
	}));
}

/* ------------------------------------------------------------------ the student's side */

export interface QuizAttemptSummary {
	id: number;
	score: number;
	passed: boolean;
	createdAt: Date;
}

/** What the learn page shows of a quiz before it is answered: no correct flags, no explanations. */
export async function studentQuiz(userId: string, lessonId: number, passingScore: number | null) {
	const [questions, attempts] = await Promise.all([
		questionsOf(lessonId),
		db
			.select({
				id: quizAttempt.id,
				score: quizAttempt.score,
				passed: quizAttempt.passed,
				createdAt: quizAttempt.createdAt
			})
			.from(quizAttempt)
			.where(and(eq(quizAttempt.userId, userId), eq(quizAttempt.lessonId, lessonId)))
			.orderBy(desc(quizAttempt.createdAt), desc(quizAttempt.id))
			.limit(20)
	]);
	return {
		passingScore: passingScoreOf(passingScore),
		questions: questions.map((question) => ({
			id: question.id,
			prompt: question.prompt,
			allowMultiple: question.allowMultiple,
			options: question.options.map((option) => ({ id: option.id, text: option.text }))
		})),
		attempts: attempts as QuizAttemptSummary[],
		bestScore: attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null,
		passed: attempts.some((attempt) => attempt.passed)
	};
}

export type StudentQuiz = Awaited<ReturnType<typeof studentQuiz>>;

/** One graded attempt as the student sees it afterwards. */
export interface QuizOutcome {
	lessonId: number;
	score: number;
	passed: boolean;
	passingScore: number;
	correctCount: number;
	total: number;
	results: {
		questionId: number;
		correct: boolean;
		selected: number[];
		/** The right options: shown once the quiz is passed, or for a question already got right. */
		correctOptionIds: number[];
		explanation: string | null;
	}[];
	courseCompleted: boolean;
	certificateCode: string | null;
}

/**
 * Grades a submitted quiz form for an ACTIVE enrollment and records the attempt; a pass then
 * completes the lesson. One attempt per `QUIZ_RETRY_SECONDS` per quiz: the enrollment row is
 * locked while the last attempt is checked, so two quick submissions cannot both get through.
 */
export async function submitQuizAttempt(userId: string, lessonId: number, form: FormData): Promise<QuizOutcome> {
	const graded = await db.transaction(async (tx) => {
		const [target] = await tx
			.select({ id: lesson.id, courseId: lesson.courseId, lessonType: lesson.lessonType, passingScore: lesson.passingScore })
			.from(lesson)
			.where(eq(lesson.id, lessonId))
			.limit(1);
		if (!target) throw new QuizError('LESSON_NOT_FOUND', 'That lesson does not exist.');
		if (target.lessonType !== 'QUIZ') throw new QuizError('NOT_A_QUIZ', 'This lesson is not a quiz.');

		const [current] = await tx
			.select({ status: enrollment.status })
			.from(enrollment)
			.where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, target.courseId)))
			.limit(1)
			.for('update');
		if (current?.status !== 'ACTIVE') throw new QuizError('NOT_ENROLLED', 'Enroll in this course to take the quiz.');

		// Compared on the database's clock, the one that stamped `created_at`.
		const [recent] = await tx
			.select({ elapsed: sql<number>`timestampdiff(second, ${quizAttempt.createdAt}, now())` })
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.userId, userId),
					eq(quizAttempt.lessonId, lessonId),
					sql`${quizAttempt.createdAt} > now() - interval ${sql.raw(String(QUIZ_RETRY_SECONDS))} second`
				)
			)
			.orderBy(desc(quizAttempt.createdAt))
			.limit(1);
		if (recent) {
			const wait = Math.max(1, QUIZ_RETRY_SECONDS - Number(recent.elapsed));
			throw new QuizError('TOO_SOON', `Take a moment before trying again: ${wait}s.`, wait);
		}

		const questions = await questionsOf(lessonId, tx);
		if (questions.length === 0) throw new QuizError('NO_QUESTIONS', 'This quiz has no questions yet.');
		const passingScore = passingScoreOf(target.passingScore);
		const answers = answersFromForm(
			form,
			questions.map((question) => question.id)
		);
		const grade = gradeQuiz(questions as GradableQuestion[], answers, passingScore);
		await tx.insert(quizAttempt).values({ userId, lessonId, score: grade.score, passed: grade.passed, answers });
		return { grade, questions, passingScore };
	});

	const { grade, questions, passingScore } = graded;
	// After the attempt has committed, so the completion's own check finds the pass.
	let completion: CompletionResult | null = null;
	if (grade.passed) completion = await markLessonComplete(userId, lessonId);

	return {
		lessonId,
		score: grade.score,
		passed: grade.passed,
		passingScore,
		correctCount: grade.correctCount,
		total: grade.total,
		results: grade.results.map((result) => ({
			questionId: result.questionId,
			correct: result.correct,
			selected: result.selected,
			correctOptionIds: grade.passed || result.correct ? result.correctOptionIds : [],
			explanation: questions.find((question) => question.id === result.questionId)?.explanation ?? null
		})),
		courseCompleted: completion?.progress.completed ?? false,
		certificateCode: completion?.certificateCode ?? null
	};
}

/* ------------------------------------------------------------------ the dashboard's side */

/** Every question of a quiz with its options and which are correct, for the builder. */
export const editorQuestions = (lessonId: number) => questionsOf(lessonId);

/** Question counts for several lessons, for the curriculum list. */
export async function questionCounts(lessonIds: number[]): Promise<Map<number, number>> {
	if (lessonIds.length === 0) return new Map();
	const rows = await db
		.select({ lessonId: quizQuestion.lessonId, total: count() })
		.from(quizQuestion)
		.where(inArray(quizQuestion.lessonId, lessonIds))
		.groupBy(quizQuestion.lessonId);
	return new Map(rows.map((row) => [row.lessonId, row.total]));
}

export interface QuestionInput {
	prompt: string;
	explanation: string | null;
	/** Option texts in order. */
	options: string[];
	/** Indexes into `options` of the correct ones. */
	correct: number[];
}

/**
 * Adds a question, or rewrites one of this lesson's. Options are updated in place by position
 * (extra ones added, surplus removed) so past attempts' stored option ids keep pointing at the
 * same answers where they can. Returns false when the question is not this lesson's.
 */
export async function saveQuestion(lessonId: number, input: QuestionInput, questionId?: number): Promise<boolean> {
	const correct = new Set(input.correct);
	const values = {
		prompt: input.prompt,
		explanation: input.explanation?.trim() ? input.explanation.trim() : null,
		allowMultiple: correct.size > 1
	};
	return db.transaction(async (tx) => {
		let id = questionId;
		if (id) {
			const [result] = await tx
				.update(quizQuestion)
				.set(values)
				.where(and(eq(quizQuestion.id, id), eq(quizQuestion.lessonId, lessonId)));
			if (!result.affectedRows) {
				// No change also reports 0 rows on MariaDB; make sure it is really not ours.
				const [own] = await tx
					.select({ id: quizQuestion.id })
					.from(quizQuestion)
					.where(and(eq(quizQuestion.id, id), eq(quizQuestion.lessonId, lessonId)));
				if (!own) return false;
			}
		} else {
			const [last] = await tx
				.select({ sortOrder: quizQuestion.sortOrder })
				.from(quizQuestion)
				.where(eq(quizQuestion.lessonId, lessonId))
				.orderBy(desc(quizQuestion.sortOrder))
				.limit(1);
			[{ id }] = await tx
				.insert(quizQuestion)
				.values({ ...values, lessonId, sortOrder: last ? last.sortOrder + 1 : 0 })
				.$returningId();
		}

		const existing = await tx
			.select({ id: quizOption.id })
			.from(quizOption)
			.where(eq(quizOption.questionId, id!))
			.orderBy(asc(quizOption.sortOrder), asc(quizOption.id));
		for (const [index, text] of input.options.entries()) {
			const option = { text, isCorrect: correct.has(index), sortOrder: index };
			if (existing[index]) await tx.update(quizOption).set(option).where(eq(quizOption.id, existing[index].id));
			else await tx.insert(quizOption).values({ ...option, questionId: id! });
		}
		const surplus = existing.slice(input.options.length).map((option) => option.id);
		if (surplus.length) await tx.delete(quizOption).where(inArray(quizOption.id, surplus));
		return true;
	});
}

/**
 * Deletes one of this lesson's questions. A quiz keeps at least one: the last question goes only
 * once the lesson is no longer a quiz, or another question has been added.
 */
export async function deleteQuestion(lessonId: number, questionId: number): Promise<'DELETED' | 'GONE' | 'LAST'> {
	return db.transaction(async (tx) => {
		const [target] = await tx
			.select({ lessonType: lesson.lessonType })
			.from(lesson)
			.where(eq(lesson.id, lessonId))
			.for('update');
		const questions = await tx
			.select({ id: quizQuestion.id })
			.from(quizQuestion)
			.where(eq(quizQuestion.lessonId, lessonId));
		if (!questions.some((question) => question.id === questionId)) return 'GONE';
		if (target?.lessonType === 'QUIZ' && questions.length === 1) return 'LAST';
		await tx.delete(quizQuestion).where(eq(quizQuestion.id, questionId));
		return 'DELETED';
	});
}

/** Swaps a question with its neighbour, renumbering the quiz 0..n. False when it is not this lesson's. */
export async function moveQuestion(lessonId: number, questionId: number, direction: 'up' | 'down') {
	return db.transaction(async (tx) => {
		const siblings = await tx
			.select({ id: quizQuestion.id })
			.from(quizQuestion)
			.where(eq(quizQuestion.lessonId, lessonId))
			.orderBy(asc(quizQuestion.sortOrder), asc(quizQuestion.id));
		const index = siblings.findIndex((row) => row.id === questionId);
		if (index < 0) return false;
		const target = direction === 'up' ? index - 1 : index + 1;
		if (target < 0 || target >= siblings.length) return true;
		[siblings[index], siblings[target]] = [siblings[target], siblings[index]];
		await Promise.all(
			siblings.map((row, position) =>
				tx.update(quizQuestion).set({ sortOrder: position }).where(eq(quizQuestion.id, row.id))
			)
		);
		return true;
	});
}

/** Stores the pass mark; null puts the default back. */
export async function setPassingScore(lessonId: number, passingScore: number | null) {
	await db.update(lesson).set({ passingScore }).where(eq(lesson.id, lessonId));
}
