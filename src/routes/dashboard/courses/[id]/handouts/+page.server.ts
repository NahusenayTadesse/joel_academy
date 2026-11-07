import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { courseHandout, courseSection } from '$lib/server/db/schema';
import { courseFromParam, handoutOf, moveHandout, nextOrder, sectionOf } from '$lib/server/dashboard/curriculum';
import { blankToNull, flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { moveSchema } from '../schema';
import { handoutSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const course = await courseFromParam(params.id);
	const [sections, handouts, form] = await Promise.all([
		db
			.select({ value: courseSection.id, name: courseSection.title })
			.from(courseSection)
			.where(eq(courseSection.courseId, course.id))
			.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		db
			.select({
				id: courseHandout.id,
				title: courseHandout.title,
				sectionId: courseHandout.sectionId,
				style: courseHandout.style,
				audience: courseHandout.audience,
				published: courseHandout.published,
				updatedAt: courseHandout.updatedAt
			})
			.from(courseHandout)
			.where(eq(courseHandout.courseId, course.id))
			.orderBy(asc(courseHandout.sortOrder), asc(courseHandout.id)),
		superValidate(zod4(handoutSchema))
	]);
	return {
		course,
		// Numbered as the curriculum numbers them, for the picker and the table.
		sections: sections.map((section, index) => ({ ...section, name: `${index + 1}. ${section.name}` })),
		handouts,
		form
	};
};

export const actions: Actions = {
	/** Starts a handout as a draft, then opens its editor for the body. */
	add: async ({ request, params }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(handoutSchema));
		if (!form.valid) return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (form.data.sectionId && !(await sectionOf(course.id, form.data.sectionId))) {
			return message(form, { type: 'error', text: 'Pick a section of this course.' }, { status: 400 });
		}

		const siblings = await db
			.select({ sortOrder: courseHandout.sortOrder })
			.from(courseHandout)
			.where(eq(courseHandout.courseId, course.id));
		const [created] = await db
			.insert(courseHandout)
			.values({
				...(blankToNull({ ...form.data }, ['summary']) as typeof form.data),
				courseId: course.id,
				sortOrder: nextOrder(siblings)
			})
			.$returningId();
		redirect(303, `/dashboard/courses/${course.id}/handouts/${created.id}`);
	},

	move: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const form = await superValidate(request, zod4(moveSchema));
		if (!form.valid) return flashFail(cookies, 'Nothing to move.');
		const moved = await moveHandout(course.id, form.data.id, form.data.direction);
		return moved ? { ok: true } : flashFail(cookies, 'That handout is gone.', 404);
	},

	delete: async ({ request, params, cookies }) => {
		const course = await courseFromParam(params.id);
		const id = postedId(await request.formData());
		const found = id ? await handoutOf(course.id, id) : null;
		if (!found) return flashFail(cookies, 'That handout is gone.', 404);
		await db.delete(courseHandout).where(eq(courseHandout.id, id));
		return flashOk(cookies, `Deleted “${found.title}”.`);
	}
};
