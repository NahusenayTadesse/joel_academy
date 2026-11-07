import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { course, courseHandout, courseSection, lesson, lessonResource } from '$lib/server/db/schema';

/** The course a curriculum URL names, or a 404. */
export async function courseFromParam(param: string) {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Course not found');
	const [row] = await db
		.select({
			id: course.id,
			name: course.name,
			slug: course.slug,
			status: course.status,
			accessType: course.accessType
		})
		.from(course)
		.where(eq(course.id, id));
	if (!row) error(404, 'Course not found');
	return row;
}

/** A section of this course, or null — a posted section id from another course matches nothing. */
export async function sectionOf(courseId: number, sectionId: number) {
	const [row] = await db
		.select({ id: courseSection.id })
		.from(courseSection)
		.where(and(eq(courseSection.id, sectionId), eq(courseSection.courseId, courseId)));
	return row ?? null;
}

/** A lesson of this course, or null. */
export async function lessonOf(courseId: number, lessonId: number) {
	const [row] = await db
		.select()
		.from(lesson)
		.where(and(eq(lesson.id, lessonId), eq(lesson.courseId, courseId)));
	return row ?? null;
}

type Direction = 'up' | 'down';

/**
 * Swaps a row with its neighbour and renumbers the siblings 0..n, so orders typed by hand (or all
 * left at 0) become a clean sequence the first time anything is moved.
 */
async function move<T extends { id: number }>(
	siblings: T[],
	id: number,
	direction: Direction,
	write: (id: number, sortOrder: number) => Promise<unknown>
) {
	const index = siblings.findIndex((row) => row.id === id);
	if (index < 0) return false;
	const target = direction === 'up' ? index - 1 : index + 1;
	if (target < 0 || target >= siblings.length) return true;
	const ordered = [...siblings];
	[ordered[index], ordered[target]] = [ordered[target], ordered[index]];
	await Promise.all(ordered.map((row, position) => write(row.id, position)));
	return true;
}

export async function moveSection(courseId: number, id: number, direction: Direction) {
	return db.transaction(async (tx) => {
		const siblings = await tx
			.select({ id: courseSection.id })
			.from(courseSection)
			.where(eq(courseSection.courseId, courseId))
			.orderBy(asc(courseSection.sortOrder), asc(courseSection.id));
		return move(siblings, id, direction, (rowId, sortOrder) =>
			tx.update(courseSection).set({ sortOrder }).where(eq(courseSection.id, rowId))
		);
	});
}

export async function moveLesson(courseId: number, id: number, direction: Direction) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ sectionId: lesson.sectionId })
			.from(lesson)
			.where(and(eq(lesson.id, id), eq(lesson.courseId, courseId)));
		if (!current) return false;
		const siblings = await tx
			.select({ id: lesson.id })
			.from(lesson)
			.where(eq(lesson.sectionId, current.sectionId))
			.orderBy(asc(lesson.sortOrder), asc(lesson.id));
		return move(siblings, id, direction, (rowId, sortOrder) =>
			tx.update(lesson).set({ sortOrder }).where(eq(lesson.id, rowId))
		);
	});
}

export async function moveResource(lessonId: number, id: number, direction: Direction) {
	return db.transaction(async (tx) => {
		const siblings = await tx
			.select({ id: lessonResource.id })
			.from(lessonResource)
			.where(eq(lessonResource.lessonId, lessonId))
			.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id));
		return move(siblings, id, direction, (rowId, sortOrder) =>
			tx.update(lessonResource).set({ sortOrder }).where(eq(lessonResource.id, rowId))
		);
	});
}

export async function moveHandout(courseId: number, id: number, direction: Direction) {
	return db.transaction(async (tx) => {
		const siblings = await tx
			.select({ id: courseHandout.id })
			.from(courseHandout)
			.where(eq(courseHandout.courseId, courseId))
			.orderBy(asc(courseHandout.sortOrder), asc(courseHandout.id));
		return move(siblings, id, direction, (rowId, sortOrder) =>
			tx.update(courseHandout).set({ sortOrder }).where(eq(courseHandout.id, rowId))
		);
	});
}

/** A handout of this course, or null. */
export async function handoutOf(courseId: number, handoutId: number) {
	const [row] = await db
		.select()
		.from(courseHandout)
		.where(and(eq(courseHandout.id, handoutId), eq(courseHandout.courseId, courseId)));
	return row ?? null;
}

/** The next free position at the end of a list, so a new row lands last rather than first. */
export function nextOrder(rows: { sortOrder: number }[]) {
	return rows.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);
}
