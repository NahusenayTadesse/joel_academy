import { count, isNotNull } from 'drizzle-orm';
import { contentCrud } from '@nahu/admin-kit/server/crud';
import { lookupDeleteAction } from '@nahu/admin-kit/server/lookupDelete';
import { db } from '$lib/server/db';
import { category, course } from '$lib/server/db/schema';
import { blankToNull } from '$lib/server/dashboard/values';
import { slugify } from '../form-fields';
import { addSchema, editSchema } from './schema';
import type { PageServerLoad } from './$types';

const crud = contentCrud({
	table: category,
	label: 'Category',
	addSchema,
	editSchema,
	uniqueField: 'slug',
	transform: (values) => {
		if (!values.slug) values.slug = slugify(String(values.name));
		return blankToNull(values, ['description']);
	}
});

export const load: PageServerLoad = async () => {
	const [data, counts] = await Promise.all([
		crud.load(),
		db
			.select({ categoryId: course.categoryId, total: count() })
			.from(course)
			.where(isNotNull(course.categoryId))
			.groupBy(course.categoryId)
	]);
	const courses = new Map(counts.map((row) => [row.categoryId, row.total]));
	return {
		...data,
		rows: data.rows.map((row) => ({
			...row,
			courses: courses.get(row.id) ?? 0
		}))
	};
};

export const actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	// Soft delete: courses keep their category id, and the public site stops listing it.
	delete: lookupDeleteAction(category, 'Category')
};
