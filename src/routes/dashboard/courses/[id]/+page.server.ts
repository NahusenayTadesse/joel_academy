import { asc, count, eq, inArray } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { courseSection, lesson, lessonProgress, lessonResource } from '$lib/server/db/schema';
import {
	courseFromParam,
	lessonOf,
	moveLesson,
	moveSection,
	nextOrder,
	sectionOf
} from '$lib/server/dashboard/curriculum';
import { blankToNull, flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { questionCounts } from '$lib/server/quiz';
import { lessonColumns } from './lessons.server';
import { lessonSchema, moveSchema, sectionEditSchema, sectionSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const course = await courseFromParam(params.id);

	const [sections, lessons, sectionForm, sectionEditForm, lessonForm] = await Promise.all([
		db
			.select()
			.from(courseSection)
			.where(eq(courseSection.courseId, course.id))
			.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		db
			.select({
				id: lesson.id,
				sectionId: lesson.sectionId,
				title: lesson.title,
				lessonType: lesson.lessonType,
				durationSeconds: lesson.durationSeconds,
				isPreview: lesson.isPreview,
				isMandatory: lesson.isMandatory,
				videoUrl: lesson.videoUrl,
				externalUrl: lesson.externalUrl,
				sortOrder: lesson.sortOrder
			})
			.from(lesson)
			.where(eq(lesson.courseId, course.id))
			.orderBy(asc(lesson.sortOrder), asc(lesson.id)),
		superValidate(zod4(sectionSchema)),
		superValidate(zod4(sectionEditSchema)),
		superValidate(zod4(lessonSchema))
	]);

	const lessonIds = lessons.map((row) => row.id);
	const [resources, progress] = lessonIds.length
		? await Promise.all([
				db
					.select({ lessonId: lessonResource.lessonId, total: count() })
					.from(lessonResource)
					.where(inArray(lessonResource.lessonId, lessonIds))
					.groupBy(lessonResource.lessonId),
				db
					.select({ lessonId: lessonProgress.lessonId, total: count() })
					.from(lessonProgress)
					.where(inArray(lessonProgress.lessonId, lessonIds))
					.groupBy(lessonProgress.lessonId)
			])
		: [[], []];
	const questionCount = await questionCounts(
		lessons.filter((row) => row.lessonType === 'QUIZ').map((row) => row.id)
	);
	const resourceCount = new Map(resources.map((row) => [row.lessonId, row.total]));
	const progressCount = new Map(progress.map((row) => [row.lessonId, row.total]));

	return {
		course,
		sections: sections.map((section) => ({
			...section,
			lessons: lessons
				.filter((row) => row.sectionId === section.id)
				.map((row) => ({
					...row,
					resources: resourceCount.get(row.id) ?? 0,
					questions: questionCount.get(row.id) ?? 0,
					completions: progressCount.get(row.id) ?? 0
				}))
		})),
		sectionForm,
		sectionEditForm,
		lessonForm
	};
};

export const actions: Actions = {
	addSection: async ({ request, params }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(sectionSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });

		const siblings = await db
			.select({ sortOrder: courseSection.sortOrder })
			.from(courseSection)
			.where(eq(courseSection.courseId, course.id));
		await db.insert(courseSection).values({
			...(blankToNull({ ...form.data }, ['description']) as typeof form.data),
			courseId: course.id,
			sortOrder: nextOrder(siblings)
		});
		return message(form, { type: 'success', text: 'Section added.' });
	},

	editSection: async ({ request, params }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(sectionEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (!(await sectionOf(course.id, form.data.id))) {
			return message(form, { type: 'error', text: 'That section is gone.' }, { status: 404 });
		}

		const { id, ...values } = form.data;
		await db
			.update(courseSection)
			.set(blankToNull(values, ['description']) as typeof values)
			.where(eq(courseSection.id, id));
		return message(form, { type: 'success', text: 'Section saved.' });
	},

	moveSection: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(moveSchema));
		if (!form.valid) return flashFail(cookies, 'Nothing to move.');
		const moved = await moveSection(course.id, form.data.id, form.data.direction);
		return moved ? { ok: true } : flashFail(cookies, 'That section is gone.', 404);
	},

	/** Its lessons, their resources and every student's progress on them go with it (FK cascade). */
	deleteSection: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const id = postedId(await request.formData());
		if (!id || !(await sectionOf(course.id, id)))
			return flashFail(cookies, 'That section is gone.', 404);
		await db.delete(courseSection).where(eq(courseSection.id, id));
		return flashOk(cookies, 'Section deleted.');
	},

	addLesson: async ({ request, params }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(lessonSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (!(await sectionOf(course.id, form.data.sectionId))) {
			return message(
				form,
				{ type: 'error', text: 'Pick a section of this course.' },
				{ status: 400 }
			);
		}

		const siblings = await db
			.select({ sortOrder: lesson.sortOrder })
			.from(lesson)
			.where(eq(lesson.sectionId, form.data.sectionId));
		await db.insert(lesson).values({
			...(lessonColumns(form.data) as typeof lesson.$inferInsert),
			courseId: course.id,
			sortOrder: nextOrder(siblings)
		});
		return message(form, { type: 'success', text: 'Lesson added.' });
	},

	moveLesson: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(moveSchema));
		if (!form.valid) return flashFail(cookies, 'Nothing to move.');
		const moved = await moveLesson(course.id, form.data.id, form.data.direction);
		return moved ? { ok: true } : flashFail(cookies, 'That lesson is gone.', 404);
	},

	/** Students' progress rows and the lesson's resources go with it (FK cascade). */
	deleteLesson: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const id = postedId(await request.formData());
		if (!id || !(await lessonOf(course.id, id)))
			return flashFail(cookies, 'That lesson is gone.', 404);
		await db.delete(lesson).where(eq(lesson.id, id));
		return flashOk(cookies, 'Lesson deleted.');
	}
};
