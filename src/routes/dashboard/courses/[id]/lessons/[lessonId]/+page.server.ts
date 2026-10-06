import { error, redirect } from '@sveltejs/kit';
import { and, asc, count, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setFlash } from 'sveltekit-flash-message/server';
import { db } from '$lib/server/db';
import { courseSection, lesson, lessonProgress, lessonResource } from '$lib/server/db/schema';
import { courseFromParam, lessonOf, nextOrder, sectionOf } from '$lib/server/dashboard/curriculum';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { formatDuration } from '../../../../form-fields';
import { lessonColumns } from '../../lessons.server';
import { lessonEditSchema, resourceEditSchema, resourceSchema } from '../../schema';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function scope({ params }: Pick<RequestEvent, 'params'>) {
	const course = await courseFromParam(params.id);
	const found = await lessonOf(course.id, Number(params.lessonId));
	if (!found) error(404, 'Lesson not found');
	return { course, lesson: found };
}

export const load: PageServerLoad = async (event) => {
	const { course, lesson: row } = await scope(event);

	const [sections, resources, [completions], form, resourceAddForm, resourceEditForm] =
		await Promise.all([
			db
				.select({ value: courseSection.id, name: courseSection.title })
				.from(courseSection)
				.where(eq(courseSection.courseId, course.id))
				.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
			db
				.select()
				.from(lessonResource)
				.where(eq(lessonResource.lessonId, row.id))
				.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id)),
			db.select({ total: count() }).from(lessonProgress).where(eq(lessonProgress.lessonId, row.id)),
			superValidate(
				{
					id: row.id,
					sectionId: row.sectionId,
					title: row.title,
					lessonType: row.lessonType,
					duration: formatDuration(row.durationSeconds),
					isPreview: row.isPreview,
					isMandatory: row.isMandatory,
					videoUrl: row.videoUrl ?? '',
					externalUrl: row.externalUrl ?? '',
					content: row.content ?? ''
				},
				zod4(lessonEditSchema),
				{ errors: false }
			),
			superValidate(zod4(resourceSchema)),
			superValidate(zod4(resourceEditSchema))
		]);

	return {
		course,
		lesson: { id: row.id, title: row.title, sectionId: row.sectionId },
		sections,
		resources,
		completions: completions.total,
		form,
		resourceAddForm,
		resourceEditForm
	};
};

export const actions: Actions = {
	save: async (event) => {
		const { course, lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(lessonEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (!(await sectionOf(course.id, form.data.sectionId))) {
			return message(
				form,
				{ type: 'error', text: 'Pick a section of this course.' },
				{ status: 400 }
			);
		}

		const values = lessonColumns(form.data) as Partial<typeof lesson.$inferInsert>;
		// Moved to another section: it goes to the end there rather than colliding with its order.
		if (form.data.sectionId !== row.sectionId) {
			const siblings = await db
				.select({ sortOrder: lesson.sortOrder })
				.from(lesson)
				.where(eq(lesson.sectionId, form.data.sectionId));
			values.sortOrder = nextOrder(siblings);
		}
		await db.update(lesson).set(values).where(eq(lesson.id, row.id));
		// Echo back what was stored, so the editor shows the body as students will see it.
		form.data.content = values.content ?? '';
		return message(form, { type: 'success', text: 'Lesson saved.' });
	},

	delete: async (event) => {
		const { course, lesson: row } = await scope(event);
		await db.delete(lesson).where(eq(lesson.id, row.id));
		setFlash({ type: 'success', message: `Deleted “${row.title}”.` }, event.cookies);
		redirect(303, `/dashboard/courses/${course.id}`);
	},

	addResource: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(resourceSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		await db.insert(lessonResource).values({ ...form.data, lessonId: row.id });
		return message(form, { type: 'success', text: 'Resource added.' });
	},

	editResource: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(resourceEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		const { id, ...values } = form.data;
		// Scoped to this lesson, so a resource id from another lesson matches nothing.
		const [result] = await db
			.update(lessonResource)
			.set(values)
			.where(and(eq(lessonResource.id, id), eq(lessonResource.lessonId, row.id)));
		return result.affectedRows
			? message(form, { type: 'success', text: 'Resource saved.' })
			: message(form, { type: 'error', text: 'That resource is gone.' }, { status: 404 });
	},

	deleteResource: async (event) => {
		const { lesson: row } = await scope(event);
		const id = postedId(await event.request.formData());
		const [result] = await db
			.delete(lessonResource)
			.where(and(eq(lessonResource.id, id), eq(lessonResource.lessonId, row.id)));
		return result.affectedRows
			? flashOk(event.cookies, 'Resource deleted.')
			: flashFail(event.cookies, 'That resource is gone.', 404);
	}
};
