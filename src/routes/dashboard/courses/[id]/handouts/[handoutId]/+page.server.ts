import { error, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setFlash } from 'sveltekit-flash-message/server';
import { db } from '$lib/server/db';
import { courseHandout, courseSection } from '$lib/server/db/schema';
import { courseFromParam, handoutOf, sectionOf } from '$lib/server/dashboard/curriculum';
import { sanitizeLessonHtml } from '$lib/server/dashboard/sanitize';
import { blankToNull } from '$lib/server/dashboard/values';
import { handoutEditSchema } from '../schema';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function scope({ params }: Pick<RequestEvent, 'params'>) {
	const course = await courseFromParam(params.id);
	const found = await handoutOf(course.id, Number(params.handoutId));
	if (!found) error(404, 'Handout not found');
	return { course, handout: found };
}

export const load: PageServerLoad = async (event) => {
	const { course, handout } = await scope(event);
	const [sections, form] = await Promise.all([
		db
			.select({ value: courseSection.id, name: courseSection.title })
			.from(courseSection)
			.where(eq(courseSection.courseId, course.id))
			.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		superValidate(
			{
				id: handout.id,
				title: handout.title,
				summary: handout.summary ?? '',
				sectionId: handout.sectionId,
				style: handout.style,
				audience: handout.audience,
				published: handout.published,
				content: handout.content ?? ''
			},
			zod4(handoutEditSchema),
			{ errors: false }
		)
	]);
	return {
		course,
		handout: { id: handout.id, title: handout.title, published: handout.published, updatedAt: handout.updatedAt },
		sections: sections.map((section, index) => ({ ...section, name: `${index + 1}. ${section.name}` })),
		form
	};
};

export const actions: Actions = {
	save: async (event) => {
		const { course, handout } = await scope(event);
		const form = await superValidate(event.request, zod4(handoutEditSchema));
		if (!form.valid) return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (form.data.sectionId && !(await sectionOf(course.id, form.data.sectionId))) {
			return message(form, { type: 'error', text: 'Pick a section of this course.' }, { status: 400 });
		}

		const { id: _id, content, ...rest } = form.data;
		void _id;
		const values = {
			...(blankToNull({ ...rest }, ['summary']) as typeof rest),
			content: sanitizeLessonHtml(content)
		};
		await db.update(courseHandout).set(values).where(eq(courseHandout.id, handout.id));
		// Echo back what was stored, so the editor shows the body as it prints.
		form.data.content = values.content ?? '';
		return message(form, {
			type: 'success',
			text: values.published ? 'Handout saved. Students get this version from now on.' : 'Draft saved.'
		});
	},

	delete: async (event) => {
		const { course, handout } = await scope(event);
		await db.delete(courseHandout).where(eq(courseHandout.id, handout.id));
		setFlash({ type: 'success', message: `Deleted “${handout.title}”.` }, event.cookies);
		redirect(303, `/dashboard/courses/${course.id}/handouts`);
	}
};
