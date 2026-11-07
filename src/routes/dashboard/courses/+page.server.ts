import { count, eq } from 'drizzle-orm';
import { contentCrud } from '@nahu/admin-kit/server/crud';
import { requireSuperAdmin } from '@nahu/admin-kit/server/permissions';
import { db } from '$lib/server/db';
import {
	category,
	certificate,
	course,
	courseSection,
	enrollment,
	instructor,
	lesson
} from '$lib/server/db/schema';
import { categoryOptions, instructorOptions } from '$lib/server/dashboard/options';
import {
	blankToNull,
	flashFail,
	flashOk,
	nullToBlank,
	postedId
} from '$lib/server/dashboard/values';
import { mediaUrl } from '$lib/media';
import { money, slugify } from '../form-fields';
import { addSchema, editSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

const crud = contentCrud({
	table: course,
	label: 'Course',
	addSchema,
	editSchema,
	uniqueField: 'slug',
	fileFields: ['thumbnail'],
	references: [
		{
			field: 'categoryId',
			table: category,
			as: 'category',
			options: categoryOptions,
			optionsKey: 'categoryList'
		},
		{
			field: 'instructorId',
			table: instructor,
			as: 'instructor',
			options: instructorOptions,
			optionsKey: 'instructorList'
		}
	],
	transform: (values, _event, before) => {
		if (!values.slug) values.slug = slugify(String(values.name));
		values.currency = String(values.currency ?? 'ETB').toUpperCase();
		// A free course has no price; leaving an old one behind would show on the site as a discount.
		if (values.accessType === 'FREE') {
			values.price = '0.00';
			values.discountPrice = null;
		} else {
			values.price = money(values.price);
			values.discountPrice = money(values.discountPrice);
		}
		nullToBlank(values, ['subtitle', 'shortDescription']);
		blankToNull(values, ['outcomes', 'requirements', 'tags', 'introVideoUrl']);
		// The first publish dates the course; republishing after a pause keeps that date.
		if (values.status && !before?.publishedAt) values.publishedAt = new Date();
		return values;
	}
});

export const load: PageServerLoad = async () => {
	const [data, sections, lessons] = await Promise.all([
		crud.load(),
		db
			.select({ courseId: courseSection.courseId, total: count() })
			.from(courseSection)
			.groupBy(courseSection.courseId),
		db.select({ courseId: lesson.courseId, total: count() }).from(lesson).groupBy(lesson.courseId)
	]);
	const sectionCount = new Map(sections.map((row) => [row.courseId, row.total]));
	const lessonCount = new Map(lessons.map((row) => [row.courseId, row.total]));

	return {
		...data,
		rows: data.rows.map((row) => ({
			...row,
			// Decimal columns arrive as strings; the edit dialog's number inputs want numbers.
			price: Number(row.price),
			discountPrice: row.discountPrice === null ? null : Number(row.discountPrice),
			// Seeded rows hold a /static path the kit's file preview cannot serve; see the page.
			thumbnailUrl: mediaUrl(row.thumbnail),
			sections: sectionCount.get(row.id) ?? 0,
			lessons: lessonCount.get(row.id) ?? 0
		}))
	};
};

export const actions: Actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	/**
	 * Only a course nobody has enrolled in or been certified for can go: the cascade would take
	 * students' places and certificates with it. Anything else is unpublished instead.
	 */
	delete: async ({ request, locals, cookies }) => {
		requireSuperAdmin(locals);
		const id = postedId(await request.formData());
		if (!id) return flashFail(cookies, 'No course selected.');

		const [[found], [enrolled], [issued]] = await Promise.all([
			db.select({ name: course.name }).from(course).where(eq(course.id, id)),
			db.select({ total: count() }).from(enrollment).where(eq(enrollment.courseId, id)),
			db.select({ total: count() }).from(certificate).where(eq(certificate.courseId, id))
		]);
		if (!found) return flashFail(cookies, 'That course no longer exists.', 404);
		if (enrolled.total || issued.total) {
			return flashFail(
				cookies,
				`"${found.name}" has ${enrolled.total} enrolment(s) and ${issued.total} certificate(s). Unpublish it instead.`
			);
		}

		await db.delete(course).where(eq(course.id, id));
		return flashOk(cookies, `Deleted "${found.name}" and its curriculum.`);
	}
};
