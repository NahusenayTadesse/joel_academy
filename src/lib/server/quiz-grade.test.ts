import { describe, expect, it } from 'vitest';
import { answersFromForm, DEFAULT_PASSING_SCORE, gradeQuiz, passingScoreOf, type GradableQuestion } from './quiz-grade';

const single = (id: number, correct: number, ...others: number[]): GradableQuestion => ({
	id,
	options: [{ id: correct, isCorrect: true }, ...others.map((other) => ({ id: other, isCorrect: false }))]
});

const multiple: GradableQuestion = {
	id: 2,
	options: [
		{ id: 21, isCorrect: true },
		{ id: 22, isCorrect: true },
		{ id: 23, isCorrect: false }
	]
};

describe('gradeQuiz', () => {
	it('marks a single-answer question right only for its correct option', () => {
		const quiz = [single(1, 11, 12, 13)];
		expect(gradeQuiz(quiz, { 1: [11] }, 70)).toMatchObject({ score: 100, passed: true, correctCount: 1 });
		expect(gradeQuiz(quiz, { 1: [12] }, 70)).toMatchObject({ score: 0, passed: false });
		// Ticking several on a single-answer question is not hedging into a pass.
		expect(gradeQuiz(quiz, { 1: [11, 12] }, 70).results[0].correct).toBe(false);
	});

	it('requires exactly the correct options on a multiple-answer question', () => {
		const grade = (picked: number[]) => gradeQuiz([multiple], { 2: picked }, 70).results[0].correct;
		expect(grade([21, 22])).toBe(true);
		expect(grade([22, 21])).toBe(true);
		expect(grade([21])).toBe(false);
		expect(grade([21, 22, 23])).toBe(false);
		expect(grade([21, 21, 22])).toBe(true);
	});

	it('counts missing and foreign answers as wrong', () => {
		const quiz = [single(1, 11, 12), multiple];
		const result = gradeQuiz(quiz, { 1: [21] }, 50);
		expect(result.results.map((item) => item.correct)).toEqual([false, false]);
		expect(result.results[0].selected).toEqual([]);
		expect(result).toMatchObject({ score: 0, passed: false, total: 2 });
	});

	it('rounds the score down, to a whole percent', () => {
		const quiz = [single(1, 11, 12), single(2, 21, 22), single(3, 31, 32)];
		expect(gradeQuiz(quiz, { 1: [11] }, 70).score).toBe(33);
		expect(gradeQuiz(quiz, { 1: [11], 2: [21] }, 70).score).toBe(66);
		const ten = Array.from({ length: 10 }, (_, index) => single(index + 1, (index + 1) * 10, (index + 1) * 10 + 1));
		const seven = Object.fromEntries(ten.slice(0, 7).map((question) => [question.id, [question.options[0].id]]));
		expect(gradeQuiz(ten, seven, 70)).toMatchObject({ score: 70, passed: true });
	});

	it('passes at the threshold and not below it', () => {
		const quiz = [single(1, 11, 12), single(2, 21, 22), single(3, 31, 32)];
		const twoOfThree = { 1: [11], 2: [21] };
		expect(gradeQuiz(quiz, twoOfThree, 66).passed).toBe(true);
		// 2/3 is 66.67%: rounding down means a 67% pass mark is not met.
		expect(gradeQuiz(quiz, twoOfThree, 67).passed).toBe(false);
		expect(gradeQuiz(quiz, { 1: [11], 2: [21], 3: [31] }, 100).passed).toBe(true);
	});

	it('never passes an empty quiz', () => {
		expect(gradeQuiz([], {}, 1)).toMatchObject({ score: 0, passed: false, total: 0 });
	});

	it('never counts a question with no correct option as right', () => {
		const broken: GradableQuestion = { id: 9, options: [{ id: 91, isCorrect: false }] };
		expect(gradeQuiz([broken], { 9: [] }, 1).results[0].correct).toBe(false);
	});
});

describe('passingScoreOf', () => {
	it('defaults to 70 and clamps to 1-100', () => {
		expect(passingScoreOf(null)).toBe(DEFAULT_PASSING_SCORE);
		expect(passingScoreOf(undefined)).toBe(70);
		expect(passingScoreOf(85)).toBe(85);
		expect(passingScoreOf(0)).toBe(1);
		expect(passingScoreOf(150)).toBe(100);
	});
});

describe('answersFromForm', () => {
	it('reads each question’s picks and ignores everything else', () => {
		const form = new FormData();
		form.append('q-1', '11');
		form.append('q-2', '21');
		form.append('q-2', '22');
		form.append('q-2', '22');
		form.append('q-2', 'nonsense');
		form.append('q-3', '31');
		form.append('lessonId', '5');
		expect(answersFromForm(form, [1, 2, 4])).toEqual({ 1: [11], 2: [21, 22], 4: [] });
	});
});
