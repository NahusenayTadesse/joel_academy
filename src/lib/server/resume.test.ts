import { describe, expect, it, vi } from 'vitest';

// Only the pure parts are under test; the module's database imports are stubbed.
vi.mock('$lib/server/db', () => ({ db: {} }));

const { clampPosition, pickActiveLesson, resumeSeconds } = await import('./resume');

const lessons = [
	{ id: 1, locked: false, completed: true },
	{ id: 2, locked: false, completed: true },
	{ id: 3, locked: false, completed: false },
	{ id: 4, locked: true, completed: false }
];

describe('pickActiveLesson', () => {
	it('opens the lesson asked for, whatever was last opened', () => {
		expect(pickActiveLesson(lessons, { requested: 2, last: 3 })?.id).toBe(2);
		// Even a locked one: the page then shows why it is shut.
		expect(pickActiveLesson(lessons, { requested: 4, last: 3 })?.id).toBe(4);
	});

	it('resumes at the last lesson opened, even one already completed', () => {
		expect(pickActiveLesson(lessons, { requested: null, last: 1 })?.id).toBe(1);
	});

	it('falls back to the first incomplete lesson without a last lesson', () => {
		expect(pickActiveLesson(lessons, { requested: null, last: null })?.id).toBe(3);
		expect(pickActiveLesson(lessons, { requested: null, last: undefined })?.id).toBe(3);
	});

	it('ignores a last lesson that is no longer open or no longer in the course', () => {
		expect(pickActiveLesson(lessons, { requested: null, last: 4 })?.id).toBe(3);
		expect(pickActiveLesson(lessons, { requested: null, last: 99 })?.id).toBe(3);
		// An unknown `?lesson=` is treated as no request.
		expect(pickActiveLesson(lessons, { requested: 99, last: 2 })?.id).toBe(2);
	});

	it('opens the first open lesson when all are done, and the first at all when none is open', () => {
		const done = lessons.slice(0, 2);
		expect(pickActiveLesson(done, { requested: null, last: null })?.id).toBe(1);
		const shut = [{ id: 7, locked: true, completed: false }];
		expect(pickActiveLesson(shut, { requested: null, last: 7 })?.id).toBe(7);
		expect(pickActiveLesson([], { requested: null, last: null })).toBeNull();
	});
});

describe('clampPosition', () => {
	it('keeps whole, non-negative seconds', () => {
		expect(clampPosition(272.9)).toBe(272);
		expect(clampPosition('61')).toBe(61);
		expect(clampPosition(-5)).toBe(0);
		expect(clampPosition(0)).toBe(0);
	});

	it('caps at a day and refuses what is not a number', () => {
		expect(clampPosition(10 ** 9)).toBe(86_400);
		expect(clampPosition('abc')).toBeNull();
		expect(clampPosition('')).toBeNull();
		expect(clampPosition(Number.NaN)).toBeNull();
		expect(clampPosition(Infinity)).toBeNull();
		expect(clampPosition(null)).toBeNull();
		expect(clampPosition({})).toBeNull();
	});
});

describe('resumeSeconds', () => {
	it('starts from the top when barely begun', () => {
		expect(resumeSeconds(0)).toBe(0);
		expect(resumeSeconds(4)).toBe(0);
		expect(resumeSeconds(null)).toBe(0);
	});

	it('resumes at the saved second otherwise', () => {
		expect(resumeSeconds(5)).toBe(5);
		expect(resumeSeconds(272.4)).toBe(272);
	});
});
