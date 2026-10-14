/*
 * The quiz as the learn page receives it (`studentQuiz` in `$lib/server/quiz`) and one graded
 * attempt (`QuizOutcome`). Restated here so browser code never imports a server module.
 */

export interface QuizView {
	passingScore: number;
	questions: {
		id: number;
		prompt: string;
		allowMultiple: boolean;
		options: { id: number; text: string }[];
	}[];
	attempts: { id: number; score: number; passed: boolean; createdAt: Date }[];
	bestScore: number | null;
	passed: boolean;
}

export interface QuizResult {
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
		correctOptionIds: number[];
		explanation: string | null;
	}[];
	courseCompleted: boolean;
	certificateCode: string | null;
}
