import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { course, enrollment, lesson, lessonPosition } from '$lib/server/db/schema';

/*
 * Picking up where a student left off: which lesson a course opens on, and where in its video.
 *
 * The saved position comes from the browser, so it is only ever a convenience — it decides where
 * the player starts, never whether a lesson counts as complete (that is `markLessonComplete`).
 */

/** No video lesson runs longer than this; anything beyond it is not a position. */
const MAX_POSITION_SECONDS = 24 * 60 * 60;
/** Positions this close to the start are not worth offering to resume from. */
export const RESUME_MIN_SECONDS = 5;

type Candidate = { id: number; locked: boolean; completed: boolean };

/**
 * The lesson a course opens on: the one asked for in `?lesson=`, else the last one the student
 * opened (while it is still theirs to open), else the first lesson not yet done, else the first
 * open one, else the first at all (which then shows as locked).
 */
export function pickActiveLesson<T extends Candidate>(
	lessons: readonly T[],
	{ requested, last }: { requested: number | null; last: number | null | undefined }
): T | null {
	const asked = requested === null ? undefined : lessons.find((item) => item.id === requested);
	if (asked) return asked;
	const previous = last ? lessons.find((item) => item.id === last && !item.locked) : undefined;
	return (
		previous ??
		lessons.find((item) => !item.locked && !item.completed) ??
		lessons.find((item) => !item.locked) ??
		lessons[0] ??
		null
	);
}

/**
 * A position posted by the player, as whole seconds, or `null` when it is not a number at all.
 * The lesson's typed-in duration is not a cap: it is staff's rounding, not the video's length
 * (the player itself starts over when a saved position is at or past the end).
 */
export function clampPosition(value: unknown): number | null {
	const seconds = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
	return Math.min(Math.max(0, Math.floor(seconds)), MAX_POSITION_SECONDS);
}

/** Where a lesson's video resumes, from what was saved: from the start when barely begun. */
export function resumeSeconds(saved: number | null | undefined): number {
	const clamped = clampPosition(saved ?? 0) ?? 0;
	return clamped < RESUME_MIN_SECONDS ? 0 : clamped;
}

/*
 * `enrollment.updatedAt` stamps payment and review changes (the payments page shows it), so the
 * activity columns below are written without moving it.
 */
const keepUpdatedAt = { updatedAt: sql`${enrollment.updatedAt}` } as unknown as { updatedAt: Date };

/** Records that an ACTIVE student opened a lesson: it is where the course resumes next time. */
export async function touchLesson(enrollmentId: number, lessonId: number) {
	await db
		.update(enrollment)
		.set({ lastLessonId: lessonId, lastActivityAt: new Date(), ...keepUpdatedAt })
		.where(and(eq(enrollment.id, enrollmentId), eq(enrollment.status, 'ACTIVE')));
}

/** The saved playback position of one lesson, in seconds (0 when none). */
export async function savedPosition(userId: string, lessonId: number): Promise<number> {
	const [row] = await db
		.select({ seconds: lessonPosition.positionSeconds })
		.from(lessonPosition)
		.where(and(eq(lessonPosition.userId, userId), eq(lessonPosition.lessonId, lessonId)))
		.limit(1);
	return row?.seconds ?? 0;
}

/**
 * Saves where the student is in a lesson's video. Only for a lesson of the course named by `slug`
 * and only while the student's own enrollment there is ACTIVE; anything else is quietly ignored,
 * since a beacon has no one to tell.
 */
export async function saveLessonPosition(
	userId: string,
	slug: string,
	lessonId: number,
	posted: unknown
): Promise<'SAVED' | 'IGNORED'> {
	const [target] = await db
		.select({ enrollmentId: enrollment.id })
		.from(lesson)
		.innerJoin(course, eq(course.id, lesson.courseId))
		.innerJoin(
			enrollment,
			and(eq(enrollment.courseId, course.id), eq(enrollment.userId, userId), eq(enrollment.status, 'ACTIVE'))
		)
		.where(and(eq(lesson.id, lessonId), eq(course.slug, slug)))
		.limit(1);
	if (!target) return 'IGNORED';
	const seconds = clampPosition(posted);
	if (seconds === null) return 'IGNORED';

	await db
		.insert(lessonPosition)
		.values({ userId, lessonId, positionSeconds: seconds })
		.onDuplicateKeyUpdate({ set: { positionSeconds: seconds, updatedAt: new Date() } });
	await db
		.update(enrollment)
		.set({ lastLessonId: lessonId, lastActivityAt: new Date(), ...keepUpdatedAt })
		.where(eq(enrollment.id, target.enrollmentId));
	return 'SAVED';
}
