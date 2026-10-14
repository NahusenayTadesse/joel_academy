/*
 * Quiz grading, kept free of the database so it can be tested on its own. A question is right only
 * when the options picked are exactly its correct ones: no partial credit, so picking every box on
 * a multiple-answer question earns nothing.
 */

/** The pass mark when a quiz lesson has none set. */
export const DEFAULT_PASSING_SCORE = 70;
/** How long a student waits between attempts at the same quiz. */
export const QUIZ_RETRY_SECONDS = 30;

export interface GradableQuestion {
	id: number;
	options: { id: number; isCorrect: boolean }[];
}

/** `{ [questionId]: optionId[] }`, as stored on the attempt. */
export type QuizAnswers = Record<number, number[]>;

export interface QuestionResult {
	questionId: number;
	correct: boolean;
	selected: number[];
	correctOptionIds: number[];
}

export interface QuizGrade {
	/** 0-100, rounded down so the score shown never overstates and passing compares that same number. */
	score: number;
	passed: boolean;
	correctCount: number;
	total: number;
	results: QuestionResult[];
}

/** The lesson's pass mark, or the default; anything stored out of range is pulled back to 1-100. */
export function passingScoreOf(value: number | null | undefined): number {
	if (value === null || value === undefined || !Number.isFinite(value)) return DEFAULT_PASSING_SCORE;
	return Math.min(100, Math.max(1, Math.round(value)));
}

export function gradeQuiz(
	questions: readonly GradableQuestion[],
	answers: QuizAnswers,
	passingScore: number
): QuizGrade {
	const results = questions.map((question) => {
		const known = new Set(question.options.map((option) => option.id));
		const selected = [...new Set(answers[question.id] ?? [])].filter((id) => known.has(id));
		const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
		const correct =
			correctOptionIds.length > 0 &&
			selected.length === correctOptionIds.length &&
			correctOptionIds.every((id) => selected.includes(id));
		return { questionId: question.id, correct, selected, correctOptionIds };
	});
	const total = questions.length;
	const correctCount = results.filter((result) => result.correct).length;
	// Integer arithmetic, so 7 of 10 is exactly 70 rather than 70.00000000000001.
	const score = total === 0 ? 0 : Math.floor((correctCount * 100) / total);
	return { score, passed: total > 0 && score >= passingScoreOf(passingScore), correctCount, total, results };
}

/**
 * The answers in a posted quiz form: each question's inputs are named `q-<questionId>` and carry
 * option ids. Only the quiz's own questions are read; anything else posted is ignored.
 */
export function answersFromForm(form: FormData, questionIds: readonly number[]): QuizAnswers {
	const answers: QuizAnswers = {};
	for (const id of questionIds) {
		const picked = form
			.getAll(`q-${id}`)
			.map((value) => Number(value))
			.filter((value) => Number.isSafeInteger(value) && value > 0);
		answers[id] = [...new Set(picked)];
	}
	return answers;
}
